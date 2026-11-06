import { beforeEach, describe, expect, it } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import {
  ContributionService,
  type CaseForContribution,
  type ConfirmedContribution,
  type PendingContribution,
} from "@/modules/contributions";
import {
  ContributionRejectedError,
  NotFoundError,
  PermissionError,
  ValidationError,
} from "@/modules/shared/errors";
import {
  LedgerUnavailableError,
  TransactionMismatchError,
  TransactionNotFoundError,
} from "@/ports/errors";
import type {
  ContributionExpectation,
  ObservedContribution,
  PaymentRail,
  UnsignedTransaction,
} from "@/ports/payment-rail";

const CENTER = Keypair.random().publicKey();
const DONOR = Keypair.random().publicKey();
const TX = "ab".repeat(32);
const TX2 = "cd".repeat(32);

type RailMode = "ok" | "not_found" | "unavailable" | "mismatch";

class FakeRail implements PaymentRail {
  mode: RailMode = "ok";
  verifyCalls = 0;

  async buildContributionTransaction(request: { caseCode: string; amount: string }): Promise<UnsignedTransaction> {
    if (request.amount === "0") throw new RangeError("El monto debe ser mayor que cero.");
    return { xdr: `xdr:${request.caseCode}:${request.amount}`, networkPassphrase: "test" };
  }

  async verifyContribution(txHash: string, expected: ContributionExpectation): Promise<ObservedContribution> {
    this.verifyCalls += 1;
    if (this.mode === "not_found") throw new TransactionNotFoundError("aún no aparece");
    if (this.mode === "unavailable") throw new LedgerUnavailableError("sin respuesta");
    if (this.mode === "mismatch") throw new TransactionMismatchError("memo distinto");
    return {
      txHash,
      donorAccount: DONOR,
      destinationAccount: expected.destinationAccount,
      assetCode: "USDC",
      amount: "25.0000000",
      caseCode: expected.caseCode,
      confirmedAt: new Date("2026-11-10T15:00:00Z"),
    };
  }
}

function setup(caseInfo: CaseForContribution | null = defaultCase) {
  const rail = new FakeRail();
  const contributions = new Map<string, ConfirmedContribution>();
  const pending = new Map<string, PendingContribution & { attempts: number }>();
  const donors = new Map<string, string>();

  const service = new ContributionService({
    rail,
    cases: { findForContribution: async (code) => (caseInfo && caseInfo.code === code ? caseInfo : null) },
    contributions: {
      findByTxHash: async (hash) => contributions.get(hash) ?? null,
      saveConfirmed: async (input) => {
        const existing = contributions.get(input.txHash);
        if (existing) return existing;
        const saved = { ...input, id: `contribution-${contributions.size + 1}` };
        contributions.set(input.txHash, saved);
        return saved;
      },
    },
    donors: {
      upsertByAccount: async (account) => {
        if (!donors.has(account)) donors.set(account, `donor-${donors.size + 1}`);
        return { id: donors.get(account) as string };
      },
    },
    pending: {
      register: async (txHash, caseId) => {
        if (!pending.has(txHash)) pending.set(txHash, { txHash, caseId, caseCode: "POW-001", attempts: 0 });
      },
      remove: async (txHash) => void pending.delete(txHash),
      recordAttempt: async (txHash) => {
        const item = pending.get(txHash);
        if (item) item.attempts += 1;
      },
      listOldest: async (limit) => [...pending.values()].slice(0, limit),
    },
  });
  return { service, rail, contributions, pending, donors };
}

const defaultCase: CaseForContribution = {
  id: "case-1",
  code: "POW-001",
  centerStellarAccount: CENTER,
  centerVerified: true,
};

