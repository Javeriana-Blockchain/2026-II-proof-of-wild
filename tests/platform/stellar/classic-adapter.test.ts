import { Keypair, Networks, TransactionBuilder } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { ClassicStellarAdapter } from "@/platform/stellar/classic-adapter";
import type {
  LedgerReader,
  LoadedAccount,
  OperationRecord,
  TransactionRecord,
} from "@/platform/stellar/ledger-reader";
import {
  LedgerUnavailableError,
  TransactionMismatchError,
  TransactionNotFoundError,
} from "@/ports/errors";

const pub = () => Keypair.random().publicKey();
const ISSUER = pub();
const CENTER = pub();
const DONOR = pub();
const PASSPHRASE = Networks.TESTNET;
const TX_HASH = "f".repeat(64);
const EVIDENCE_HASH = "0123456789abcdef".repeat(4);

function paymentOp(overrides: Partial<OperationRecord> = {}): OperationRecord {
  return {
    type: "payment",
    from: DONOR,
    to: CENTER,
    amount: "25.0000000",
    asset_type: "credit_alphanum4",
    asset_code: "USDC",
    asset_issuer: ISSUER,
    ...overrides,
  };
}

function textTx(overrides: Partial<TransactionRecord> = {}): TransactionRecord {
  return {
    successful: true,
    source_account: DONOR,
    created_at: "2026-11-10T15:00:00Z",
    memo_type: "text",
    memo: "POW-001",
    ...overrides,
  };
}

function reader(parts: Partial<LedgerReader> & { account?: LoadedAccount } = {}): LedgerReader {
  return {
    loadAccount: async () =>
      parts.account ?? { accountId: DONOR, sequence: "100", balances: [{ asset_type: "native" }] },
    getTransaction: async () => textTx(),
    getOperations: async () => [paymentOp()],
    ...parts,
  };
}

function adapter(parts?: Parameters<typeof reader>[0]) {
  return new ClassicStellarAdapter(
    { networkPassphrase: PASSPHRASE, asset: { code: "USDC", issuer: ISSUER } },
    reader(parts),
  );
}

const expected = { destinationAccount: CENTER, caseCode: "POW-001" };

describe("construcción de la transacción de aporte", () => {
  it("agrega la línea de confianza cuando el donante no la tiene", async () => {
    const { xdr } = await adapter().buildContributionTransaction({
      donorAccount: DONOR,
      destinationAccount: CENTER,
      caseCode: "POW-001",
      amount: "25",
    });
    const tx = TransactionBuilder.fromXDR(xdr, PASSPHRASE);
    expect("operations" in tx && tx.operations.map((op) => op.type)).toEqual(["changeTrust", "payment"]);
    expect("memo" in tx && tx.memo.type).toBe("text");
    expect("memo" in tx && Buffer.from(tx.memo.value as Buffer).toString("utf8")).toBe("POW-001");
    const payment = "operations" in tx ? tx.operations[1] : undefined;
    expect(payment).toMatchObject({ destination: CENTER, amount: "25.0000000" });
  });

  it("no agrega la línea de confianza si ya existe", async () => {
    const account: LoadedAccount = {
      accountId: DONOR,
      sequence: "100",
      balances: [{ asset_type: "credit_alphanum4", asset_code: "USDC", asset_issuer: ISSUER }],
    };
    const { xdr } = await adapter({ account }).buildContributionTransaction({
      donorAccount: DONOR,
      destinationAccount: CENTER,
      caseCode: "POW-001",
      amount: "1",
    });
    const tx = TransactionBuilder.fromXDR(xdr, PASSPHRASE);
    expect("operations" in tx && tx.operations.map((op) => op.type)).toEqual(["payment"]);
  });

  it("rechaza códigos y montos inválidos antes de consultar la red", async () => {
    const base = { donorAccount: DONOR, destinationAccount: CENTER, caseCode: "POW-001", amount: "1" };
    await expect(adapter().buildContributionTransaction({ ...base, caseCode: "POW-1" })).rejects.toThrow(RangeError);
    await expect(adapter().buildContributionTransaction({ ...base, amount: "0" })).rejects.toThrow(RangeError);
  });
});

