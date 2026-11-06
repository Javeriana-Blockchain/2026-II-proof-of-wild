import { asc, eq, sql } from "drizzle-orm";
import type {
  CaseForContribution,
  CaseLookup,
  ConfirmedContribution,
  ContributionStore,
  DonorStore,
  PendingContribution,
  PendingStore,
} from "@/modules/contributions";
import type { Db } from "../client";
import { cases, centers, contributions, donors, pendingContributions } from "../schema";

export class DbCaseLookup implements CaseLookup {
  constructor(private readonly db: Db) {}

  async findForContribution(caseCode: string): Promise<CaseForContribution | null> {
    const [row] = await this.db
      .select({
        id: cases.id,
        code: cases.code,
        stellarAccount: centers.stellarAccount,
        verification: centers.verificationStatus,
      })
      .from(cases)
      .innerJoin(centers, eq(cases.centerId, centers.id))
      .where(eq(cases.code, caseCode))
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      code: row.code,
      centerStellarAccount: row.stellarAccount,
      centerVerified: row.verification === "verified",
    };
  }
}

function toConfirmed(row: typeof contributions.$inferSelect): ConfirmedContribution {
  return {
    id: row.id,
    caseId: row.caseId,
    donorId: row.donorId,
    amount: row.amount,
    assetCode: row.assetCode,
    txHash: row.txHash,
    confirmedAt: row.confirmedAt,
  };
}

export class DbContributionStore implements ContributionStore {
  constructor(private readonly db: Db) {}

  async findByTxHash(txHash: string): Promise<ConfirmedContribution | null> {
    const [row] = await this.db.select().from(contributions).where(eq(contributions.txHash, txHash)).limit(1);
    return row ? toConfirmed(row) : null;
  }

  /** Idempotente por hash: una segunda llamada concurrente devuelve la fila ya guardada. */
  async saveConfirmed(input: Omit<ConfirmedContribution, "id">): Promise<ConfirmedContribution> {
    const [inserted] = await this.db
      .insert(contributions)
      .values(input)
      .onConflictDoNothing({ target: contributions.txHash })
      .returning();
    if (inserted) return toConfirmed(inserted);

    const existing = await this.findByTxHash(input.txHash);
    if (!existing) throw new Error("No se pudo guardar el aporte.");
    return existing;
  }
}

export class DbDonorStore implements DonorStore {
  constructor(private readonly db: Db) {}

  async upsertByAccount(stellarAccount: string): Promise<{ id: string }> {
    const [row] = await this.db
      .insert(donors)
      .values({ stellarAccount })
      .onConflictDoUpdate({
        target: donors.stellarAccount,
        set: { stellarAccount: sql`excluded.stellar_account` },
      })
      .returning({ id: donors.id });
    if (!row) throw new Error("No se pudo registrar al donante.");
    return row;
  }
}

export class DbPendingStore implements PendingStore {
  constructor(private readonly db: Db) {}

  async register(txHash: string, caseId: string): Promise<void> {
    await this.db.insert(pendingContributions).values({ txHash, caseId }).onConflictDoNothing();
  }

  async remove(txHash: string): Promise<void> {
    await this.db.delete(pendingContributions).where(eq(pendingContributions.txHash, txHash));
  }

  async recordAttempt(txHash: string, error: string): Promise<void> {
    await this.db
      .update(pendingContributions)
      .set({
        attempts: sql`${pendingContributions.attempts} + 1`,
        lastError: error,
        lastAttemptAt: new Date(),
      })
      .where(eq(pendingContributions.txHash, txHash));
  }

  async listOldest(limit: number): Promise<PendingContribution[]> {
    const rows = await this.db
      .select({ txHash: pendingContributions.txHash, caseId: pendingContributions.caseId, caseCode: cases.code })
      .from(pendingContributions)
      .innerJoin(cases, eq(pendingContributions.caseId, cases.id))
      .orderBy(asc(pendingContributions.submittedAt))
      .limit(limit);
    return rows;
  }
}
