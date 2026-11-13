/**
 * Puerto del contrato Proof of Wild (ADR-09, ADR-11). Arma transacciones sin firmar para que las firme la
 * billetera de la persona, las envía y lee en la red lo que pasó. Los módulos de dominio no conocen Soroban.
 * Los montos van en unidades del token (7 decimales: 1 USDC = 10.000.000).
 */

export interface PreparedTransaction {
  xdr: string;
  networkPassphrase: string;
}

/** Lo que pide una transacción firmada, leído de su contenido (no de lo que dice el navegador). */
export type ContractCall =
  | { fn: "aportar"; source: string; donante: string; caso: string; monto: bigint }
  | {
      fn: "registrar_gasto";
      source: string;
      ong: string;
      caso: string;
      etapa: number;
      proveedor: string;
      monto: bigint;
      hashFactura: string;
    }
  | { fn: "registrar_hito"; source: string; ong: string; caso: string; etapa: number; hashEvidencia: string };

export type InvocationStatus =
  | { status: "pending" }
  | { status: "failed"; reason: string }
  | {
      status: "success";
      call: ContractCall;
      /** Valor que devolvió el contrato (en aportar, el reparto por etapa). */
      returnValue: unknown;
      ledgerCloseAt: Date;
    };

export interface ContractLedger {
  buildContribution(input: { donor: string; caseCode: string; amountUnits: bigint }): Promise<PreparedTransaction>;
  buildExpense(input: {
    ngo: string;
    caseCode: string;
    stage: number;
    provider: string;
    amountUnits: bigint;
    invoiceHashHex: string;
  }): Promise<PreparedTransaction>;
  buildMilestone(input: {
    ngo: string;
    caseCode: string;
    stage: number;
    evidenceHashHex: string;
  }): Promise<PreparedTransaction>;

  /** Hash de la transacción firmada: se guarda antes de enviarla (ADR-12). */
  hashOf(signedXdr: string): string;
  /** Qué llamada al contrato hace la transacción. Lanza si no es una llamada a este contrato. */
  describe(signedXdr: string): ContractCall;
  /** Envía la transacción firmada. Lanza TransactionMismatchError si la red la rechaza de entrada. */
  submit(signedXdr: string): Promise<void>;
  /** Lee la transacción en la red. */
  read(txHash: string): Promise<InvocationStatus>;
}