describe("verificación de un aporte (RN-03)", () => {
  it("confirma un aporte válido", async () => {
    const observed = await adapter().verifyContribution(TX_HASH, expected);
    expect(observed).toMatchObject({
      txHash: TX_HASH,
      donorAccount: DONOR,
      destinationAccount: CENTER,
      assetCode: "USDC",
      amount: "25.0000000",
      caseCode: "POW-001",
    });
    expect(observed.confirmedAt.toISOString()).toBe("2026-11-10T15:00:00.000Z");
  });

  it("rechaza una transacción fallida", async () => {
    const a = adapter({ getTransaction: async () => textTx({ successful: false }) });
    await expect(a.verifyContribution(TX_HASH, expected)).rejects.toBeInstanceOf(TransactionMismatchError);
  });

  it("rechaza un memo que no es el código del caso o no es de texto", async () => {
    for (const tx of [textTx({ memo: "POW-002" }), textTx({ memo_type: "none", memo: undefined })]) {
      const a = adapter({ getTransaction: async () => tx });
      await expect(a.verifyContribution(TX_HASH, expected)).rejects.toBeInstanceOf(TransactionMismatchError);
    }
  });

  it("rechaza pagos a otra cuenta, de otro activo o de otro emisor", async () => {
    for (const op of [
      paymentOp({ to: pub() }),
      paymentOp({ asset_code: "EURC" }),
      paymentOp({ asset_issuer: pub() }),
      paymentOp({ asset_type: "native", asset_code: undefined, asset_issuer: undefined }),
    ]) {
      const a = adapter({ getOperations: async () => [op] });
      await expect(a.verifyContribution(TX_HASH, expected)).rejects.toBeInstanceOf(TransactionMismatchError);
    }
  });

  it("exige exactamente un pago del activo esperado", async () => {
    const a = adapter({ getOperations: async () => [paymentOp(), paymentOp()] });
    await expect(a.verifyContribution(TX_HASH, expected)).rejects.toBeInstanceOf(TransactionMismatchError);
    const sin = adapter({ getOperations: async () => [{ type: "change_trust" }] });
    await expect(sin.verifyContribution(TX_HASH, expected)).rejects.toBeInstanceOf(TransactionMismatchError);
  });

  it("acepta una línea de confianza junto al pago", async () => {
    const a = adapter({ getOperations: async () => [{ type: "change_trust" }, paymentOp()] });
    await expect(a.verifyContribution(TX_HASH, expected)).resolves.toMatchObject({ amount: "25.0000000" });
  });

  it("propaga los errores reintentables de la red sin convertirlos en rechazos", async () => {
    const noEncontrada = adapter({
      getTransaction: async () => {
        throw new TransactionNotFoundError("aún no aparece");
      },
    });
    await expect(noEncontrada.verifyContribution(TX_HASH, expected)).rejects.toBeInstanceOf(TransactionNotFoundError);

    const caida = adapter({
      getTransaction: async () => {
        throw new LedgerUnavailableError("sin respuesta");
      },
    });
    await expect(caida.verifyContribution(TX_HASH, expected)).rejects.toBeInstanceOf(LedgerUnavailableError);
  });
});

describe("anclaje de evidencia (ADR-05)", () => {
  const hashTx = (overrides: Partial<TransactionRecord> = {}): TransactionRecord =>
    textTx({
      source_account: CENTER,
      memo_type: "hash",
      memo: Buffer.from(EVIDENCE_HASH, "hex").toString("base64"),
      ...overrides,
    });
  const anchorExpected = { sourceAccount: CENTER, evidenceHashHex: EVIDENCE_HASH };

  it("construye un pago mínimo a sí mismo con memo hash", async () => {
    const { xdr } = await adapter({
      account: { accountId: CENTER, sequence: "7", balances: [] },
    }).buildAnchorTransaction({ sourceAccount: CENTER, evidenceHashHex: EVIDENCE_HASH });
    const tx = TransactionBuilder.fromXDR(xdr, PASSPHRASE);
    expect("memo" in tx && tx.memo.type).toBe("hash");
    expect("memo" in tx && Buffer.from(tx.memo.value as Buffer).toString("hex")).toBe(EVIDENCE_HASH);
    const [op] = "operations" in tx ? tx.operations : [];
    expect(op).toMatchObject({ type: "payment", destination: CENTER, amount: "0.0000001" });
  });

  it("rechaza hashes mal formados al construir", async () => {
    await expect(
      adapter().buildAnchorTransaction({ sourceAccount: CENTER, evidenceHashHex: "xyz" }),
    ).rejects.toThrow(RangeError);
  });

  it("verifica un anclaje válido", async () => {
    const a = adapter({ getTransaction: async () => hashTx() });
    await expect(a.verifyAnchor(TX_HASH, anchorExpected)).resolves.toMatchObject({
      sourceAccount: CENTER,
      evidenceHashHex: EVIDENCE_HASH,
    });
  });

  it("rechaza un anclaje firmado por otra cuenta, con otro hash, de otro tipo o fallido", async () => {
    for (const tx of [
      hashTx({ source_account: pub() }),
      hashTx({ memo: Buffer.from("ab".repeat(32), "hex").toString("base64") }),
      hashTx({ memo_type: "text", memo: "POW-001" }),
      hashTx({ successful: false }),
    ]) {
      const a = adapter({ getTransaction: async () => tx });
      await expect(a.verifyAnchor(TX_HASH, anchorExpected)).rejects.toBeInstanceOf(TransactionMismatchError);
    }
  });
});
