import type { ExpenseCategory, ExpenseRecord } from "./domain";

/** Puertos de persistencia que necesita el módulo de gastos. Los implementa `platform/db`. */

export interface NewExpense {
  caseId: string;
  category: ExpenseCategory;
  amount: string;
  supportKey: string | null;
  supportHash: string;
  registeredBy: string;
}

export interface ExpenseStore {
  create(input: NewExpense): Promise<ExpenseRecord>;
  findById(id: string): Promise<ExpenseRecord | null>;
  /** borrador -> pendiente: el centro anclo el hash del soporte en la red. */
  markAnchored(id: string, anchorTxHash: string): Promise<ExpenseRecord>;
  /** pendiente -> verificado: un validador anclo su validacion en la red. */
  markVerified(id: string, validatorId: string, validationTxHash: string): Promise<ExpenseRecord>;
}

export interface ExpenseCaseLookup {
  /** Centro dueño del caso, o nulo si el caso no existe. */
  centerIdOf(caseId: string): Promise<string | null>;
}

export interface FundsReader {
  /** Total de aportes confirmados del caso. */
  receivedTotal(caseId: string): Promise<string>;
  /** Total de gastos del caso por estado público. */
  expenseTotals(caseId: string): Promise<{ verified: string; pending: string }>;
}
