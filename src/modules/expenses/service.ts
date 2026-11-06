import { normalizePositiveAmount } from "@/lib/amount";
import { isSha256Hex } from "@/lib/hash";
import { TransactionMismatchError } from "@/ports/errors";
import type { EvidenceAnchor } from "@/ports/evidence-anchor";
import type { UnsignedTransaction } from "@/ports/payment-rail";
import { assertCanValidate, requireRole, type Actor } from "../shared/actor";
import { NotFoundError, PermissionError, ValidationError } from "../shared/errors";
import {
  assertTransition,
  assertWithinAvailable,
  transparencySummary,
  type ExpenseCategory,
  type ExpenseRecord,
  type TransparencySummary,
} from "./domain";
import type { ExpenseCaseLookup, ExpenseStore, FundsReader } from "./repository";

export interface ExpenseServiceDeps {
  expenses: ExpenseStore;
  cases: ExpenseCaseLookup;
  funds: FundsReader;
  anchor: EvidenceAnchor;
}

/**
 * Casos de uso de gastos (RF-GAS-01, RF-VAL-01). El centro registra y ancla el hash del soporte con su
 * billetera; un validador distinto lo valida anclando el mismo hash con la suya (ADR-05).
 */
export class ExpenseService {
  constructor(private readonly deps: ExpenseServiceDeps) {}

  async summary(caseId: string): Promise<TransparencySummary> {
    const [received, totals] = await Promise.all([
      this.deps.funds.receivedTotal(caseId),
      this.deps.funds.expenseTotals(caseId),
    ]);
    return transparencySummary({
      received,
      spentVerified: totals.verified,
      spentPending: totals.pending,
    });
  }

  /** Crea un gasto en borrador. Aún no es público: falta anclar el hash del soporte. */
  async register(
    actor: Actor,
    input: {
      caseId: string;
      category: ExpenseCategory;
      amount: string;
      supportHash: string;
      supportKey?: string;
    },
  ): Promise<ExpenseRecord> {
    requireRole(actor, "center");
    const centerId = await this.deps.cases.centerIdOf(input.caseId);
    if (!centerId) throw new NotFoundError("El caso no existe.");
    if (centerId !== actor.centerId) {
      throw new PermissionError("Solo el centro dueño del caso puede registrar gastos.");
    }
    if (!isSha256Hex(input.supportHash)) {
      throw new ValidationError("El hash del soporte debe ser SHA-256 en hexadecimal minúscula.");
    }

    let amount: string;
    try {
      amount = normalizePositiveAmount(input.amount);
    } catch (error) {
      throw new ValidationError(error instanceof Error ? error.message : "Monto inválido.");
    }
    assertWithinAvailable(await this.summary(input.caseId), amount);

    return this.deps.expenses.create({
      caseId: input.caseId,
      category: input.category,
      amount,
      supportKey: input.supportKey ?? null,
      supportHash: input.supportHash,
      registeredBy: actor.userId,
    });
  }

  /** Transacción de anclaje que firma la billetera del centro. */
  async prepareAnchor(actor: Actor, expenseId: string): Promise<UnsignedTransaction> {
    const expense = await this.requireExpense(expenseId);
    requireRole(actor, "center");
    if (expense.registeredBy !== actor.userId) {
      throw new PermissionError("Solo quien registró el gasto puede anclarlo.");
    }
    assertTransition(expense.status, "pendiente");
    return this.deps.anchor.buildAnchorTransaction({
      sourceAccount: this.requireAccount(actor),
      evidenceHashHex: expense.supportHash,
    });
  }

  /** Confirma el anclaje del centro leyendo la red. El gasto pasa a pendiente y se hace público. */
  async confirmAnchor(actor: Actor, expenseId: string, txHash: string): Promise<ExpenseRecord> {
    const expense = await this.requireExpense(expenseId);
    requireRole(actor, "center");
    if (expense.registeredBy !== actor.userId) {
      throw new PermissionError("Solo quien registró el gasto puede anclarlo.");
    }
    assertTransition(expense.status, "pendiente");
    await this.deps.anchor.verifyAnchor(txHash, {
      sourceAccount: this.requireAccount(actor),
      evidenceHashHex: expense.supportHash,
    });
    return this.deps.expenses.markAnchored(expense.id, txHash);
  }

  /** Transacción de anclaje que firma la billetera del validador. */
  async prepareValidation(actor: Actor, expenseId: string): Promise<UnsignedTransaction> {
    const expense = await this.requireExpense(expenseId);
    await this.assertValidatorMayValidate(actor, expense);
    return this.deps.anchor.buildAnchorTransaction({
      sourceAccount: this.requireAccount(actor),
      evidenceHashHex: expense.supportHash,
    });
  }

  /** Confirma la validación leyendo la red. Solo entonces el gasto aparece como verificado (RN-01). */
  async confirmValidation(actor: Actor, expenseId: string, txHash: string): Promise<ExpenseRecord> {
    const expense = await this.requireExpense(expenseId);
    await this.assertValidatorMayValidate(actor, expense);
    try {
      await this.deps.anchor.verifyAnchor(txHash, {
        sourceAccount: this.requireAccount(actor),
        evidenceHashHex: expense.supportHash,
      });
    } catch (error) {
      if (error instanceof TransactionMismatchError) {
        throw new ValidationError(`La validación no coincide con lo registrado en la red: ${error.message}`);
      }
      throw error;
    }
    return this.deps.expenses.markVerified(expense.id, actor.userId, txHash);
  }

  private async assertValidatorMayValidate(actor: Actor, expense: ExpenseRecord): Promise<void> {
    const centerId = await this.deps.cases.centerIdOf(expense.caseId);
    if (!centerId) throw new NotFoundError("El caso no existe.");
    assertCanValidate(actor, { registeredBy: expense.registeredBy, centerId });
    assertTransition(expense.status, "verificado");
  }

  private async requireExpense(id: string): Promise<ExpenseRecord> {
    const expense = await this.deps.expenses.findById(id);
    if (!expense) throw new NotFoundError("El gasto no existe.");
    return expense;
  }

  private requireAccount(actor: Actor): string {
    if (!actor.stellarAccount) {
      throw new ValidationError("Tu usuario no tiene una cuenta Stellar registrada para firmar.");
    }
    return actor.stellarAccount;
  }
}
