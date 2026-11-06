import { PermissionError, SeparationOfDutiesError } from "./errors";

export type Role = "center" | "validator" | "admin";

/** Persona autenticada que ejecuta una operación del portal. */
export interface Actor {
  userId: string;
  role: Role;
  centerId: string | null;
  /** Cuenta Stellar con la que firma anclajes o validaciones. */
  stellarAccount: string | null;
}

export function requireRole(actor: Actor, ...roles: Role[]): void {
  if (!roles.includes(actor.role)) {
    throw new PermissionError("No tienes permiso para realizar esta operación.");
  }
}

/**
 * Regla común a gastos e hitos (RN-02, QA-SEG-02): solo un validador del mismo centro puede validar,
 * y nunca quien registró el elemento.
 */
export function assertCanValidate(
  actor: Actor,
  record: { registeredBy: string; centerId: string },
): void {
  requireRole(actor, "validator");
  if (actor.centerId !== record.centerId) {
    throw new PermissionError("El validador no pertenece al centro de este caso.");
  }
  if (actor.userId === record.registeredBy) {
    throw new SeparationOfDutiesError("Quien registra un elemento no puede validarlo.");
  }
}
