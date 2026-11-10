import { fromStroops, normalizePositiveAmount, toStroops } from "@/lib/amount";
import { canonicalJson, sha256Hex } from "@/lib/hash";
import type { ContractCall, ContractLedger, PreparedTransaction } from "@/ports/contract-ledger";
import { LedgerUnavailableError, TransactionMismatchError } from "@/ports/errors";
import type { EvidenceStorage, EvidenceUpload } from "@/ports/evidence-storage";
import { isValidCaseCode } from "../cases";
import { NotFoundError, PermissionError, ValidationError } from "../shared/errors";
import type { NewExpenseDraft, NgoActor, NgoCase, RecordDraft, RecordKind, RecordStatus, RecordStore } from "./repository";

export interface RecordResult {
  id: string;
  kind: RecordKind;
  status: RecordStatus;
  txHash: string | null;
}

export interface PreparedRecord extends PreparedTransaction {
  id: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Registros de la ONG (RF-GAS-01, RF-HIT-01, ADR-11). Un gasto se registra en una sola llamada al contrato que
 * le paga al proveedor desde la etapa y guarda el hash de la factura; la factura se publica (doble
 * confirmación). Un hito deja en la red el hash de su foto o documento. Lo firma la billetera de la ONG; el
 * servidor comprueba que la transacción pida exactamente lo registrado y la confirma leyendo la red.
 */
export class RecordService {
  constructor(
    private readonly ledger: ContractLedger,
    private readonly store: RecordStore,
    private readonly storage: EvidenceStorage,
    private readonly options: { pollAttempts?: number; pollIntervalMs?: number } = {},
  ) {}

  async prepareExpense(
    actor: NgoActor,
    input: {
      caseCode: string;
      stage: number;
      providerId: string;
      amount: string;
      category: NewExpenseDraft["category"];
      occurredOn: string;
      invoiceNumber: string;
      concept?: string;
      invoice: EvidenceUpload | null;
    },
  ): Promise<PreparedRecord> {
    const { caseInfo, stage } = await this.caseAndStage(actor, input.caseCode, input.stage);
    const provider = await this.store.providerForNgo(actor.ngoId, input.providerId);
    if (!provider) throw new ValidationError("Elige un proveedor que trabaje con tu ONG.");

    let amount: string;
    try {
      amount = normalizePositiveAmount(input.amount.trim().replace(",", "."));
    } catch {
      throw new ValidationError("Escribe un monto mayor que cero, con hasta 7 decimales.");
    }
    const available = toStroops(stage.covered) - toStroops(stage.spent);
    if (toStroops(amount) > available) {
      throw new ValidationError(
        `La etapa ${stage.position} solo tiene ${Number(fromStroops(available > 0n ? available : 0n))} USDC cubiertos y sin gastar.`,
      );
    }
    assertDate(input.occurredOn);
    const invoiceNumber = input.invoiceNumber.trim();
    if (invoiceNumber.length < 2 || invoiceNumber.length > 40) throw new ValidationError("Escribe el número de la factura.");
    if (!input.invoice) throw new ValidationError("La factura es obligatoria: súbela en PDF o imagen.");
    const stored = await this.save(input.invoice);

    const id = await this.store.createExpense({
      caseId: caseInfo.id,
      stageId: stage.id,
      providerId: provider.id,
      category: input.category,
      concept: input.concept?.trim() || null,
      amount,
      occurredOn: input.occurredOn,
      invoiceNumber,
      invoiceKey: stored.key,
      invoiceHash: stored.sha256,
      registeredBy: actor.userId,
    });
    const tx = await this.build(() =>
      this.ledger.buildExpense({
        ngo: actor.ngoAccount,
        caseCode: caseInfo.code,
        stage: stage.position,
        provider: provider.account,
        amountUnits: toStroops(amount),
        invoiceHashHex: stored.sha256,
      }),
    );
    return { id, ...tx };
  }

  async prepareMilestone(
    actor: NgoActor,
    input: { caseCode: string; stage: number; occurredOn: string; description: string; photo: EvidenceUpload | null },
  ): Promise<PreparedRecord> {
    const { caseInfo, stage } = await this.caseAndStage(actor, input.caseCode, input.stage);
    assertDate(input.occurredOn);
    const description = input.description.trim();
    if (description.length < 5 || description.length > 280) {
      throw new ValidationError("Escribe una descripción corta del avance (de 5 a 280 caracteres).");
    }
    const photo = input.photo ? await this.save(input.photo) : null;
    // Sin foto, el hash es el del JSON canónico del registro: también prueba que el texto no cambió.
    const evidenceHash =
      photo?.sha256 ??
      (await sha256Hex(canonicalJson({ caso: caseInfo.code, etapa: stage.position, fecha: input.occurredOn, descripcion: description })));

    const id = await this.store.createMilestone({
      caseId: caseInfo.id,
      stageId: stage.id,
      occurredOn: input.occurredOn,
      description,
      photoKey: photo?.key ?? null,
      evidenceHash,
      registeredBy: actor.userId,
    });
    const tx = await this.build(() =>
      this.ledger.buildMilestone({ ngo: actor.ngoAccount, caseCode: caseInfo.code, stage: stage.position, evidenceHashHex: evidenceHash }),
    );
    return { id, ...tx };
  }

