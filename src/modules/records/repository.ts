/** Puertos de persistencia de los registros de la ONG (gastos e hitos). Los implementa `platform/db`. */

export interface NgoActor {
  userId: string;
  ngoId: string;
  /** Cuenta de la ONG en el contrato: es la que firma registrar_gasto y registrar_hito. */
  ngoAccount: string;
}

export interface NgoCaseStage {
  id: string;
  position: number;
  name: string;
  cost: string;
  covered: string;
  /** Gastado o en camino (confirmado o ya enviado a la red). */
  spent: string;
}

export interface NgoCase {
  id: string;
  code: string;
  stages: NgoCaseStage[];
}

export type RecordKind = "gasto" | "hito";
export type RecordStatus = "enviada" | "confirmada" | "fallida";

/** Lo que se guarda de un gasto o un hito antes de enviarlo, para comprobar la transacción firmada. */
export interface RecordDraft {
  id: string;
  kind: RecordKind;
  ngoId: string;
  caseCode: string;
  stagePosition: number;
  status: RecordStatus;
  txHash: string | null;
  /** SHA-256 de la factura (gasto) o de la evidencia (hito). */
  evidenceHash: string;
  /** Solo en gastos. */
  providerAccount?: string;
  amount?: string;
}

export interface NewExpenseDraft {
  caseId: string;
  stageId: string;
  providerId: string;
  category: "alimentacion" | "atencion_veterinaria" | "medicamentos" | "rehabilitacion" | "traslado_liberacion";
  concept: string | null;
  amount: string;
  occurredOn: string;
  invoiceNumber: string;
  invoiceKey: string;
  invoiceHash: string;
  registeredBy: string;
}

export interface NewMilestoneDraft {
  caseId: string;
  stageId: string;
  occurredOn: string;
  description: string;
  photoKey: string | null;
  evidenceHash: string;
  registeredBy: string;
}

export interface RecordStore {
  caseForNgo(ngoId: string, caseCode: string): Promise<NgoCase | null>;
  providerForNgo(ngoId: string, providerId: string): Promise<{ id: string; name: string; account: string } | null>;
  createExpense(input: NewExpenseDraft): Promise<string>;
  createMilestone(input: NewMilestoneDraft): Promise<string>;
  find(kind: RecordKind, id: string): Promise<RecordDraft | null>;
  /** Guarda el hash antes de enviar (ADR-12). */
  setTxHash(kind: RecordKind, id: string, txHash: string): Promise<void>;
  markConfirmed(kind: RecordKind, id: string): Promise<void>;
  markFailed(kind: RecordKind, id: string): Promise<void>;
}
