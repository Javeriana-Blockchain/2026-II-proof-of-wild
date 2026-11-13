import { PermissionError } from "./errors";

export type Role = "persona" | "ong" | "admin";

/** Usuario autenticado que ejecuta una operación. */
export interface Actor {
  userId: string;
  role: Role;
  /** ONG del usuario, si tiene una aprobada. */
  ngoId: string | null;
  /** Cuenta Stellar con la que firma (billetera de la persona o cuenta de la ONG). */
  stellarAccount: string | null;
}

export function requireRole(actor: Actor, ...roles: Role[]): void {
  if (!roles.includes(actor.role)) {
    throw new PermissionError("No tienes permiso para realizar esta operación.");
  }
}

/** Solo la ONG dueña del caso puede registrar sus gastos e hitos (como exige el contrato con require_auth). */
export function assertNgoOwns(actor: Actor, caseNgoId: string): void {
  requireRole(actor, "ong");
  if (actor.ngoId !== caseNgoId) {
    throw new PermissionError("Solo la ONG del caso puede registrar sus gastos e hitos.");
  }
}
