import { fromStroops, toStroops } from "@/lib/amount";
import { ValidationError } from "../shared/errors";

/** Código del caso: el mismo del contrato, donde va como Symbol (letras, números y guion bajo). */
const CASE_CODE = /^POW_\d{3,6}$/;

export function isValidCaseCode(code: string): boolean {
  return CASE_CODE.test(code);
}

export type StageStatus = "pendiente" | "en_curso" | "completada";

/** Lo que se necesita de una etapa para repartir un aporte: su orden, su costo y lo ya cubierto. */
export interface StageFunding {
  position: number;
  cost: string;
  covered: string;
}

export interface StageAllocation {
  position: number;
  amount: string;
}

/** Lo que falta para la meta del caso: la suma de lo que falta en cada etapa. */
export function remainingToGoal(stages: readonly StageFunding[]): string {
  return fromStroops(
    stages.reduce((total, s) => {
      const missing = toStroops(s.cost) - toStroops(s.covered);
      return total + (missing > 0n ? missing : 0n);
    }, 0n),
  );
}

/**
 * Reparte un aporte entre las etapas en orden, como lo hace `aportar` en el contrato: llena la primera etapa
 * que falte por cubrir y sigue con la siguiente. Rechaza el aporte si supera lo que falta para la meta.
 * La página lo usa para mostrar el reparto antes de firmar; el reparto que vale es el del evento del contrato.
 */
export function allocateContribution(stages: readonly StageFunding[], amount: string): StageAllocation[] {
  let left = toStroops(amount);
  if (left <= 0n) throw new ValidationError("El aporte debe ser mayor que cero.");
  if (left > toStroops(remainingToGoal(stages))) {
    throw new ValidationError("El aporte supera lo que falta para el tratamiento.");
  }

  const allocations: StageAllocation[] = [];
  for (const stage of [...stages].sort((a, b) => a.position - b.position)) {
    if (left === 0n) break;
    const missing = toStroops(stage.cost) - toStroops(stage.covered);
    if (missing <= 0n) continue;
    const take = missing < left ? missing : left;
    allocations.push({ position: stage.position, amount: fromStroops(take) });
    left -= take;
  }
  return allocations;
}

/** Porcentaje recaudado con un decimal, limitado a 100 para la barra de progreso. */
export function fundingProgress(goal: string, raised: string): number {
  const total = toStroops(goal);
  if (total <= 0n) return 0;
  const permille = (toStroops(raised) * 1000n) / total;
  return Math.min(100, Number(permille) / 10);
}

/**
 * Etapa actual para el chip del caso: la que está en curso; si no hay, la primera pendiente;
 * si todas están completas, la última.
 */
export function currentStage<T extends { position: number; status: StageStatus }>(stages: readonly T[]): T | null {
  const ordered = [...stages].sort((a, b) => a.position - b.position);
  return (
    ordered.find((s) => s.status === "en_curso") ??
    ordered.find((s) => s.status === "pendiente") ??
    ordered.at(-1) ??
    null
  );
}
