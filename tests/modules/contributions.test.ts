import { beforeEach, describe, expect, it } from "vitest";
import { toStroops } from "@/lib/amount";
import {
  ContributionService,
  type ContributionCase,
  type ContributionStore,
  type StoredContribution,
} from "@/modules/contributions";
import { ContributionRejectedError, ValidationError } from "@/modules/shared/errors";
import type { ContractCall, ContractLedger, InvocationStatus } from "@/ports/contract-ledger";
import { LedgerUnavailableError, TransactionMismatchError } from "@/ports/errors";

const DONOR = "G" + "D".repeat(55);
const HASH = "a".repeat(64);

class MemoryStore implements ContributionStore {
  rows = new Map<string, StoredContribution & { allocations?: Array<{ stageId: string; amount: string }> }>();
  caseInfo: ContributionCase = {
    id: "caso-1",
    code: "POW_001",
    acceptsContributions: true,
    stages: [
      { id: "e1", position: 1, cost: "40", covered: "0" },
      { id: "e2", position: 2, cost: "30", covered: "0" },
      { id: "e3", position: 3, cost: "50", covered: "0" },
    ],
  };
  async caseForContribution(code: string) {
    return code === this.caseInfo.code ? this.caseInfo : null;
  }
  async saveSubmitted(input: { caseId: string; donorAccount: string; amount: string; txHash: string }) {
    const row = this.rows.get(input.txHash);
    if (!row) this.rows.set(input.txHash, { ...input, caseCode: "POW_001", status: "enviada", lastError: null });
    else if (row.status === "fallida") Object.assign(row, { status: "enviada", lastError: null });
  }
  async find(txHash: string) {
    return this.rows.get(txHash) ?? null;
  }
  async markConfirmed(txHash: string, input: { confirmedAt: Date; allocations: Array<{ stageId: string; amount: string }> }) {
    const row = this.rows.get(txHash)!;
    if (row.status === "enviada") Object.assign(row, { status: "confirmada", allocations: input.allocations });
  }
  async markFailed(txHash: string, reason: string) {
    const row = this.rows.get(txHash)!;
    if (row.status === "enviada") Object.assign(row, { status: "fallida", lastError: reason });
  }
  async recordAttempt() {}
  async listPending() {
    return [...this.rows.values()].filter((r) => r.status === "enviada").map((r) => r.txHash);
  }
}

class FakeLedger implements ContractLedger {
  call: ContractCall = { fn: "aportar", source: DONOR, donante: DONOR, caso: "POW_001", monto: toStroops("50") };
  onLedger: InvocationStatus = {
    status: "success",
    call: this.call,
    returnValue: [toStroops("40"), toStroops("10"), 0n],
    ledgerCloseAt: new Date("2026-11-13T15:42:00Z"),
  };
  submitError: Error | null = null;
  savedBeforeSubmit = false;
  constructor(private readonly store: MemoryStore) {}
  async buildContribution() {
    return { xdr: "XDR-SIN-FIRMAR", networkPassphrase: "Test SDF Network ; September 2015" };
  }
  async buildExpense() {
    return { xdr: "", networkPassphrase: "" };
  }
  async buildMilestone() {
    return { xdr: "", networkPassphrase: "" };
  }
  hashOf() {
    return HASH;
  }
  describe() {
    return this.call;
  }
  async submit() {
    this.savedBeforeSubmit = this.store.rows.has(HASH);
    if (this.submitError) throw this.submitError;
  }
  async read() {
    return this.onLedger;
  }
}

let store: MemoryStore;
let ledger: FakeLedger;
let service: ContributionService;

beforeEach(() => {
  store = new MemoryStore();
  ledger = new FakeLedger(store);
  service = new ContributionService(ledger, store, { pollAttempts: 1, pollIntervalMs: 0 });
});

