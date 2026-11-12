/**
 * Proveedor de verificación de identidad (ADR-21): confirma que el documento existe y corresponde a una persona.
 * En producción sería Truora, Didit o MetaMap (que además revisan la autenticidad del documento y la biometría);
 * en la demo, un registro simulado. Los campos siguen los nombres de SEP-12, el estándar de KYC de Stellar
 * (`id_type`, `id_number`).
 */
export interface IdentityCheckInput {
  /** SEP-12 `id_type`: cédula de ciudadanía (`id_card`) o pasaporte (`passport`). */
  documentType: "cedula" | "pasaporte";
  /** SEP-12 `id_number`, ya normalizado. */
  documentNumber: string;
}

export interface IdentityCheckResult {
  approved: boolean;
  /** Referencia del proveedor para auditar la consulta. */
  reference: string;
  /** Por qué no se aprobó, en palabras para la persona. */
  reason?: string;
}

export interface IdentityProvider {
  /** Nombre que se guarda con la verificación y se muestra en el perfil. */
  readonly name: string;
  check(input: IdentityCheckInput): Promise<IdentityCheckResult>;
}
