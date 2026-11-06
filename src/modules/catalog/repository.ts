import type { CaseRecord } from "../cases";
import type { ExpenseCategory, ExpenseRecord } from "../expenses";
import type { MilestoneRecord } from "../milestones";

/** Puerto de lectura del lado público (ADR-06): lee solo de la base de datos, nunca de la red Stellar. */

export interface CatalogCaseRow {
  record: CaseRecord;
  centerName: string;
  /** Total de aportes confirmados del caso. */
  raisedAmount: string;
}

export interface NeedRow {
  category: ExpenseCategory;
  budgetAmount: string;
}

export interface ConfirmedContributionRow {
  amount: string;
  assetCode: string;
  confirmedAt: Date;
  txHash: string;
}

export interface CaseDetailData {
  row: CatalogCaseRow;
  needs: NeedRow[];
  milestones: MilestoneRecord[];
  expenses: ExpenseRecord[];
  contributions: ConfirmedContributionRow[];
}

export interface ReceiptRow {
  caseCode: string;
  amount: string;
  assetCode: string;
  confirmedAt: Date;
  txHash: string;
}

export interface CatalogReader {
  listCases(): Promise<CatalogCaseRow[]>;
  getCaseDetailData(caseCode: string): Promise<CaseDetailData | null>;
  getReceipt(txHash: string): Promise<ReceiptRow | null>;
}