describe("preparar un aporte", () => {
  it("construye la transacción hacia la cuenta del centro con el código del caso", async () => {
    const { service } = setup();
    const tx = await service.prepare({ caseCode: "POW-001", donorAccount: DONOR, amount: "25" });
    expect(tx.xdr).toBe("xdr:POW-001:25");
  });

  it("rechaza un caso inexistente, un centro sin verificar y entradas inválidas", async () => {
    await expect(
      setup().service.prepare({ caseCode: "POW-999", donorAccount: DONOR, amount: "1" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      setup({ ...defaultCase, centerVerified: false }).service.prepare({
        caseCode: "POW-001",
        donorAccount: DONOR,
        amount: "1",
      }),
    ).rejects.toBeInstanceOf(PermissionError);
    await expect(
      setup().service.prepare({ caseCode: "POW-001", donorAccount: "no-es-una-cuenta", amount: "1" }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      setup().service.prepare({ caseCode: "POW-001", donorAccount: DONOR, amount: "0" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("confirmar un aporte (RN-03)", () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it("guarda el aporte que la red muestra y crea al donante por su cuenta", async () => {
    const result = await ctx.service.confirm({ caseCode: "POW-001", txHash: TX });
    expect(result.status).toBe("confirmed");
    if (result.status === "confirmed") {
      expect(result.contribution).toMatchObject({ caseId: "case-1", amount: "25.0000000", txHash: TX });
    }
    expect(ctx.contributions.size).toBe(1);
    expect(ctx.donors.has(DONOR)).toBe(true);
  });

  it("es idempotente: confirmar dos veces la misma transacción no duplica ni vuelve a consultar la red", async () => {
    await ctx.service.confirm({ caseCode: "POW-001", txHash: TX });
    await ctx.service.confirm({ caseCode: "POW-001", txHash: TX });
    expect(ctx.contributions.size).toBe(1);
    expect(ctx.rail.verifyCalls).toBe(1);
  });

  it("deja el envío pendiente si la red aún no lo muestra o no responde (QA-DIS-01)", async () => {
    for (const mode of ["not_found", "unavailable"] as const) {
      const local = setup();
      local.rail.mode = mode;
      await expect(local.service.confirm({ caseCode: "POW-001", txHash: TX })).resolves.toEqual({
        status: "pending",
      });
      expect(local.pending.has(TX)).toBe(true);
      expect(local.contributions.size).toBe(0);
    }
  });

  it("rechaza lo que la red demuestra que no cumple y no deja pendientes", async () => {
    ctx.rail.mode = "mismatch";
    await expect(ctx.service.confirm({ caseCode: "POW-001", txHash: TX })).rejects.toBeInstanceOf(
      ContributionRejectedError,
    );
    expect(ctx.pending.size).toBe(0);
    expect(ctx.contributions.size).toBe(0);
  });

  it("valida el hash de la transacción antes de consultar la red", async () => {
    await expect(ctx.service.confirm({ caseCode: "POW-001", txHash: "no-es-hash" })).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(ctx.rail.verifyCalls).toBe(0);
  });
});

describe("reconciliación", () => {
  it("confirma los pendientes cuando la red se recupera", async () => {
    const ctx = setup();
    ctx.rail.mode = "unavailable";
    await ctx.service.confirm({ caseCode: "POW-001", txHash: TX });
    await ctx.service.confirm({ caseCode: "POW-001", txHash: TX2 });
    expect(ctx.pending.size).toBe(2);

    ctx.rail.mode = "ok";
    const summary = await ctx.service.reconcile();
    expect(summary).toEqual({ confirmed: 2, stillPending: 0, discarded: 0 });
    expect(ctx.pending.size).toBe(0);
    expect(ctx.contributions.size).toBe(2);
  });

  it("registra el intento cuando sigue sin aparecer y descarta lo que no cumple", async () => {
    const ctx = setup();
    ctx.rail.mode = "not_found";
    await ctx.service.confirm({ caseCode: "POW-001", txHash: TX });

    const still = await ctx.service.reconcile();
    expect(still).toEqual({ confirmed: 0, stillPending: 1, discarded: 0 });
    expect(ctx.pending.get(TX)?.attempts).toBe(1);

    ctx.rail.mode = "mismatch";
    const discarded = await ctx.service.reconcile();
    expect(discarded).toEqual({ confirmed: 0, stillPending: 0, discarded: 1 });
    expect(ctx.pending.size).toBe(0);
  });
});
