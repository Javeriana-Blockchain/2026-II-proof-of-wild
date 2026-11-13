import { and, asc, eq, sql } from "drizzle-orm";
import type { ContributionCase, ContributionStore, StoredContribution } from "@/modules/contributions";
import type { Db } from "../client";
import { cases, contributionAllocations, contributions, ngos, stages } from "../schema";

/** Copia en la base de datos de cada aporte enviado al contrato (ADR-12). */
export class DbContributionStore implements ContributionStore {
  constructor(private readonly db: Db) {}

  async caseForContribution(caseCode: string): Promise<ContributionCase | null> {
    const [row] = await this.db
      .select({ id: cases.id, code: cases.code, status: cases.status, ngoStatus: ngos.status })
      .from(cases)
      .innerJoin(ngos, eq(ngos.id, cases.ngoId))
      .where(eq(cases.code, caseCode))
      .limit(1);
    if (!row) return null;

    const [stageRows, coveredRows] = await Promise.all([
      this.db
        .select({ id: stages.id, position: stages.position, cost: stages.cost })
        .from(stages)
        .where(eq(stages.caseId, row.id))
        .orderBy(asc(stages.position)),
      this.db
        .select({ stageId: contributionAllocations.stageId, total: sql<string>`sum(${contributionAllocations.amount})` })
        .from(contributionAllocations)
        .innerJoin(contributions, eq(contributions.id, contributionAllocations.contributionId))
        .where(and(eq(contributions.caseId, row.id), eq(contributions.status, "confirmada")))
        .groupBy(contributionAllocations.stageId),
    ]);
    const covered = new Map(coveredRows.map((r) => [r.stageId, r.total]));

    return {
      id: row.id,
      code: row.code,
      acceptsContributions: row.status === "activo" && row.ngoStatus === "aprobada",
      stages: stageRows.map((s) => ({ ...s, covered: covered.get(s.id) ?? "0" })),
    };
  }

  async saveSubmitted(input: { caseId: string; donorAccount: string; amount: string; txHash: string }) {
    await this.db
      .insert(contributions)
      .values({ ...input, status: "enviada" })
      .onConflictDoUpdate({
        target: contributions.txHash,
        set: { status: "enviada", lastError: null },
        setWhere: eq(contributions.status, "fallida"),
      });
  }

  async find(txHash: string): Promise<StoredContribution | null> {
    const [row] = await this.db
      .select({
        txHash: contributions.txHash,
        caseId: contributions.caseId,
        caseCode: cases.code,
        donorAccount: contributions.donorAccount,
        amount: contributions.amount,
        status: contributions.status,
        lastError: contributions.lastError,
      })
      .from(contributions)
      .innerJoin(cases, eq(cases.id, contributions.caseId))
      .where(eq(contributions.txHash, txHash))
      .limit(1);
    return row ?? null;
  }

  async markConfirmed(txHash: string, input: { confirmedAt: Date; allocations: Array<{ stageId: string; amount: string }> }) {
    await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(contributions)
        .set({ status: "confirmada", confirmedAt: input.confirmedAt, lastError: null })
        .where(and(eq(contributions.txHash, txHash), eq(contributions.status, "enviada")))
        .returning({ id: contributions.id });
      // Si otra petición ya la confirmó, no se duplica el reparto.
      if (!row || input.allocations.length === 0) return;
      await tx
        .insert(contributionAllocations)
        .values(input.allocations.map((a) => ({ contributionId: row.id, stageId: a.stageId, amount: a.amount })));
    });
  }

  async markFailed(txHash: string, reason: string) {
    await this.db
      .update(contributions)
      .set({ status: "fallida", lastError: reason })
      .where(and(eq(contributions.txHash, txHash), eq(contributions.status, "enviada")));
  }

  async recordAttempt(txHash: string, error: string) {
    await this.db
      .update(contributions)
      .set({ attempts: sql`${contributions.attempts} + 1`, lastError: error })
      .where(eq(contributions.txHash, txHash));
  }

  async listPending(limit: number): Promise<string[]> {
    const rows = await this.db
      .select({ txHash: contributions.txHash })
      .from(contributions)
      .where(eq(contributions.status, "enviada"))
      .orderBy(asc(contributions.submittedAt))
      .limit(limit);
    return rows.map((r) => r.txHash);
  }
}
