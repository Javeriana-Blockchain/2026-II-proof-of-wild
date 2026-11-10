import { beforeEach, describe, expect, it } from "vitest";
import { toStroops } from "@/lib/amount";
import { canonicalJson, sha256Hex } from "@/lib/hash";
import { RecordService, type NgoActor, type NgoCase, type RecordDraft, type RecordKind, type RecordStore } from "@/modules/records";
import { PermissionError, ValidationError } from "@/modules/shared/errors";
import type { ContractCall, ContractLedger, InvocationStatus } from "@/ports/contract-ledger";
import { TransactionMismatchError } from "@/ports/errors";
import type { EvidenceStorage } from "@/ports/evidence-storage";

const ONG = "G" + "O".repeat(55);
const PROV = "G" + "P".repeat(55);
const actor: NgoActor = { userId: "u-ong", ngoId: "ngo-1", ngoAccount: ONG };
const HASH = "f".repeat(64);
const TX = "c".repeat(64);
const PDF = { data: new TextEncoder().encode("%PDF-1.4 FV-0412"), contentType: "application/pdf" };

class MemoryRecords implements RecordStore {
  drafts = new Map<string, RecordDraft>();
  caseInfo: NgoCase = {
    id: "caso-1",
    code: "POW_001",
    stages: [
      { id: "e1", position: 1, name: "Medicamento para el ala", cost: "40", covered: "40", spent: "0" },
      { id: "e2", position: 2, name: "Cuidados especiales", cost: "30", covered: "10", spent: "0" },
    ],
  };
  async caseForNgo(ngoId: string, code: string) {
    return ngoId === "ngo-1" && code === "POW_001" ? this.caseInfo : null;
  }
  async providerForNgo(ngoId: string, id: string) {
    return ngoId === "ngo-1" && id === "prov-1" ? { id, name: "Droguería El Arrayán", account: PROV } : null;
  }
  async createExpense(input: { amount: string; invoiceHash: string; stageId: string }) {
    const position = this.caseInfo.stages.find((s) => s.id === input.stageId)!.position;
    this.drafts.set("g1", {
      id: "g1", kind: "gasto", ngoId: "ngo-1", caseCode: "POW_001", stagePosition: position, status: "enviada",
      txHash: null, evidenceHash: input.invoiceHash, providerAccount: PROV, amount: input.amount,
    });
    return "g1";
  }
  async createMilestone(input: { evidenceHash: string; stageId: string }) {
    const position = this.caseInfo.stages.find((s) => s.id === input.stageId)!.position;
    this.drafts.set("h1", {
      id: "h1", kind: "hito", ngoId: "ngo-1", caseCode: "POW_001", stagePosition: position, status: "enviada",
      txHash: null, evidenceHash: input.evidenceHash,
    });
    return "h1";
  }
  async find(_kind: RecordKind, id: string) {
    return this.drafts.get(id) ?? null;
  }
  async setTxHash(_kind: RecordKind, id: string, txHash: string) {
    this.drafts.get(id)!.txHash = txHash;
  }
  async markConfirmed(_kind: RecordKind, id: string) {
    this.drafts.get(id)!.status = "confirmada";
  }
  async markFailed(_kind: RecordKind, id: string) {
    this.drafts.get(id)!.status = "fallida";
  }
}

class FakeLedger implements ContractLedger {
  call: ContractCall | null = null;
  onLedger: InvocationStatus | null = null;
  submitError: Error | null = null;
  async buildContribution() {
    return { xdr: "", networkPassphrase: "" };
  }
  async buildExpense() {
    return { xdr: "XDR-GASTO", networkPassphrase: "Test SDF Network ; September 2015" };
  }
  async buildMilestone() {
    return { xdr: "XDR-HITO", networkPassphrase: "Test SDF Network ; September 2015" };
  }
  hashOf() {
    return TX;
  }
  describe() {
    return this.call!;
  }
  async submit() {
    if (this.submitError) throw this.submitError;
  }
  async read(): Promise<InvocationStatus> {
    return this.onLedger ?? { status: "success", call: this.call!, returnValue: null, ledgerCloseAt: new Date() };
  }
}

const storage: EvidenceStorage = {
  async save(upload) {
    return { key: "00000000-0000-0000-0000-000000000001.pdf", sha256: await sha256Hex(upload.data), contentType: upload.contentType, sizeBytes: upload.data.byteLength };
  },
  async read() {
    return new Uint8Array();
  },
  publicUrl: (key) => `/api/evidencias/${key}`,
};

let store: MemoryRecords;
let ledger: FakeLedger;
let service: RecordService;
const expense = (over: Partial<Parameters<RecordService["prepareExpense"]>[1]> = {}) => ({
  caseCode: "POW_001",
  stage: 1,
  providerId: "prov-1",
  amount: "40",
  category: "medicamentos" as const,
  occurredOn: "2026-11-01",
  invoiceNumber: "FV-0412",
  invoice: PDF,
  ...over,
});

beforeEach(() => {
  store = new MemoryRecords();
  ledger = new FakeLedger();
  service = new RecordService(ledger, store, storage, { pollAttempts: 1, pollIntervalMs: 0 });
});

