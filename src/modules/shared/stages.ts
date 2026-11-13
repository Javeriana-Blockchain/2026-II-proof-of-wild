/** Etapas de la línea de tiempo de un caso, en orden. */
export const CASE_STAGES = [
  "ingreso",
  "cuarentena",
  "evaluacion_veterinaria",
  "rehabilitacion",
  "revision_progreso",
  "destino_final",
] as const;

export type CaseStage = (typeof CASE_STAGES)[number];

export function stageIndex(stage: CaseStage): number {
  return CASE_STAGES.indexOf(stage);
}
