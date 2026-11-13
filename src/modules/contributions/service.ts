import { fromStroops, normalizePositiveAmount, toStroops } from "@/lib/amount";
import { isSha256Hex } from "@/lib/hash";
import { isStellarAccount } from "@/lib/stellar-account";
import type { ContractLedger, PreparedTransaction } from "@/ports/contract-ledger";
import { LedgerUnavailableError, TransactionMismatchError } from "@/ports/errors";
import { allocateContribution, isValidCaseCode, type StageAllocation } from "../cases";
import { ContributionRejectedError, NotFoundError, ValidationError } from "../shared/errors";
import type { ContributionStatus, ContributionStore, StoredContribution } from "./repository";

export interface ContributionResult {
  txHash: string;
  status: ContributionStatus;
  caseCode: string;
  amount: string;
  /** Mensaje para la persona cuando falló. */
  message?: string;
}

export interface ContributionServiceOptions {
  /** Cuántas veces leer la red tras enviar antes de responder «enviada» (el navegador sigue preguntando). */
  pollAttempts?: number;
  pollIntervalMs?: number;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Aportes al contrato (RF-APA-01, RF-APA-02, ADR-11, ADR-12). El servidor arma la transacción `aportar`, la
 * billetera de la persona la firma, el servidor guarda una copia y la envía, y la confirma solo cuando la lee
 * en la red (RN-03). El reparto por etapa que vale es el que devolvió el contrato.
 */
export class ContributionService {
  private readonly pollAttempts: number;
  private readonly pollIntervalMs: number;

  constructor(
    private readonly ledger: ContractLedger,
    private readonly store: ContributionStore,
    options: ContributionServiceOptions = {},
  ) {
    this.pollAttempts = options.pollAttempts ?? 6;
    this.pollIntervalMs = options.pollIntervalMs ?? 1500;
  }

  /** Arma la transacción sin firmar y devuelve el reparto previsto para mostrarlo antes de firmar. */
  async prepare(input: {
    caseCode: string;
    donorAccount: string;
    amount: string;
  }): Promise<PreparedTransaction & { allocation: StageAllocation[] }> {
    if (!isStellarAccount(input.donorAccount)) throw new ValidationError("La billetera no es una cuenta Stellar válida.");
    let amount: string;
    try {
      amount = normalizePositiveAmount(input.amount.trim().replace(",", "."));
    } catch {
      throw new ValidationError("Escribe un monto mayor que cero, con hasta 7 decimales.");
    }
    const caseInfo = await this.requireCase(input.caseCode);
    const allocation = allocateContribution(caseInfo.stages, amount);
    try {
      const tx = await this.ledger.buildContribution({
        donor: input.donorAccount,
        caseCode: caseInfo.code,
        amountUnits: toStroops(amount),
      });
      return { ...tx, allocation };
    } catch (error) {
      throw translate(error);
    }
  }

  /**
   * Recibe la transacción firmada, guarda la copia, la envía y espera unos segundos su confirmación.
   * Si la red aún no la muestra, responde «enviada» y el navegador pregunta después con `status`.
   */
  async submit(signedXdr: string): Promise<ContributionResult> {
    let call;
    try {
      call = this.ledger.describe(signedXdr);
    } catch (error) {
      throw translate(error);
    }
    if (call.fn !== "aportar") throw new ValidationError("La transacción no es un aporte.");
    if (call.source !== call.donante) throw new ValidationError("El aporte debe firmarlo la misma billetera que aporta.");
    const caseInfo = await this.requireCase(call.caso);
    const txHash = this.ledger.hashOf(signedXdr);
    const amount = fromStroops(call.monto);

    await this.store.saveSubmitted({ caseId: caseInfo.id, donorAccount: call.donante, amount, txHash });
    try {
      await this.ledger.submit(signedXdr);
    } catch (error) {
      if (error instanceof TransactionMismatchError) {
        await this.store.markFailed(txHash, error.message);
        throw new ContributionRejectedError(error.message);
      }
      if (!(error instanceof LedgerUnavailableError)) throw error;
      await this.store.recordAttempt(txHash, error.message);
    }

    for (let attempt = 0; attempt < this.pollAttempts; attempt++) {
      const result = await this.refresh(txHash);
      if (result.status !== "enviada") return result;
      if (attempt < this.pollAttempts - 1) await wait(this.pollIntervalMs);
    }
    return { txHash, status: "enviada", caseCode: caseInfo.code, amount };
  }

