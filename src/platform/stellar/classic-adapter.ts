import { Account, Asset, BASE_FEE, Memo, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { normalizePositiveAmount } from "@/lib/amount";
import type {
  AnchorExpectation,
  AnchorRequest,
  EvidenceAnchor,
  ObservedAnchor,
} from "@/ports/evidence-anchor";
import { TransactionMismatchError } from "@/ports/errors";
import type {
  ContributionExpectation,
  ContributionRequest,
  ObservedContribution,
  PaymentRail,
  UnsignedTransaction,
} from "@/ports/payment-rail";
import type { LedgerReader } from "./ledger-reader";
import { assertCaseCodeMemo, assertEvidenceHash, base64ToHex } from "./memo";

export interface ClassicAdapterConfig {
  networkPassphrase: string;
  asset: { code: string; issuer: string };
}

/** Monto mínimo de una transacción de anclaje (un stroop). Solo sirve para llevar el memo hash. */
const ANCHOR_AMOUNT = "0.0000001";
const TX_TIMEOUT_SECONDS = 300;

/**
 * Adaptador de pagos clásicos de Stellar (ADR-03, ADR-04, ADR-05).
 * Implementa los dos puertos con una sola dependencia: un lector de la red.
 * Solo se ejecuta en el servidor. No maneja llaves secretas: construye transacciones sin firmar.
 */
export class ClassicStellarAdapter implements PaymentRail, EvidenceAnchor {
  private readonly asset: Asset;

  constructor(
    private readonly config: ClassicAdapterConfig,
    private readonly reader: LedgerReader,
  ) {
    this.asset = new Asset(config.asset.code, config.asset.issuer);
  }

  async buildContributionTransaction(request: ContributionRequest): Promise<UnsignedTransaction> {
    const memo = assertCaseCodeMemo(request.caseCode);
    const amount = normalizePositiveAmount(request.amount);
    const loaded = await this.reader.loadAccount(request.donorAccount);

    const builder = new TransactionBuilder(new Account(loaded.accountId, loaded.sequence), {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    });

    const hasTrustline = loaded.balances.some(
      (line) => line.asset_code === this.asset.code && line.asset_issuer === this.asset.issuer,
    );
    if (!hasTrustline) {
      builder.addOperation(Operation.changeTrust({ asset: this.asset }));
    }

    const tx = builder
      .addOperation(Operation.payment({ destination: request.destinationAccount, asset: this.asset, amount }))
      .addMemo(Memo.text(memo))
      .setTimeout(TX_TIMEOUT_SECONDS)
      .build();

    return { xdr: tx.toXDR(), networkPassphrase: this.config.networkPassphrase };
  }

  async verifyContribution(
    txHash: string,
    expected: ContributionExpectation,
  ): Promise<ObservedContribution> {
    const tx = await this.reader.getTransaction(txHash);
    if (!tx.successful) {
      throw new TransactionMismatchError("La transacción no fue exitosa en la red.");
    }
    if (tx.memo_type !== "text" || tx.memo !== expected.caseCode) {
      throw new TransactionMismatchError("El memo no corresponde al código del caso.");
    }

    const operations = await this.reader.getOperations(txHash);
    const payments = operations.filter(
      (op) =>
        op.type === "payment" &&
        op.to === expected.destinationAccount &&
        op.asset_code === this.asset.code &&
        op.asset_issuer === this.asset.issuer,
    );
    const payment = payments[0];
    if (payments.length !== 1 || !payment?.amount) {
      throw new TransactionMismatchError(
        "La transacción debe contener exactamente un pago del activo esperado a la cuenta del centro.",
      );
    }

    return {
      txHash,
      donorAccount: payment.from ?? tx.source_account,
      destinationAccount: expected.destinationAccount,
      assetCode: this.asset.code,
      amount: payment.amount,
      caseCode: expected.caseCode,
      confirmedAt: new Date(tx.created_at),
    };
  }

  async buildAnchorTransaction(request: AnchorRequest): Promise<UnsignedTransaction> {
    const hash = assertEvidenceHash(request.evidenceHashHex);
    const loaded = await this.reader.loadAccount(request.sourceAccount);

    // Un pago mínimo a sí mismo basta para escribir el memo hash sin mover valor ni crear entradas con reserva.
    const tx = new TransactionBuilder(new Account(loaded.accountId, loaded.sequence), {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination: request.sourceAccount,
          asset: Asset.native(),
          amount: ANCHOR_AMOUNT,
        }),
      )
      .addMemo(Memo.hash(hash))
      .setTimeout(TX_TIMEOUT_SECONDS)
      .build();

    return { xdr: tx.toXDR(), networkPassphrase: this.config.networkPassphrase };
  }

  async verifyAnchor(txHash: string, expected: AnchorExpectation): Promise<ObservedAnchor> {
    const tx = await this.reader.getTransaction(txHash);
    if (!tx.successful) {
      throw new TransactionMismatchError("La transacción no fue exitosa en la red.");
    }
    if (tx.source_account !== expected.sourceAccount) {
      throw new TransactionMismatchError("El anclaje no lo firmó la cuenta esperada.");
    }
    if (tx.memo_type !== "hash" || !tx.memo || base64ToHex(tx.memo) !== expected.evidenceHashHex) {
      throw new TransactionMismatchError("El memo no coincide con el hash de la evidencia.");
    }
    return {
      txHash,
      sourceAccount: tx.source_account,
      evidenceHashHex: expected.evidenceHashHex,
      confirmedAt: new Date(tx.created_at),
    };
  }
}