  /** Recibe la transacción firmada por la billetera de la ONG, la compara con lo registrado, la envía y la confirma. */
  async submit(actor: NgoActor, kind: RecordKind, id: string, signedXdr: string): Promise<RecordResult> {
    const draft = await this.requireDraft(actor, kind, id);
    if (draft.status !== "enviada") return toResult(draft);

    let call: ContractCall;
    try {
      call = this.ledger.describe(signedXdr);
    } catch (error) {
      throw error instanceof TransactionMismatchError ? new ValidationError(error.message) : error;
    }
    if (call.source !== actor.ngoAccount) {
      throw new ValidationError("Firma con la billetera de la ONG registrada en Proof of Wild.");
    }
    if (!matches(call, draft, actor.ngoAccount)) {
      throw new ValidationError("La transacción firmada no coincide con lo que registraste. Vuelve a empezar.");
    }
    const txHash = this.ledger.hashOf(signedXdr);
    if (draft.txHash && draft.txHash !== txHash) throw new ValidationError("Este registro ya se envió con otra transacción.");
    await this.store.setTxHash(kind, id, txHash);

    try {
      await this.ledger.submit(signedXdr);
    } catch (error) {
      if (error instanceof TransactionMismatchError) {
        await this.store.markFailed(kind, id);
        throw new ValidationError(error.message);
      }
      if (!(error instanceof LedgerUnavailableError)) throw error;
    }

    const attempts = this.options.pollAttempts ?? 6;
    for (let i = 0; i < attempts; i++) {
      const result = await this.refresh(actor, kind, id);
      if (result.status !== "enviada") return result;
      if (i < attempts - 1) await wait(this.options.pollIntervalMs ?? 1500);
    }
    return { id, kind, status: "enviada", txHash };
  }

  /** Estado de un registro; si sigue «enviada», vuelve a leer la red. */
  async refresh(actor: NgoActor, kind: RecordKind, id: string): Promise<RecordResult> {
    const draft = await this.requireDraft(actor, kind, id);
    if (draft.status !== "enviada" || !draft.txHash) return toResult(draft);
    let onLedger;
    try {
      onLedger = await this.ledger.read(draft.txHash);
    } catch (error) {
      if (error instanceof LedgerUnavailableError) return toResult(draft);
      throw error;
    }
    if (onLedger.status === "pending") return toResult(draft);
    if (onLedger.status === "failed" || !matches(onLedger.call, draft, actor.ngoAccount)) {
      await this.store.markFailed(kind, id);
      return { ...toResult(draft), status: "fallida" };
    }
    await this.store.markConfirmed(kind, id);
    return { ...toResult(draft), status: "confirmada" };
  }

  private async caseAndStage(actor: NgoActor, caseCode: string, position: number): Promise<{ caseInfo: NgoCase; stage: NgoCase["stages"][number] }> {
    if (!isValidCaseCode(caseCode)) throw new NotFoundError("No existe ese caso.");
    const caseInfo = await this.store.caseForNgo(actor.ngoId, caseCode);
    if (!caseInfo) throw new PermissionError("Ese caso no es de tu ONG.");
    const stage = caseInfo.stages.find((s) => s.position === position);
    if (!stage) throw new ValidationError("Elige una etapa del caso.");
    return { caseInfo, stage };
  }

  private async requireDraft(actor: NgoActor, kind: RecordKind, id: string): Promise<RecordDraft> {
    const draft = await this.store.find(kind, id);
    if (!draft || draft.ngoId !== actor.ngoId) throw new NotFoundError("No encontramos ese registro.");
    return draft;
  }

  private async save(upload: EvidenceUpload) {
    try {
      return await this.storage.save(upload);
    } catch (error) {
      throw error instanceof RangeError ? new ValidationError(error.message) : error;
    }
  }

  private async build(make: () => Promise<PreparedTransaction>): Promise<PreparedTransaction> {
    try {
      return await make();
    } catch (error) {
      if (error instanceof TransactionMismatchError) throw new ValidationError(error.message);
      if (error instanceof LedgerUnavailableError) {
        throw new ValidationError("La red de Stellar no respondió. Inténtalo de nuevo en unos segundos.");
      }
      throw error;
    }
  }
}

function assertDate(value: string) {
  if (!DATE.test(value) || Number.isNaN(Date.parse(value))) throw new ValidationError("Escribe una fecha válida.");
  if (value > new Date().toISOString().slice(0, 10)) throw new ValidationError("La fecha no puede ser futura.");
}

/** La transacción pide exactamente lo registrado: misma ONG, caso, etapa, proveedor, monto y hash. */
function matches(call: ContractCall, draft: RecordDraft, ngoAccount: string): boolean {
  if (draft.kind === "gasto") {
    return (
      call.fn === "registrar_gasto" &&
      call.ong === ngoAccount &&
      call.caso === draft.caseCode &&
      call.etapa === draft.stagePosition &&
      call.proveedor === draft.providerAccount &&
      call.monto === toStroops(draft.amount ?? "0") &&
      call.hashFactura === draft.evidenceHash
    );
  }
  return (
    call.fn === "registrar_hito" &&
    call.ong === ngoAccount &&
    call.caso === draft.caseCode &&
    call.etapa === draft.stagePosition &&
    call.hashEvidencia === draft.evidenceHash
  );
}

function toResult(draft: RecordDraft): RecordResult {
  return { id: draft.id, kind: draft.kind, status: draft.status, txHash: draft.txHash };
}