describe("preparar un aporte", () => {
  it("devuelve la transacción sin firmar y el reparto previsto, en orden", async () => {
    const prepared = await service.prepare({ caseCode: "POW_001", donorAccount: DONOR, amount: "50" });
    expect(prepared.xdr).toBe("XDR-SIN-FIRMAR");
    expect(prepared.allocation).toEqual([
      { position: 1, amount: "40.0000000" },
      { position: 2, amount: "10.0000000" },
    ]);
  });

  it("acepta coma decimal y rechaza montos, cuentas y casos inválidos o por encima de la meta", async () => {
    await expect(service.prepare({ caseCode: "POW_001", donorAccount: DONOR, amount: "12,5" })).resolves.toBeTruthy();
    for (const bad of [
      { caseCode: "POW_001", donorAccount: "no-es-cuenta", amount: "10" },
      { caseCode: "POW_001", donorAccount: DONOR, amount: "0" },
      { caseCode: "POW_001", donorAccount: DONOR, amount: "120.0000001" },
    ]) {
      await expect(service.prepare(bad)).rejects.toThrow(ValidationError);
    }
    await expect(service.prepare({ caseCode: "POW_999", donorAccount: DONOR, amount: "10" })).rejects.toThrow("No existe");
  });

  it("no acepta aportes a un caso cerrado", async () => {
    store.caseInfo.acceptsContributions = false;
    await expect(service.prepare({ caseCode: "POW_001", donorAccount: DONOR, amount: "10" })).rejects.toThrow(
      "ya no recibe aportes",
    );
  });

  it("traduce los errores del contrato al preparar (por ejemplo, sin USDC suficiente)", async () => {
    ledger.buildContribution = async () => {
      throw new TransactionMismatchError("Tu billetera no tiene suficiente USDC de prueba para este aporte.");
    };
    await expect(service.prepare({ caseCode: "POW_001", donorAccount: DONOR, amount: "10" })).rejects.toThrow(
      "no tiene suficiente USDC",
    );
  });
});

describe("enviar y confirmar (RN-03, ADR-12)", () => {
  it("guarda la copia antes de enviar y confirma con el reparto que devolvió el contrato", async () => {
    const result = await service.submit("XDR-FIRMADO");
    expect(ledger.savedBeforeSubmit).toBe(true);
    expect(result).toMatchObject({ status: "confirmada", txHash: HASH, caseCode: "POW_001", amount: "50.0000000" });
    expect(store.rows.get(HASH)?.allocations).toEqual([
      { stageId: "e1", amount: "40.0000000" },
      { stageId: "e2", amount: "10.0000000" },
    ]);
  });

  it("es idempotente: volver a preguntar no duplica nada", async () => {
    await service.submit("XDR-FIRMADO");
    const again = await service.refresh(HASH);
    expect(again.status).toBe("confirmada");
    expect(store.rows.size).toBe(1);
  });

  it("si la red aún no la muestra, queda «enviada» y se confirma después", async () => {
    ledger.onLedger = { status: "pending" };
    expect((await service.submit("XDR-FIRMADO")).status).toBe("enviada");
    ledger.onLedger = { status: "success", call: ledger.call, returnValue: [toStroops("40"), toStroops("10"), 0n], ledgerCloseAt: new Date() };
    expect((await service.reconcile()).confirmed).toBe(1);
  });

  it("si la red no responde al enviar, la copia queda guardada para reintentar", async () => {
    ledger.submitError = new LedgerUnavailableError("sin red");
    ledger.onLedger = { status: "pending" };
    expect((await service.submit("XDR-FIRMADO")).status).toBe("enviada");
    expect(store.rows.get(HASH)?.status).toBe("enviada");
  });

  it("si la red la rechaza, queda «fallida» con el motivo", async () => {
    ledger.submitError = new TransactionMismatchError("La firma no corresponde a la cuenta esperada.");
    await expect(service.submit("XDR-FIRMADO")).rejects.toThrow(ContributionRejectedError);
    expect(store.rows.get(HASH)).toMatchObject({ status: "fallida", lastError: "La firma no corresponde a la cuenta esperada." });
  });

  it("la misma transacción, bien firmada después de un rechazo, se vuelve a enviar y se confirma", async () => {
    ledger.submitError = new TransactionMismatchError("La firma no corresponde a la cuenta esperada.");
    await expect(service.submit("XDR-FIRMADO-CON-OTRA")).rejects.toThrow(ContributionRejectedError);
    ledger.submitError = null;
    const result = await service.submit("XDR-FIRMADO");
    expect(result.status).toBe("confirmada");
    expect(store.rows.get(HASH)).toMatchObject({ status: "confirmada", lastError: null });
  });

  it("no confirma si lo que quedó en la red no coincide con lo guardado", async () => {
    const otroMonto: ContractCall = { fn: "aportar", source: DONOR, donante: DONOR, caso: "POW_001", monto: toStroops("5") };
    ledger.onLedger = { status: "success", call: otroMonto, returnValue: [], ledgerCloseAt: new Date() };
    expect((await service.submit("XDR-FIRMADO")).status).toBe("fallida");
  });

  it("rechaza transacciones que no son un aporte o que firma otra cuenta", async () => {
    ledger.call = { fn: "registrar_hito", source: DONOR, ong: DONOR, caso: "POW_001", etapa: 1, hashEvidencia: HASH };
    await expect(service.submit("XDR")).rejects.toThrow("no es un aporte");
    ledger.call = { fn: "aportar", source: "G" + "X".repeat(55), donante: DONOR, caso: "POW_001", monto: 1n };
    await expect(service.submit("XDR")).rejects.toThrow("misma billetera");
  });
});
