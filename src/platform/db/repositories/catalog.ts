import { asc, eq, sql } from "drizzle-orm";
import type { CaseRecord } from "@/modules/cases";
import type { CaseDetailData, CatalogCaseRow, CatalogReader, ReceiptRow } from "@/modules/catalog";
import type { ExpenseRecord } from "@/modules/expenses";
import type { MilestoneRecord } from "@/modules/milestones";
import type { Db } from "../client";
import { cases, centers, contributions, expenses, milestones, needs } from "../schema";

type CaseRow = typeof cases.$inferSelect;

export function toCaseRecord(row: CaseRow): CaseRecord {
  return {
    id: row.id,
    code: row.code,
    centerId: row.centerId,
    species: row.species,
    speciesPublic: row.speciesPublic,
    intakeDate: row.intakeDate,
    initialState: row.initialState,
    goalAmount: row.goalAmount,
    currentStage: row.currentStage,
    finalDestination: row.finalDestination,
  };
}

export function toExpenseRecord(row: typeof expenses.$inferSelect): ExpenseRecord {
  return {
    id: row.id,
    caseId: row.caseId,
    category: row.category,
    amount: row.amount,
    supportHash: row.supportHash,
    status: row.status,
    registeredBy: row.registeredBy,
    validatedBy: row.validatedBy,
    anchorTxHash: row.anchorTxHash,
    validationTxHash: row.validationTxHash,
  };
}

function toMilestoneRecord(row: typeof milestones.$inferSelect): MilestoneRecord {
  return {
    id: row.id,
    caseId: row.caseId,
    stage: row.stage,
    occurredAt: row.occurredAt,
    description: row.description,
    evidenceHash: row.evidenceHash,
    validationLevel: row.validationLevel,
    registeredBy: row.registeredBy,
    validatedBy: row.validatedBy,
    anchorTxHash: row.anchorTxHash,
    validationTxHash: row.validationTxHash,
  };
}

/** Lector del lado público: solo consulta la base de datos (ADR-06). */
export class DbCatalogReader implements CatalogReader {
  constructor(private readonly db: Db) {}

  async listCases(): Promise<CatalogCaseRow[]> {
    const rows = await this.db
      .select({ record: cases, centerName: centers.name })
      .from(cases)
      .innerJoin(centers, eq(cases.centerId, centers.id))
      .orderBy(asc(cases.code));

    const totals = await this.db
      .select({
        caseId: contributions.caseId,
        total: sql<string>`coalesce(sum(${contributions.amount}), 0)`,
      })
      .from(contributions)
      .groupBy(contributions.caseId);
    const raisedByCase = new Map(totals.map((t) => [t.caseId, t.total]));

    return rows.map((row) => ({
      record: toCaseRecord(row.record),
      centerName: row.centerName,
      raisedAmount: raisedByCase.get(row.record.id) ?? "0",
    }));
  }

  async getReceipt(txHash: string): Promise<ReceiptRow | null> {
    const [row] = await this.db
      .select({
        caseCode: cases.code,
        amount: contributions.amount,
        assetCode: contributions.assetCode,
        confirmedAt: contributions.confirmedAt,
        txHash: contributions.txHash,
      })
      .from(contributions)
      .innerJoin(cases, eq(contributions.caseId, cases.id))
      .where(eq(contributions.txHash, txHash))
      .limit(1);
    return row ?? null;
  }

  async getCaseDetailData(caseCode: string): Promise<CaseDetailData | null> {
    const [found] = await this.db
      .select({ record: cases, centerName: centers.name })
      .from(cases)
      .innerJoin(centers, eq(cases.centerId, centers.id))
      .where(eq(cases.code, caseCode))
      .limit(1);
    if (!found) return null;

    const caseId = found.record.id;
    const [needRows, milestoneRows, expenseRows, contributionRows] = await Promise.all([
      this.db.select().from(needs).where(eq(needs.caseId, caseId)).orderBy(asc(needs.category)),
      this.db.select().from(milestones).where(eq(milestones.caseId, caseId)),
      this.db.select().from(expenses).where(eq(expenses.caseId, caseId)).orderBy(asc(expenses.createdAt)),
      this.db
        .select()
        .from(contributions)
        .where(eq(contributions.caseId, caseId))
        .orderBy(asc(contributions.confirmedAt)),
    ]);

    return {
      row: {
        record: toCaseRecord(found.record),
        centerName: found.centerName,
        raisedAmount: "0",
      },
      needs: needRows.map((n) => ({ category: n.category, budgetAmount: n.budgetAmount })),
      milestones: milestoneRows.map(toMilestoneRecord),
      expenses: expenseRows.map(toExpenseRecord),
      contributions: contributionRows.map((c) => ({
        amount: c.amount,
        assetCode: c.assetCode,
        confirmedAt: c.confirmedAt,
        txHash: c.txHash,
      })),
    };
  }
}
