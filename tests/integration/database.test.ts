import { Keypair } from "@stellar/stellar-sdk";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CatalogService } from "@/modules/catalog";
import { ContributionService } from "@/modules/contributions";
import { ExpenseService } from "@/modules/expenses";
import type { Actor } from "@/modules/shared/actor";
import type { Db } from "@/platform/db/client";
import { DbCatalogReader } from "@/platform/db/repositories/catalog";
import {
  DbCaseLookup,
  DbContributionStore,
  DbDonorStore,
  DbPendingStore,
} from "@/platform/db/repositories/contributions";
import { DbExpenseCaseLookup, DbExpenseStore, DbFundsReader } from "@/platform/db/repositories/expenses";
import * as schema from "@/platform/db/schema";
import { seedDemo, type SeedResult } from "@/platform/db/seed-data";
import { LedgerUnavailableError, TransactionNotFoundError } from "@/ports/errors";
import type { AnchorExpectation, EvidenceAnchor } from "@/ports/evidence-anchor";
import type { ContributionExpectation, PaymentRail } from "@/ports/payment-rail";

/**
 * Pruebas de integración con PostgreSQL real. Se omiten si no hay TEST_DATABASE_URL.
 * ATENCIÓN: vacían todas las tablas. Usa una base de datos desechable, nunca una con datos reales.
 */
const url = process.env.TEST_DATABASE_URL;
const EXPLORER = "https://stellar.expert/explorer/testnet";
const CENTER_ACCOUNT = Keypair.random().publicKey();
const DONOR_ACCOUNT = Keypair.random().publicKey();
const tx = (n: number) => n.toString(16).padStart(64, "0");

class FakeRail implements PaymentRail {
  mode: "ok" | "not_found" | "unavailable" = "ok";
  async buildContributionTransaction() {
    return { xdr: "xdr", networkPassphrase: "test" };
  }
  async verifyContribution(txHash: string, expected: ContributionExpectation) {
    if (this.mode === "not_found") throw new TransactionNotFoundError("aún no aparece");
    if (this.mode === "unavailable") throw new LedgerUnavailableError("sin respuesta");
    return {
      txHash,
      donorAccount: DONOR_ACCOUNT,
      destinationAccount: expected.destinationAccount,
      assetCode: "USDC",
      amount: "10.0000000",
      caseCode: expected.caseCode,
      confirmedAt: new Date("2026-11-10T15:00:00Z"),
    };
  }
}

class FakeAnchor implements EvidenceAnchor {
  async buildAnchorTransaction() {
    return { xdr: "xdr", networkPassphrase: "test" };
  }
  async verifyAnchor(txHash: string, expected: AnchorExpectation) {
    return { txHash, ...expected, confirmedAt: new Date() };
  }
}

