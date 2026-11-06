import { Keypair } from "@stellar/stellar-sdk";
import { beforeEach, describe, expect, it } from "vitest";
import {
  assertTransition,
  ExpenseService,
  publicExpenseStatus,
  transparencySummary,
  type ExpenseRecord,
} from "@/modules/expenses";
import type { Actor } from "@/modules/shared/actor";
import {
  InvalidTransitionError,
  NotFoundError,
  PermissionError,
  SeparationOfDutiesError,
  ValidationError,
} from "@/modules/shared/errors";
import { TransactionMismatchError } from "@/ports/errors";
import type { AnchorExpectation, EvidenceAnchor } from "@/ports/evidence-anchor";

const HASH = "ab".repeat(32);
const ANCHOR_TX = "11".repeat(32);
const VALIDATION_TX = "22".repeat(32);

const centerUser: Actor = {
  userId: "user-center",
  role: "center",
  centerId: "center-1",
  stellarAccount: Keypair.random().publicKey(),
};
const validator: Actor = {
  userId: "user-validator",
  role: "validator",
  centerId: "center-1",
  stellarAccount: Keypair.random().publicKey(),
};
const foreignValidator: Actor = { ...validator, userId: "user-foreign", centerId: "center-2" };
const foreignCenterUser: Actor = { ...centerUser, userId: "user-foreign-center", centerId: "center-2" };

class FakeAnchor implements EvidenceAnchor {
  failWith: Error | null = null;
  verified: AnchorExpectation[] = [];

  async buildAnchorTransaction(request: { sourceAccount: string; evidenceHashHex: string }) {
    return { xdr: `anchor:${request.sourceAccount}:${request.evidenceHashHex}`, networkPassphrase: "test" };
  }

  async verifyAnchor(txHash: string, expected: AnchorExpectation) {
    this.verified.push(expected);
    if (this.failWith) throw this.failWith;
    return { txHash, ...expected, confirmedAt: new Date("2026-11-10T15:00:00Z") };
  }
}

function setup(funds = { received: "100", verified: "0", pending: "0" }) {
  const store = new Map<string, ExpenseRecord>();
  const anchor = new FakeAnchor();
  const service = new ExpenseService({
    anchor,
    cases: { centerIdOf: async (caseId) => (caseId === "case-1" ? "center-1" : null) },
    funds: {
      receivedTotal: async () => funds.received,
      expenseTotals: async () => ({ verified: funds.verified, pending: funds.pending }),
    },
    expenses: {
      create: async (input) => {
        const record: ExpenseRecord = {
          id: `expense-${store.size + 1}`,
          caseId: input.caseId,
          category: input.category,
          amount: input.amount,
          supportHash: input.supportHash,
          status: "borrador",
          registeredBy: input.registeredBy,
          validatedBy: null,
          anchorTxHash: null,
          validationTxHash: null,
        };
        store.set(record.id, record);
        return record;
      },
      findById: async (id) => store.get(id) ?? null,
      markAnchored: async (id, txHash) => {
        const record = { ...(store.get(id) as ExpenseRecord), status: "pendiente" as const, anchorTxHash: txHash };
        store.set(id, record);
        return record;
      },
      markVerified: async (id, validatorId, txHash) => {
        const record = {
          ...(store.get(id) as ExpenseRecord),
          status: "verificado" as const,
          validatedBy: validatorId,
          validationTxHash: txHash,
        };
        store.set(id, record);
        return record;
      },
    },
  });
  return { service, store, anchor };
}

const input = { caseId: "case-1", category: "medicamentos" as const, amount: "30", supportHash: HASH };

