/** Puertos de persistencia que necesita el módulo de aportes. Los implementa `platform/db`. */

export interface CaseForContribution {
  id: string;
  code: string;
  /** Cuenta Stellar del centro, que recibe el pago. */
  centerStellarAccount: string;
  centerVerified: boolean;
}

export interface CaseLookup {
  findForContribution(caseCode: string): Promise<CaseForContribution | null>;
}

export interface ConfirmedContribution {
  id: string;
  caseId: string;
  donorId: string;
  amount: string;
  assetCode: string;
  txHash: string;
  confirmedAt: Date;
}

export interface ContributionStore {
  findByTxHash(txHash: string): Promise<ConfirmedContribution | null>;
  /** Debe ser idempotente por `txHash`: si ya existe, devuelve la fila existente. */
  saveConfirmed(input: Omit<ConfirmedContribution, "id">): Promise<ConfirmedContribution>;
}

export interface DonorStore {
  upsertByAccount(stellarAccount: string): Promise<{ id: string }>;
}

export interface PendingContribution {
  txHash: string;
  caseId: string;
  caseCode: string;
}

export interface PendingStore {
  /** Idempotente por `txHash`. */
  register(txHash: string, caseId: string): Promise<void>;
  remove(txHash: string): Promise<void>;
  recordAttempt(txHash: string, error: string): Promise<void>;
  listOldest(limit: number): Promise<PendingContribution[]>;
}
