import { and, asc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import type {
  NewExpenseDraft,
  NewMilestoneDraft,
  NgoCase,
  RecordDraft,
  RecordKind,
  RecordStore,
} from "@/modules/records";
import type { Db } from "../client";
import { cases, contributionAllocations, contributions, expenses, milestones, providerNgos, providers, stages } from "../schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Gastos e hitos que registra la ONG, con la copia de su transacción (ADR-12). */
export class DbRecordStore implements RecordStore {
  constructor(private readonly db: Db) {}

  async caseForNgo(ngoId: string, caseCode: string): Promise<NgoCase | null> {
    const [row] = await this.db
      .select({ id: cases.id, code: cases.code })
      .from(cases)
      .where(and(eq(cases.code, caseCode), eq(cases.ngoId, ngoId)))
      .limit(1);
    if (!row) return null;

    const [stageRows, coveredRows, spentRows] = await Promise.all([
      this.db
        .select({ id: stages.id, position: stages.position, name: stages.name, cost: stages.cost })
        .from(stages)
        .where(eq(stages.caseId, row.id))
        .orderBy(asc(stages.position)),
      this.db
        .select({ stageId: contributionAllocations.stageId, total: sql<string>`sum(${contributionAllocations.amount})` })
        .from(contributionAllocations)
        .innerJoin(contributions, eq(contributions.id, contributionAllocations.contributionId))
        .where(and(eq(contributions.caseId, row.id), eq(contributions.status, "confirmada")))
        .groupBy(contributionAllocations.stageId),
      // Lo ya gastado más lo que está en camino a la red, para no ofrecer dos veces el mismo saldo.
      this.db
        .select({ stageId: expenses.stageId, total: sql<string>`sum(${expenses.amount})` })
        .from(expenses)
        .where(
          and(
            eq(expenses.caseId, row.id),
            or(eq(expenses.status, "confirmada"), and(eq(expenses.status, "enviada"), isNotNull(expenses.txHash))),
          ),
        )
        .groupBy(expenses.stageId),
    ]);
    const covered = new Map(coveredRows.map((r) => [r.stageId, r.total]));
    const spent = new Map(spentRows.map((r) => [r.stageId, r.total]));
    return {
      ...row,
      stages: stageRows.map((s) => ({ ...s, covered: covered.get(s.id) ?? "0", spent: spent.get(s.id) ?? "0" })),
    };
  }

  async providerForNgo(ngoId: string, providerId: string) {
    if (!UUID.test(providerId)) return null;
    const [row] = await this.db
      .select({ id: providers.id, name: providers.name, account: providers.stellarAccount })
      .from(providers)
      .innerJoin(providerNgos, eq(providerNgos.providerId, providers.id))
      .where(and(eq(providers.id, providerId), eq(providerNgos.ngoId, ngoId)))
      .limit(1);
    return row ?? null;
  }

  async createExpense(input: NewExpenseDraft): Promise<string> {
    const [row] = await this.db
      .insert(expenses)
      .values({ ...input, status: "enviada", validationLevel: "presentado" })
      .returning({ id: expenses.id });
    return row!.id;
  }

  async createMilestone(input: NewMilestoneDraft): Promise<string> {
    const [row] = await this.db
      .insert(milestones)
      .values({ ...input, status: "enviada", validationLevel: "presentado" })
      .returning({ id: milestones.id });
    return row!.id;
  }

  async find(kind: RecordKind, id: string): Promise<RecordDraft | null> {
    if (!UUID.test(id)) return null;
    if (kind === "gasto") {
      const [row] = await this.db
        .select({
          id: expenses.id,
          ngoId: cases.ngoId,
          caseCode: cases.code,
          stagePosition: stages.position,
          status: expenses.status,
          txHash: expenses.txHash,
          evidenceHash: expenses.invoiceHash,
          providerAccount: providers.stellarAccount,
          amount: expenses.amount,
        })
        .from(expenses)
        .innerJoin(cases, eq(cases.id, expenses.caseId))
        .innerJoin(stages, eq(stages.id, expenses.stageId))
        .innerJoin(providers, eq(providers.id, expenses.providerId))
        .where(eq(expenses.id, id))
        .limit(1);
      return row ? { ...row, kind } : null;
    }
    const [row] = await this.db
      .select({
        id: milestones.id,
        ngoId: cases.ngoId,
        caseCode: cases.code,
        stagePosition: stages.position,
        status: milestones.status,
        txHash: milestones.txHash,
        evidenceHash: milestones.evidenceHash,
      })
      .from(milestones)
      .innerJoin(cases, eq(cases.id, milestones.caseId))
      .innerJoin(stages, eq(stages.id, milestones.stageId))
      .where(eq(milestones.id, id))
      .limit(1);
    return row ? { ...row, kind } : null;
  }

  async setTxHash(kind: RecordKind, id: string, txHash: string) {
    const table = kind === "gasto" ? expenses : milestones;
    await this.db
      .update(table)
      .set({ txHash })
      .where(and(eq(table.id, id), eq(table.status, "enviada"), or(isNull(table.txHash), eq(table.txHash, txHash))));
  }

  async markConfirmed(kind: RecordKind, id: string) {
    const table = kind === "gasto" ? expenses : milestones;
    await this.db
      .update(table)
      .set({ status: "confirmada" })
      .where(and(eq(table.id, id), eq(table.status, "enviada"), isNotNull(table.txHash)));
  }

  async markFailed(kind: RecordKind, id: string) {
    const table = kind === "gasto" ? expenses : milestones;
    await this.db.update(table).set({ status: "fallida" }).where(and(eq(table.id, id), eq(table.status, "enviada")));
  }
}

