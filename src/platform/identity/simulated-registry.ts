import { randomBytes } from "node:crypto";
import type { IdentityCheckInput, IdentityCheckResult, IdentityProvider } from "@/ports/identity-provider";

/**
 * Registro de identidad simulado para la demo (ADR-21). Hace como si consultara la Registraduría (o el registro
 * de pasaportes): espera un momento y aprueba cualquier documento con formato válido, salvo los que terminan en
 * 0000, que «no aparecen», para poder mostrar el rechazo. En producción se reemplaza por el adaptador de un
 * proveedor real (Truora, Didit, MetaMap) que implementa el mismo puerto.
 */
export class SimulatedIdentityRegistry implements IdentityProvider {
  readonly name = "Registro simulado (demo)";

  constructor(private readonly delayMs = 1200) {}

  async check(input: IdentityCheckInput): Promise<IdentityCheckResult> {
    if (this.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    const reference = `SIM-${randomBytes(4).toString("hex").toUpperCase()}`;
    if (input.documentNumber.endsWith("0000")) {
      const where = input.documentType === "cedula" ? "la Registraduría" : "el registro de pasaportes";
      return { approved: false, reference, reason: `El documento no aparece en ${where} (simulado).` };
    }
    return { approved: true, reference };
  }
}
