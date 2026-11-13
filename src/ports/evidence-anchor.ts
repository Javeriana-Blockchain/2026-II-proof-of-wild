import type { UnsignedTransaction } from "./payment-rail";

export interface AnchorRequest {
  /** Cuenta que firma el anclaje: la del centro al registrar, la del validador al validar. */
  sourceAccount: string;
  /** SHA-256 de la evidencia, en hexadecimal (64 caracteres). */
  evidenceHashHex: string;
}

export interface AnchorExpectation {
  sourceAccount: string;
  evidenceHashHex: string;
}

export interface ObservedAnchor {
  txHash: string;
  sourceAccount: string;
  evidenceHashHex: string;
  confirmedAt: Date;
}

/**
 * Puerto de anclaje de evidencia (ADR-05). Escribe y verifica el hash de un soporte en la red,
 * firmado por la billetera de quien registra o valida.
 */
export interface EvidenceAnchor {
  buildAnchorTransaction(request: AnchorRequest): Promise<UnsignedTransaction>;

  /**
   * Lee la transacción y la devuelve solo si la firmó la cuenta esperada y su memo es el hash esperado.
   * @throws TransactionNotFoundError, TransactionMismatchError o LedgerUnavailableError.
   */
  verifyAnchor(txHash: string, expected: AnchorExpectation): Promise<ObservedAnchor>;
}
