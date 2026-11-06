import { sumAmounts } from "@/lib/amount";
import { explorerTxUrl } from "@/lib/explorer";
import { toPublicCase, type PublicCase } from "../cases";
import {
  publicExpenseStatus,
  transparencySummary,
  type ExpenseCategory,
  type PublicExpenseStatus,
  type TransparencySummary,
} from "../expenses";
import { buildTimeline, type TimelineEntry } from "../milestones";
import type { CatalogCaseRow, CatalogReader } from "./repository";

export interface PublicTimelineEntry extends TimelineEntry {
  anchorUrl: string;
  validationUrl: string | null;
}

export interface PublicContribution {
  amount: string;
  assetCode: string;
  confirmedAt: string;
  txUrl: string;
}

export interface PublicExpense {
  category: ExpenseCategory;
  amount: string;
  status: PublicExpenseStatus;
  anchorUrl: string;
  validationUrl: string | null;
}

export interface PublicCaseDetail {
  case: PublicCase;
  /** Diagnóstico general; los informes veterinarios completos permanecen privados (RN-08). */
  initialState: string;
  needs: Array<{ category: ExpenseCategory; budgetAmount: string }>;
  timeline: PublicTimelineEntry[];
  transparency: {
    summary: TransparencySummary;
    contributions: PublicContribution[];
    expenses: PublicExpense[];
  };
}

/**
 * Lado de lectura público (RF-CAT-01, RF-CAT-02). Construye únicamente proyecciones públicas: ningún
 * identificador interno, usuario ni dato de donante sale de aquí (QA-SEG-01).
 */
export class CatalogService {
  constructor(
    private readonly reader: CatalogReader,
    private readonly explorerBaseUrl: string,
  ) {}

  async list(): Promise<PublicCase[]> {
    return (await this.reader.listCases()).map((row) => this.toPublic(row));
  }

  async detail(caseCode: string): Promise<PublicCaseDetail | null> {
    const data = await this.reader.getCaseDetailData(caseCode);
    if (!data) return null;

    const url = (txHash: string) => explorerTxUrl(this.explorerBaseUrl, txHash);

    const publicExpenses: PublicExpense[] = [];
    for (const expense of data.expenses) {
      const status = publicExpenseStatus(expense.status);
      if (status && expense.anchorTxHash) {
        publicExpenses.push({
          category: expense.category,
          amount: expense.amount,
          status,
          anchorUrl: url(expense.anchorTxHash),
          validationUrl: expense.validationTxHash ? url(expense.validationTxHash) : null,
        });
      }
    }

    const received = sumAmounts(data.contributions.map((c) => c.amount));
    const total = (status: PublicExpenseStatus) =>
      sumAmounts(publicExpenses.filter((e) => e.status === status).map((e) => e.amount));

    return {
      case: this.toPublic({ ...data.row, raisedAmount: received }),
      initialState: data.row.record.initialState,
      needs: data.needs,
      timeline: buildTimeline(data.milestones).map((entry) => ({
        ...entry,
        anchorUrl: url(entry.anchorTxHash),
        validationUrl: entry.validationTxHash ? url(entry.validationTxHash) : null,
      })),
      transparency: {
        summary: transparencySummary({
          received,
          spentVerified: total("verificado"),
          spentPending: total("pendiente"),
        }),
        contributions: data.contributions.map((c) => ({
          amount: c.amount,
          assetCode: c.assetCode,
          confirmedAt: c.confirmedAt.toISOString(),
          txUrl: url(c.txHash),
        })),
        expenses: publicExpenses,
      },
    };
  }

  private toPublic(row: CatalogCaseRow): PublicCase {
    return toPublicCase(row.record, row.raisedAmount, row.centerName);
  }
}
