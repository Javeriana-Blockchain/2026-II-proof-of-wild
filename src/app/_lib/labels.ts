import type { ExpenseCategory } from "@/modules/expenses";
import type { CaseStage } from "@/modules/shared/stages";

export const STAGE_LABELS: Record<CaseStage, string> = {
  ingreso: "Ingreso",
  cuarentena: "Cuarentena",
  evaluacion_veterinaria: "Evaluación veterinaria",
  rehabilitacion: "Rehabilitación",
  revision_progreso: "Revisión de progreso",
  destino_final: "Destino final",
};

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  alimentacion: "Alimentación",
  atencion_veterinaria: "Atención veterinaria",
  medicamentos: "Medicamentos",
  rehabilitacion: "Rehabilitación",
  destino_final: "Preparación para el destino final",
};

/** Activo que se muestra en las páginas públicas de lectura (que no consultan la red ni su configuración). */
export const DISPLAY_ASSET = "USDC";
