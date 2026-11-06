import { fromStroops, toStroops } from "@/lib/amount";
import type { CaseStage } from "../shared/stages";

export type FinalDestination = "liberacion" | "reubicacion" | "santuario" | "fallecimiento";

/** Caso tal como vive en el sistema (modelo interno; nunca se serializa directamente a la API pública). */
export interface CaseRecord {
  id: string;
  code: string;
  centerId: string;
  species: string;
  speciesPublic: boolean;
  intakeDate: string;
  initialState: string;
  goalAmount: string;
  currentStage: CaseStage;
  finalDestination: FinalDestination | null;
}

/** Proyección pública de un caso (ADR-07, QA-SEG-01): solo los campos que pueden verse sin iniciar sesión. */
export interface PublicCase {
  code: string;
  /** Nulo cuando no es seguro divulgar la especie (RN-05). */
  species: string | null;
  centerName: string;
  stage: CaseStage;
  intakeDate: string;
  goalAmount: string;
  raisedAmount: string;
  progressPercent: number;
  finalDestination: FinalDestinationPresentation | null;
}

export interface FinalDestinationPresentation {
  destination: FinalDestination;
  label: string;
  /** Liberación, reubicación y santuario son destinos legítimos, no un fracaso (RN-09). */
  legitimate: boolean;
}

const DESTINATION_LABELS: Record<FinalDestination, { label: string; legitimate: boolean }> = {
  liberacion: { label: "Liberación a su hábitat", legitimate: true },
  reubicacion: { label: "Reubicación", legitimate: true },
  santuario: { label: "Cuidado de por vida en un santuario", legitimate: true },
  fallecimiento: { label: "Falleció durante su recuperación", legitimate: false },
};

export function presentFinalDestination(destination: FinalDestination): FinalDestinationPresentation {
  return { destination, ...DESTINATION_LABELS[destination] };
}

const CASE_CODE = /^POW-\d{3,6}$/;

export function isValidCaseCode(code: string): boolean {
  return CASE_CODE.test(code);
}

/** Porcentaje recaudado con un decimal, limitado a 100 para la barra de progreso. */
export function fundingProgress(goalAmount: string, raisedAmount: string): number {
  const goal = toStroops(goalAmount);
  if (goal <= 0n) return 0;
  const permille = (toStroops(raisedAmount) * 1000n) / goal;
  return Math.min(100, Number(permille) / 10);
}

export function toPublicCase(record: CaseRecord, raisedAmount: string, centerName: string): PublicCase {
  return {
    code: record.code,
    species: record.speciesPublic ? record.species : null,
    centerName,
    stage: record.currentStage,
    intakeDate: record.intakeDate,
    goalAmount: fromStroops(toStroops(record.goalAmount)),
    raisedAmount: fromStroops(toStroops(raisedAmount)),
    progressPercent: fundingProgress(record.goalAmount, raisedAmount),
    finalDestination: record.finalDestination ? presentFinalDestination(record.finalDestination) : null,
  };
}
