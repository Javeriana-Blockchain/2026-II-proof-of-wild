/**
 * Errores que los puertos de la red de registro pueden lanzar. Los módulos de dominio los distinguen
 * para decidir si reintentar (la red aún no muestra la transacción, o no responde) o rechazar (no cumple).
 */
export class LedgerError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** La transacción todavía no aparece en la red. Es reintentable. */
export class TransactionNotFoundError extends LedgerError {}

/** La cuenta no existe en la red (por ejemplo, sin fondear). */
export class AccountNotFoundError extends LedgerError {}

/** La transacción existe pero no cumple lo esperado (destino, activo, memo, firmante). No es reintentable. */
export class TransactionMismatchError extends LedgerError {}

/** La red no respondió o devolvió un error de servidor. Es reintentable (QA-DIS-01). */
export class LedgerUnavailableError extends LedgerError {}