describe("reglas de dominio de gastos", () => {
  it("RN-01: solo los gastos pendientes o verificados son públicos, y nunca como confirmados sin validar", () => {
    expect(publicExpenseStatus("borrador")).toBeNull();
    expect(publicExpenseStatus("rechazado")).toBeNull();
    expect(publicExpenseStatus("pendiente")).toBe("pendiente");
    expect(publicExpenseStatus("verificado")).toBe("verificado");
  });

  it("solo permite las transiciones del ciclo de vida", () => {
    expect(() => assertTransition("borrador", "pendiente")).not.toThrow();
    expect(() => assertTransition("pendiente", "verificado")).not.toThrow();
    expect(() => assertTransition("borrador", "verificado")).toThrow(InvalidTransitionError);
    expect(() => assertTransition("verificado", "rechazado")).toThrow(InvalidTransitionError);
  });

  it("calcula el panel de transparencia con criterio conservador", () => {
    expect(transparencySummary({ received: "100", spentVerified: "30", spentPending: "20" })).toEqual({
      received: "100.0000000",
      spentVerified: "30.0000000",
      spentPending: "20.0000000",
      available: "50.0000000",
      overcommitted: false,
    });
    expect(transparencySummary({ received: "10", spentVerified: "8", spentPending: "5" })).toMatchObject({
      available: "0.0000000",
      overcommitted: true,
    });
  });
});