describe.skipIf(!url)("integración con PostgreSQL", () => {
  let client: postgres.Sql;
  let db: Db;
  let seed: SeedResult;
  let catalog: CatalogService;

  beforeAll(async () => {
    client = postgres(url as string, { max: 5 });
    db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: "./drizzle" });
    await client.unsafe(
      "truncate table pending_contributions, contributions, expenses, milestones, needs, cases, donors, app_users, centers, audit_log cascade",
    );
    seed = await seedDemo(db, { withActivity: true, password: "demo", centerAccount: CENTER_ACCOUNT });
    catalog = new CatalogService(new DbCatalogReader(db), EXPLORER);
  });

  afterAll(async () => {
    await client?.end();
  });

  it("las semillas cargan 3 casos y no se duplican al repetirlas", async () => {
    expect(Object.keys(seed.cases ?? {}).sort()).toEqual(["POW-001", "POW-002", "POW-003"]);
    expect((await seedDemo(db)).skipped).toBe(true);
  });

  describe("catálogo público (RF-CAT-01, QA-SEG-01)", () => {
    it("lista los casos con su progreso y respeta la regla de especie", async () => {
      const list = await catalog.list();
      expect(list.map((c) => c.code)).toEqual(["POW-001", "POW-002", "POW-003"]);
      const [p1, p2, p3] = list;
      expect(p1?.species).toBeNull();
      expect(p2).toMatchObject({ species: "Mono aullador", raisedAmount: "65.5000000", progressPercent: 2.6 });
      expect(p3).toMatchObject({ progressPercent: 100, finalDestination: { destination: "liberacion" } });
    });

    it("el detalle arma la línea de tiempo y el panel de transparencia solo con lo público (RN-01)", async () => {
      const detail = await catalog.detail("POW-002");
      expect(detail).not.toBeNull();
      expect(detail?.timeline.map((e) => e.stage)).toEqual([
        "ingreso",
        "cuarentena",
        "evaluacion_veterinaria",
        "rehabilitacion",
      ]);
      expect(detail?.transparency.contributions).toHaveLength(2);
      expect(detail?.transparency.expenses.map((e) => e.status).sort()).toEqual(["pendiente", "verificado"]);
      expect(detail?.transparency.summary).toEqual({
        received: "65.5000000",
        spentVerified: "30.0000000",
        spentPending: "12.0000000",
        available: "23.5000000",
        overcommitted: false,
      });
    });

    it("no filtra identificadores internos, usuarios ni cuentas de donantes", async () => {
      const serialized = JSON.stringify(await catalog.detail("POW-002"));
      expect(serialized).not.toContain(seed.users?.center);
      expect(serialized).not.toContain(seed.users?.validator);
      expect(serialized).not.toContain(seed.centerId);
      const donorRows = await db.select().from(schema.donors);
      for (const donor of donorRows) expect(serialized).not.toContain(donor.stellarAccount);
    });

    it("devuelve nulo para un caso inexistente", async () => {
      expect(await catalog.detail("POW-999")).toBeNull();
    });
  });

  describe("aportes con base de datos real (RN-03, ADR-04)", () => {
    const rail = new FakeRail();
    const service = () =>
      new ContributionService({
        rail,
        cases: new DbCaseLookup(db),
        contributions: new DbContributionStore(db),
        donors: new DbDonorStore(db),
        pending: new DbPendingStore(db),
      });

    it("confirma un aporte, crea al donante y es idempotente por hash", async () => {
      rail.mode = "ok";
      const first = await service().confirm({ caseCode: "POW-001", txHash: tx(1) });
      const second = await service().confirm({ caseCode: "POW-001", txHash: tx(1) });
      expect(first.status).toBe("confirmed");
      expect(second).toEqual(first);

      const rows = await db.select().from(schema.contributions);
      expect(rows.filter((r) => r.txHash === tx(1))).toHaveLength(1);
      const [p1] = await catalog.list();
      expect(p1?.raisedAmount).toBe("10.0000000");
    });

    it("deja pendiente un envío si la red falla y lo confirma al reconciliar", async () => {
      rail.mode = "unavailable";
      expect(await service().confirm({ caseCode: "POW-001", txHash: tx(2) })).toEqual({ status: "pending" });
      expect(await db.select().from(schema.pendingContributions)).toHaveLength(1);

      rail.mode = "ok";
      expect(await service().reconcile()).toEqual({ confirmed: 1, stillPending: 0, discarded: 0 });
      expect(await db.select().from(schema.pendingContributions)).toHaveLength(0);
    });
  });

  describe("gastos con base de datos real (RN-01, RN-02)", () => {
    const center = (): Actor => ({
      userId: seed.users?.center as string,
      role: "center",
      centerId: seed.centerId as string,
      stellarAccount: Keypair.random().publicKey(),
    });
    const validator = (): Actor => ({
      userId: seed.users?.validator as string,
      role: "validator",
      centerId: seed.centerId as string,
      stellarAccount: Keypair.random().publicKey(),
    });
    const service = () =>
      new ExpenseService({
        anchor: new FakeAnchor(),
        expenses: new DbExpenseStore(db),
        cases: new DbExpenseCaseLookup(db),
        funds: new DbFundsReader(db),
      });

    it("recorre registrar, anclar y validar, y el saldo se actualiza", async () => {
      const caseId = seed.cases?.["POW-002"] as string;
      const svc = service();
      const draft = await svc.register(center(), {
        caseId,
        category: "medicamentos",
        amount: "10",
        supportHash: "ab".repeat(32),
      });
      expect(draft.status).toBe("borrador");
      expect((await svc.summary(caseId)).spentPending).toBe("12.0000000");

      const pending = await svc.confirmAnchor(center(), draft.id, tx(10));
      expect(pending.status).toBe("pendiente");
      expect((await svc.summary(caseId)).spentPending).toBe("22.0000000");

      const verified = await svc.confirmValidation(validator(), draft.id, tx(11));
      expect(verified).toMatchObject({ status: "verificado", validatedBy: seed.users?.validator });
      expect(await svc.summary(caseId)).toMatchObject({ spentVerified: "40.0000000", spentPending: "12.0000000" });
    });

    it("la base de datos impide un gasto validado por quien lo registró (RN-02)", async () => {
      await expect(
        db.insert(schema.expenses).values({
          caseId: seed.cases?.["POW-002"] as string,
          category: "alimentacion",
          amount: "1",
          supportHash: "cd".repeat(32),
          status: "pendiente",
          registeredBy: seed.users?.center as string,
          validatedBy: seed.users?.center as string,
          anchorTxHash: tx(20),
        }),
      ).rejects.toThrow();
    });

    it("la base de datos impide un gasto pendiente sin ancla (RN-01)", async () => {
      await expect(
        db.insert(schema.expenses).values({
          caseId: seed.cases?.["POW-002"] as string,
          category: "alimentacion",
          amount: "1",
          supportHash: "ef".repeat(32),
          status: "pendiente",
          registeredBy: seed.users?.center as string,
        }),
      ).rejects.toThrow();
    });
  });
});
