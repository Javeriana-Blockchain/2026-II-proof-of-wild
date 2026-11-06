/** Transacción lista para que la billetera de la persona la firme. */
export interface UnsignedTransaction {
  xdr: string;
  networkPassphrase: string;
}

export interface ContributionRequest {
  donorAccount: string;
  /** Cuenta Stellar verificada del centro que recibe el aporte. */
  destinationAccount: string;
  /** Código del caso (por ejemplo POW-001); va en el memo de texto. */
  caseCode: string;
  /** Decimal con hasta 7 decimales, por ejemplo "25.5000000". */
  amount: string;
}

export interface ContributionExpectation {
  destinationAccount: string;
  caseCode: string;
}

/** Lo que la red muestra de un aporte ya confirmado. */
export interface ObservedContribution {
  txHash: string;
  donorAccount: string;
  destinationAccount: string;
  assetCode: string;
  amount: string;
  caseCode: string;
  confirmedAt: Date;
}

/**
 * Puerto de pagos (ADR-03, ADR-09). El MVP lo implementa un adaptador de pagos clásicos de Stellar;
 * en la etapa 2 lo implementará un adaptador de contrato Soroban sin cambiar los módulos de dominio.
 */
export interface PaymentRail {
  buildContributionTransaction(request: ContributionRequest): Promise<UnsignedTransaction>;

  /**
   * Lee la transacción en la red y la devuelve solo si es un aporte válido al caso esperado (RN-03).
   * @throws TransactionNotFoundError si aún no aparece, TransactionMismatchError si no cumple,
   *         LedgerUnavailableError si la red no responde.
   */
  verifyContribution(txHash: string, expected: ContributionExpectation): Promise<ObservedContribution>;
}