describe("registrar un gasto (RF-GAS-01)", () => {
  it("crea un borrador a nombre del usuario del centro", async () => {
    const { service } = setup();
    const expense = await service.register(centerUser, input);
    expect(expense).toMatchObject({ status: "borrador", amount: "30.0000000", registeredBy: "user-center" });
  });

  it("rechaza a quien no es del centro dueño del caso y a un validador", async () => {
    const { service } = setup();
    await expect(service.register(foreignCenterUser, input)).rejects.toBeInstanceOf(PermissionError);
    await expect(service.register(validator, input)).rejects.toBeInstanceOf(PermissionError);
    await expect(service.register(centerUser, { ...input, caseId: "otro" })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rechaza hashes inválidos, montos inválidos y gastos que superan el saldo disponible", async () => {
    const { service } = setup({ received: "100", verified: "50", pending: "30" });
    await expect(service.register(centerUser, { ...input, supportHash: "xyz" })).rejects.toBeInstanceOf(ValidationError);
    await expect(service.register(centerUser, { ...input, amount: "0" })).rejects.toBeInstanceOf(ValidationError);
    await expect(service.register(centerUser, { ...input, amount: "21" })).rejects.toBeInstanceOf(ValidationError);
    await expect(service.register(centerUser, { ...input, amount: "20" })).resolves.toMatchObject({ status: "borrador" });
  });
});

describe("anclar y validar (RF-VAL-01, RN-01, RN-02)", () => {
  let ctx: ReturnType<typeof setup>;
  let expenseId: string;

  beforeEach(async () => {
    ctx = setup();
    expenseId = (await ctx.service.register(centerUser, input)).id;
  });

  it("el gasto pasa a pendiente cuando el centro ancla el hash desde su cuenta", async () => {
    const anchored = await ctx.service.confirmAnchor(centerUser, expenseId, ANCHOR_TX);
    expect(anchored).toMatchObject({ status: "pendiente", anchorTxHash: ANCHOR_TX });
    expect(ctx.anchor.verified[0]).toEqual({
      sourceAccount: centerUser.stellarAccount,
      evidenceHashHex: HASH,
    });
  });

  it("solo quien registró el gasto puede anclarlo, y solo una vez", async () => {
    await expect(ctx.service.confirmAnchor(foreignCenterUser, expenseId, ANCHOR_TX)).rejects.toBeInstanceOf(
      PermissionError,
    );
    await ctx.service.confirmAnchor(centerUser, expenseId, ANCHOR_TX);
    await expect(ctx.service.confirmAnchor(centerUser, expenseId, ANCHOR_TX)).rejects.toBeInstanceOf(
      InvalidTransitionError,
    );
  });

  it("no hay anclaje si la red no lo confirma", async () => {
    ctx.anchor.failWith = new TransactionMismatchError("memo distinto");
    await expect(ctx.service.confirmAnchor(centerUser, expenseId, ANCHOR_TX)).rejects.toBeInstanceOf(
      TransactionMismatchError,
    );
    expect(ctx.store.get(expenseId)?.status).toBe("borrador");
  });

  it("un validador del centro lo verifica con su propia firma", async () => {
    await ctx.service.confirmAnchor(centerUser, expenseId, ANCHOR_TX);
    const verified = await ctx.service.confirmValidation(validator, expenseId, VALIDATION_TX);
    expect(verified).toMatchObject({
      status: "verificado",
      validatedBy: "user-validator",
      validationTxHash: VALIDATION_TX,
    });
    expect(ctx.anchor.verified[1]).toEqual({
      sourceAccount: validator.stellarAccount,
      evidenceHashHex: HASH,
    });
  });

  it("RN-02: quien registró el gasto no puede validarlo", async () => {
    // El gasto fue registrado por un usuario con rol validador del mismo centro (caso límite).
    const record = { ...(ctx.store.get(expenseId) as ExpenseRecord), registeredBy: "user-validator", status: "pendiente" as const, anchorTxHash: ANCHOR_TX };
    ctx.store.set(expenseId, record);
    await expect(ctx.service.confirmValidation(validator, expenseId, VALIDATION_TX)).rejects.toBeInstanceOf(
      SeparationOfDutiesError,
    );
    expect(ctx.store.get(expenseId)?.status).toBe("pendiente");
  });

  it("QA-SEG-02: un usuario de centro o un validador de otro centro no pueden validar", async () => {
    await ctx.service.confirmAnchor(centerUser, expenseId, ANCHOR_TX);
    await expect(ctx.service.confirmValidation(centerUser, expenseId, VALIDATION_TX)).rejects.toBeInstanceOf(
      PermissionError,
    );
    await expect(ctx.service.confirmValidation(foreignValidator, expenseId, VALIDATION_TX)).rejects.toBeInstanceOf(
      PermissionError,
    );
    expect(ctx.store.get(expenseId)?.status).toBe("pendiente");
  });

  it("no se valida un borrador ni se valida dos veces", async () => {
    await expect(ctx.service.confirmValidation(validator, expenseId, VALIDATION_TX)).rejects.toBeInstanceOf(
      InvalidTransitionError,
    );
    await ctx.service.confirmAnchor(centerUser, expenseId, ANCHOR_TX);
    await ctx.service.confirmValidation(validator, expenseId, VALIDATION_TX);
    await expect(ctx.service.confirmValidation(validator, expenseId, VALIDATION_TX)).rejects.toBeInstanceOf(
      InvalidTransitionError,
    );
  });

  it("si la validación no coincide con la red, el gasto sigue pendiente", async () => {
    await ctx.service.confirmAnchor(centerUser, expenseId, ANCHOR_TX);
    ctx.anchor.failWith = new TransactionMismatchError("firmó otra cuenta");
    await expect(ctx.service.confirmValidation(validator, expenseId, VALIDATION_TX)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(ctx.store.get(expenseId)?.status).toBe("pendiente");
  });

  it("exige que el usuario tenga una cuenta Stellar para firmar", async () => {
    await expect(
      ctx.service.prepareAnchor({ ...centerUser, stellarAccount: null }, expenseId),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("prepara las transacciones de anclaje con la cuenta de quien firma", async () => {
    const mine = await ctx.service.prepareAnchor(centerUser, expenseId);
    expect(mine.xdr).toBe(`anchor:${centerUser.stellarAccount}:${HASH}`);
    await ctx.service.confirmAnchor(centerUser, expenseId, ANCHOR_TX);
    const theirs = await ctx.service.prepareValidation(validator, expenseId);
    expect(theirs.xdr).toBe(`anchor:${validator.stellarAccount}:${HASH}`);
  });
});