describe("registrar un gasto (RF-GAS-01)", () => {
  it("guarda la factura, crea el registro y arma registrar_gasto con el hash de la factura", async () => {
    const prepared = await service.prepareExpense(actor, expense());
    expect(prepared).toMatchObject({ id: "g1", xdr: "XDR-GASTO" });
    expect(store.drafts.get("g1")?.evidenceHash).toBe(await sha256Hex(PDF.data));
  });

  it("no permite gastar más de lo cubierto y sin gastar de la etapa", async () => {
    await expect(service.prepareExpense(actor, expense({ stage: 2, amount: "10.0000001" }))).rejects.toThrow(
      "solo tiene 10 USDC",
    );
    store.caseInfo.stages[0]!.spent = "30";
    await expect(service.prepareExpense(actor, expense({ amount: "11" }))).rejects.toThrow("solo tiene 10 USDC");
  });

  it("solo la ONG del caso registra, con un proveedor suyo, factura y fecha válida", async () => {
    await expect(service.prepareExpense({ ...actor, ngoId: "otra" }, expense())).rejects.toThrow(PermissionError);
    await expect(service.prepareExpense(actor, expense({ providerId: "prov-2" }))).rejects.toThrow("proveedor");
    await expect(service.prepareExpense(actor, expense({ invoice: null }))).rejects.toThrow("factura es obligatoria");
    await expect(service.prepareExpense(actor, expense({ occurredOn: "2999-01-01" }))).rejects.toThrow("futura");
    await expect(service.prepareExpense(actor, expense({ stage: 9 }))).rejects.toThrow(ValidationError);
  });

  it("confirma cuando la transacción firmada pide exactamente lo registrado", async () => {
    await service.prepareExpense(actor, expense());
    ledger.call = {
      fn: "registrar_gasto", source: ONG, ong: ONG, caso: "POW_001", etapa: 1, proveedor: PROV,
      monto: toStroops("40"), hashFactura: await sha256Hex(PDF.data),
    };
    expect(await service.submit(actor, "gasto", "g1", "XDR")).toMatchObject({ status: "confirmada", txHash: TX });
  });

  it("rechaza una transacción que cambia el monto, el proveedor o la cuenta que firma", async () => {
    await service.prepareExpense(actor, expense());
    const ok = { fn: "registrar_gasto" as const, source: ONG, ong: ONG, caso: "POW_001", etapa: 1, proveedor: PROV, monto: toStroops("40"), hashFactura: await sha256Hex(PDF.data) };
    for (const call of [{ ...ok, monto: toStroops("41") }, { ...ok, proveedor: ONG }, { ...ok, source: PROV }]) {
      ledger.call = call;
      await expect(service.submit(actor, "gasto", "g1", "XDR")).rejects.toThrow(ValidationError);
    }
    expect(store.drafts.get("g1")?.status).toBe("enviada");
  });

  it("si la red la rechaza (firma de otra cuenta), queda fallida con el motivo", async () => {
    await service.prepareExpense(actor, expense());
    ledger.call = { fn: "registrar_gasto", source: ONG, ong: ONG, caso: "POW_001", etapa: 1, proveedor: PROV, monto: toStroops("40"), hashFactura: await sha256Hex(PDF.data) };
    ledger.submitError = new TransactionMismatchError("La firma no corresponde a la cuenta esperada.");
    await expect(service.submit(actor, "gasto", "g1", "XDR")).rejects.toThrow("La firma no corresponde");
    expect(store.drafts.get("g1")?.status).toBe("fallida");
  });
});

describe("registrar un hito (RF-HIT-01)", () => {
  it("sin foto, el hash es el del JSON canónico del registro", async () => {
    await service.prepareMilestone(actor, { caseCode: "POW_001", stage: 1, occurredOn: "2026-11-01", description: "El ala ya está inmovilizada.", photo: null });
    expect(store.drafts.get("h1")?.evidenceHash).toBe(
      await sha256Hex(canonicalJson({ caso: "POW_001", etapa: 1, fecha: "2026-11-01", descripcion: "El ala ya está inmovilizada." })),
    );
  });

  it("valida la descripción y confirma la transacción que deja su hash", async () => {
    await expect(
      service.prepareMilestone(actor, { caseCode: "POW_001", stage: 1, occurredOn: "2026-11-01", description: "ok", photo: null }),
    ).rejects.toThrow("descripción");
    await service.prepareMilestone(actor, { caseCode: "POW_001", stage: 2, occurredOn: "2026-11-01", description: "Come sola.", photo: PDF });
    ledger.call = { fn: "registrar_hito", source: ONG, ong: ONG, caso: "POW_001", etapa: 2, hashEvidencia: await sha256Hex(PDF.data) };
    expect((await service.submit(actor, "hito", "h1", "XDR")).status).toBe("confirmada");
  });

  it("otra ONG no puede ver ni enviar un registro ajeno", async () => {
    await service.prepareMilestone(actor, { caseCode: "POW_001", stage: 1, occurredOn: "2026-11-01", description: "Avance de prueba.", photo: null });
    await expect(service.refresh({ ...actor, ngoId: "otra" }, "hito", "h1")).rejects.toThrow("No encontramos");
  });
});

void HASH;
