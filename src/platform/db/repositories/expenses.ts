import { and, eq, sql } from "drizzle-orm";
import type {
  ExpenseCaseLookup,
  ExpenseRecord,
  ExpenseStore,
  FundsReader,
  NewExpense,
} from "@/modules/expenses";
import { InvalidTransitionError } from "@/modules/shared/errors";
import type { Db } from "../client";
import { cases, contributions, expenses } from "../schema";
import { toExpenseRecord } from "./catalog";

export class DbExpenseStore implements ExpenseStore {
  constructor(private readonly db: Db) {}

  async create(input: NewExpense): Promise<ExpenseRecord> {
    const [row] = await this.db.insert(expenses).values(input).returning();
    if (!row) throw new Error("No se pudo crear el gasto.");
    return toExpenseRecord(row);
  }

  async findById(id: string): Promise<ExpenseRecord | null> {
    const [row] = await this.db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    return row ? toExpenseRecord(row) : null;
  }

  async markAnchored(id: string, anchorTxHash: string): Promise<ExpenseRecord> {
    const [row] = await this.db
      .update(expenses)
      .set({ status: "pendiente", anchorTxHash })
      .where(and(eq(expenses.id, id), eq(expenses.status, "borrador")))
      .returning();
    if (!row) throw new InvalidTransitionError("El gasto ya no está en borrador.");
    return toExpenseRecord(row);
  }

  async markVerified(id: string, validatorId: string, validationTxHash: string): Promise<ExpenseRecord> {
    const [row] = await this.db
      .update(expenses)
      .set({ status: "verificado", validatedBy: validatorId, validationTxHash, validatedAt: new Date() })
      .where(and(eq(expenses.id, id), eq(expenses.status, "pendiente")))
      .returning();
    if (!row) throw new InvalidTransitionError("El gasto ya no está pendiente de validación.");
    return toExpenseRecord(row);
  }
}

export class DbExpenseCaseLookup implements ExpenseCaseLookup {
  constructor(private readonly db: Db) {}

  async centerIdOf(caseId: string): Promise<string | null> {
    const [row] = await this.db.select({ centerId: cases.centerId }).from(cases).where(eq(cases.id, caseId)).limit(1);
    return row?.centerId ?? null;
  }
}

export class DbFundsReader implements FundsReader {
  constructor(private readonly db: Db) {}

  async receivedTotal(caseId: string): Promise<string> {
    const [row] = await this.db
      .select({ total: sql<string>`coalesce(sum(${contributions.amount}), 0)` })
      .from(contributions)
      .where(eq(contributions.caseId, caseId));
    return row?.total ?? "0";
  }

  async expenseTotals(caseId: string): Promise<{ verified: string; pending: string }> {
    const [row] = await this.db
      .select({
        verified: sql<string>`coalesce(sum(${expenses.amount}) filter (where ${expenses.status} = 'verificado'), 0)`,
        pending: sql<string>`coalesce(sum(${expenses.amount}) filter (where ${expenses.status} = 'pendiente'), 0)`,
      })
      .from(expenses)
      .where(eq(expenses.caseId, caseId));
    return { verified: row?.verified ?? "0", pending: row?.pending ?? "0" };
  }
}