  /** Estado de un aporte; si sigue «enviada», vuelve a leer la red. Idempotente. */
  async refresh(txHash: string): Promise<ContributionResult> {
    if (!isSha256Hex(txHash)) throw new ValidationError("El hash de la transacción no es válido.");
    const stored = await this.store.find(txHash);
    if (!stored) throw new NotFoundError("No encontramos ese aporte.");
    if (stored.status !== "enviada") return toResult(stored);

    let onLedger;
    try {
      onLedger = await this.ledger.read(txHash);
    } catch (error) {
      if (error instanceof LedgerUnavailableError) {
        await this.store.recordAttempt(txHash, error.message);
        return toResult(stored);
      }
      throw error;
    }
    if (onLedger.status === "pending") {
      await this.store.recordAttempt(txHash, "La red aún no muestra la transacción.");
      return toResult(stored);
    }
    if (onLedger.status === "failed") {
      await this.store.markFailed(txHash, onLedger.reason);
      return { ...toResult(stored), status: "fallida", message: onLedger.reason };
    }

    const { call } = onLedger;
    if (
      call.fn !== "aportar" ||
      call.caso !== stored.caseCode ||
      call.donante !== stored.donorAccount ||
      fromStroops(call.monto) !== fromStroops(toStroops(stored.amount))
    ) {
      const reason = "La transacción de la red no coincide con el aporte guardado.";
      await this.store.markFailed(txHash, reason);
      return { ...toResult(stored), status: "fallida", message: reason };
    }

    const caseInfo = await this.store.caseForContribution(stored.caseCode);
    const reparto = Array.isArray(onLedger.returnValue) ? (onLedger.returnValue as Array<bigint | number>) : [];
    const allocations = reparto
      .map((units, i) => ({ stage: caseInfo?.stages.find((s) => s.position === i + 1), units: BigInt(units) }))
      .filter((a) => a.stage && a.units > 0n)
      .map((a) => ({ stageId: a.stage!.id, amount: fromStroops(a.units) }));
    await this.store.markConfirmed(txHash, { confirmedAt: onLedger.ledgerCloseAt, allocations });
    return { ...toResult(stored), status: "confirmada" };
  }

  /** Reintenta los aportes que siguen «enviada» (los llama una tarea o la página al cargar). */
  async reconcile(limit = 20): Promise<{ confirmed: number; stillPending: number; failed: number }> {
    const summary = { confirmed: 0, stillPending: 0, failed: 0 };
    for (const txHash of await this.store.listPending(limit)) {
      const result = await this.refresh(txHash).catch(() => null);
      if (result?.status === "confirmada") summary.confirmed += 1;
      else if (result?.status === "fallida") summary.failed += 1;
      else summary.stillPending += 1;
    }
    return summary;
  }

  private async requireCase(caseCode: string) {
    if (!isValidCaseCode(caseCode)) throw new NotFoundError("No existe ese caso.");
    const caseInfo = await this.store.caseForContribution(caseCode);
    if (!caseInfo) throw new NotFoundError("No existe ese caso.");
    if (!caseInfo.acceptsContributions) throw new ValidationError("Este caso ya no recibe aportes.");
    return caseInfo;
  }
}

function toResult(stored: StoredContribution): ContributionResult {
  return {
    txHash: stored.txHash,
    status: stored.status,
    caseCode: stored.caseCode,
    amount: stored.amount,
    ...(stored.status === "fallida" && stored.lastError ? { message: stored.lastError } : {}),
  };
}

function translate(error: unknown): Error {
  if (error instanceof TransactionMismatchError) return new ValidationError(error.message);
  if (error instanceof LedgerUnavailableError) {
    return new ValidationError("La red de Stellar no respondió. Inténtalo de nuevo en unos segundos.");
  }
  return error instanceof Error ? error : new Error(String(error));
}
