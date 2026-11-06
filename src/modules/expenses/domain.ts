import { fromStroops, toStroops } from "@/lib/amount";
import { InvalidTransitionError, ValidationError } from "../shared/errors";

export type ExpenseStatus = "borrador" | "pendiente" | "verificado" | "rechazado";
export type PublicExpenseStatus = "pendiente" | "verificado";

export type ExpenseCategory =
  | "alimentacion"
  | "atencion_veterinaria"
  | "medicamentos"
  | "rehabilitacion"
  | "destino_final";

export interface ExpenseRecord {
  id: string;
  caseId: string;
  category: ExpenseCategory;
  amount: string;
  supportHash: string;
  status: ExpenseStatus;
  registeredBy: string;
  validatedBy: string | null;
  anchorTxHash: string | null;
  validationTxHash: string | null;
}

/**
 * RN-01: un gasto sin validar se muestra como pendiente, nunca como confirmado.
 * Los borradores y los rechazados no se muestran públicamente.
 */
export function publicExpenseStatus(status: ExpenseStatus): PublicExpenseStatus | null {
  return status === "pendiente" || status === "verificado" ? status : null;
}

const TRANSITIONS: Record<ExpenseStatus, readonly ExpenseStatus[]> = {
  borrador: ["pendiente", "rechazado"],
  pendiente: ["verificado", "rechazado"],
  verificado: [],
  rechazado: [],
};

export function assertTransition(from: ExpenseStatus, to: ExpenseStatus): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new InvalidTransitionError(`Un gasto en estado "${from}" no puede pasar a "${to}".`);
  }
}

export interface TransparencySummary {
  received: string;
  spentVerified: string;
  spentPending: string;
  /** Recibido menos gastos verificados y pendientes (criterio conservador, ver `transparencySummary`). */
  available: string;
  /** Verdadero si lo gastado y lo pendiente superan lo recibido. */
  overcommitted: boolean;
}

/**
 * Panel de transparencia (RF-CAT-02). Criterio conservador: los gastos pendientes ya comprometen fondos,
 * así que el saldo disponible resta tanto los verificados como los pendientes; si un gasto se rechaza,
 * los fondos vuelven a estar disponibles. Es una decisión de producto por confirmar (ver docs).
 */
export function transparencySummary(input: {
  received: string;
  spentVerified: string;
  spentPending: string;
}): TransparencySummary {
  const received = toStroops(input.received);
  const verified = toStroops(input.spentVerified);
  const pending = toStroops(input.spentPending);
  const available = received - verified - pending;
  return {
    received: fromStroops(received),
    spentVerified: fromStroops(verified),
    spentPending: fromStroops(pending),
    available: fromStroops(available > 0n ? available : 0n),
    overcommitted: available < 0n,
  };
}

/** Un gasto no puede superar el saldo disponible del caso. */
export function assertWithinAvailable(summary: TransparencySummary, amount: string): void {
  if (toStroops(amount) > toStroops(summary.available)) {
    throw new ValidationError("El gasto supera el saldo disponible del caso.");
  }
}
