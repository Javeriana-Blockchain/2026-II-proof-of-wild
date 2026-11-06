import { isSha256Hex } from "@/lib/hash";
import { isStellarAccount } from "@/lib/stellar-account";
import {
  LedgerUnavailableError,
  TransactionMismatchError,
  TransactionNotFoundError,
} from "@/ports/errors";
import type { PaymentRail, UnsignedTransaction } from "@/ports/payment-rail";
import {
  ContributionRejectedError,
  NotFoundError,
  PermissionError,
  ValidationError,
} from "../shared/errors";
import type {
  CaseForContribution,
  CaseLookup,
  ConfirmedContribution,
  ContributionStore,
  DonorStore,
  PendingStore,
} from "./repository";

export type ConfirmResult =
  | { status: "confirmed"; contribution: ConfirmedContribution }
  | { status: "pending" };

export interface ReconcileSummary {
  confirmed: number;
  stillPending: number;
  discarded: number;
}

export interface ContributionServiceDeps {
  cases: CaseLookup;
  contributions: ContributionStore;
  donors: DonorStore;
  pending: PendingStore;
  rail: PaymentRail;
}

/**
 * Casos de uso de aportes (RF-APA-01, RF-APA-02). Un aporte existe para la plataforma solo después de que
 * el servidor lo lee en la red (RN-03). Si la red no responde, el envío queda pendiente y se reintenta (ADR-04).
 */
export class ContributionService {
  constructor(private readonly deps: ContributionServiceDeps) {}

  /** Construye la transacción de aporte sin firmar, para que la firme la billetera del donante. */
  async prepare(input: {
    caseCode: string;
    donorAccount: string;
    amount: string;
  }): Promise<UnsignedTransaction> {
    if (!isStellarAccount(input.donorAccount)) {
      throw new ValidationError("La cuenta del donante no es una cuenta Stellar válida.");
    }
    const caseInfo = await this.requireReceivingCase(input.caseCode);
    try {
      return await this.deps.rail.buildContributionTransaction({
        donorAccount: input.donorAccount,
        destinationAccount: caseInfo.centerStellarAccount,
        caseCode: caseInfo.code,
        amount: input.amount,
      });
    } catch (error) {
      if (error instanceof RangeError) throw new ValidationError(error.message);
      throw error;
    }
  }

  /** Confirma un aporte leyendo la transacción en la red. Idempotente por hash de transacción. */
  async confirm(input: { caseCode: string; txHash: string }): Promise<ConfirmResult> {
    if (!isSha256Hex(input.txHash)) {
      throw new ValidationError("El hash de la transacción no es válido.");
    }

    const existing = await this.deps.contributions.findByTxHash(input.txHash);
    if (existing) {
      await this.deps.pending.remove(input.txHash);
      return { status: "confirmed", contribution: existing };
    }

    const caseInfo = await this.requireReceivingCase(input.caseCode);

    let observed;
    try {
      observed = await this.deps.rail.verifyContribution(input.txHash, {
        destinationAccount: caseInfo.centerStellarAccount,
        caseCode: caseInfo.code,
      });
    } catch (error) {
      if (error instanceof TransactionNotFoundError || error instanceof LedgerUnavailableError) {
        await this.deps.pending.register(input.txHash, caseInfo.id);
        return { status: "pending" };
      }
      if (error instanceof TransactionMismatchError) {
        await this.deps.pending.remove(input.txHash);
        throw new ContributionRejectedError(error.message);
      }
      throw error;
    }

    const donor = await this.deps.donors.upsertByAccount(observed.donorAccount);
    const contribution = await this.deps.contributions.saveConfirmed({
      caseId: caseInfo.id,
      donorId: donor.id,
      amount: observed.amount,
      assetCode: observed.assetCode,
      txHash: input.txHash,
      confirmedAt: observed.confirmedAt,
    });
    await this.deps.pending.remove(input.txHash);
    return { status: "confirmed", contribution };
  }

  /** Reintenta los envíos pendientes, del más antiguo al más reciente. Lo invoca la tarea programada. */
  async reconcile(limit = 50): Promise<ReconcileSummary> {
    const summary: ReconcileSummary = { confirmed: 0, stillPending: 0, discarded: 0 };
    for (const item of await this.deps.pending.listOldest(limit)) {
      try {
        const result = await this.confirm({ caseCode: item.caseCode, txHash: item.txHash });
        if (result.status === "confirmed") {
          summary.confirmed += 1;
        } else {
          summary.stillPending += 1;
          await this.deps.pending.recordAttempt(item.txHash, "La red aún no muestra la transacción.");
        }
      } catch (error) {
        if (error instanceof ContributionRejectedError) {
          summary.discarded += 1;
        } else {
          summary.stillPending += 1;
          await this.deps.pending.recordAttempt(
            item.txHash,
            error instanceof Error ? error.message : "Error desconocido",
          );
        }
      }
    }
    return summary;
  }

  private async requireReceivingCase(caseCode: string): Promise<CaseForContribution> {
    const caseInfo = await this.deps.cases.findForContribution(caseCode);
    if (!caseInfo) throw new NotFoundError(`No existe el caso ${caseCode}.`);
    if (!caseInfo.centerVerified) {
      throw new PermissionError("El centro de este caso aún no está verificado para recibir aportes.");
    }
    return caseInfo;
  }
}
