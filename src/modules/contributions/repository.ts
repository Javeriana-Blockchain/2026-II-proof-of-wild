/** Puertos de persistencia del módulo de aportes. Los implementa `platform/db`. */

export interface ContributionCase {
  id: string;
  code: string;
  /** Solo los casos activos de ONG aprobadas reciben aportes. */
  acceptsContributions: boolean;
  /** Etapas en orden, con lo ya cubierto por aportes confirmados. */
  stages: Array<{ id: string; position: number; cost: string; covered: string }>;
}

export type ContributionStatus = "enviada" | "confirmada" | "fallida";

export interface StoredContribution {
  txHash: string;
  caseId: string;
  caseCode: string;
  donorAccount: string;
  amount: string;
  status: ContributionStatus;
  lastError: string | null;
}

export interface ContributionStore {
  caseForContribution(caseCode: string): Promise<ContributionCase | null>;
  /** Guarda el aporte al enviarlo (estado «enviada»). Idempotente por hash. */
  saveSubmitted(input: { caseId: string; donorAccount: string; amount: string; txHash: string }): Promise<void>;
  find(txHash: string): Promise<StoredContribution | null>;
  /** «enviada» → «confirmada», con la fecha del ledger y el reparto por etapa que emitió el contrato. */
  markConfirmed(
    txHash: string,
    input: { confirmedAt: Date; allocations: Array<{ stageId: string; amount: string }> },
  ): Promise<void>;
  markFailed(txHash: string, reason: string): Promise<void>;
  recordAttempt(txHash: string, error: string): Promise<void>;
  listPending(limit: number): Promise<string[]>;
}
