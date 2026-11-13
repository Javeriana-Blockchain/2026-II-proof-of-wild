import { toStroops } from "@/lib/amount";
import { ValidationError } from "@/modules/shared/errors";

/**
 * Verificación de identidad por niveles (ADR-21), basada en riesgo:
 * - Nivel 1: cuenta de persona. Basta para aportes pequeños.
 * - Nivel 2: identidad verificada (documento, prueba de vida y comparación del rostro). Se pide para aportes grandes.
 * La biometría es opcional mientras el aporte no supere el límite, así nadie queda obligado a entregar datos
 * sensibles para participar (Ley 1581 de 2012, Decreto 1377 de 2013).
 */
export type IdentityLevel = 1 | 2;
export type DocumentType = "cedula" | "pasaporte";
export type VerificationMethod = "biometria" | "simulada";

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  cedula: "Cédula de ciudadanía",
  pasaporte: "Pasaporte",
};

/** Aportes de hasta este monto (USDC) solo piden la cuenta; por encima, identidad verificada. */
export const UNVERIFIED_LIMIT = "50";

/** Umbrales de la biometría (0 a 1). La comparación de rostros de `human` considera coincidencia desde 0,5. */
export const BIOMETRIC_THRESHOLDS = { faceMatch: 0.5, real: 0.5, live: 0.5 } as const;

/** Nivel que exige un aporte. Un monto que no se puede leer cae al nivel 1: lo rechaza luego la validación del aporte. */
export function requiredLevel(amount: string): IdentityLevel {
  try {
    return toStroops(amount.trim().replace(",", ".")) > toStroops(UNVERIFIED_LIMIT) ? 2 : 1;
  } catch {
    return 1;
  }
}

/** Quita espacios, puntos y guiones y comprueba el formato del documento. */
export function normalizeDocumentNumber(type: DocumentType, raw: string): string {
  const value = raw.replace(/[\s.\-]/g, "").toUpperCase();
  if (type === "cedula") {
    if (!/^\d{6,10}$/.test(value)) throw new ValidationError("La cédula debe tener entre 6 y 10 dígitos.");
    return value;
  }
  if (!/^[A-Z0-9]{6,9}$/.test(value)) throw new ValidationError("El pasaporte debe tener entre 6 y 9 letras o números.");
  return value;
}

/** Lo que reporta la verificación biométrica. Con el método `simulada` (respaldo de la demo) no hay mediciones. */
export interface BiometricEvidence {
  method: VerificationMethod;
  /** Parecido entre el rostro del documento y el de la cámara (0 a 1). */
  faceMatch?: number;
  /** Probabilidad de que el rostro sea real y no una foto o una pantalla (0 a 1). */
  real?: number;
  /** Probabilidad de que el rostro esté vivo (0 a 1). */
  live?: number;
  /** Retos de la prueba de vida cumplidos. */
  blinked?: boolean;
  turned?: boolean;
}

/** Comprueba que la biometría alcance los umbrales; explica qué faltó. */
export function checkBiometrics(evidence: BiometricEvidence): void {
  if (evidence.method === "simulada") return;
  const { faceMatch = 0, real = 0, live = 0, blinked = false, turned = false } = evidence;
  if (!blinked || !turned) throw new ValidationError("Falta completar la prueba de vida: parpadear y girar la cabeza.");
  if (real < BIOMETRIC_THRESHOLDS.real || live < BIOMETRIC_THRESHOLDS.live) {
    throw new ValidationError("No pudimos confirmar que el rostro sea real. Usa tu cámara sin fotos ni pantallas delante.");
  }
  if (faceMatch < BIOMETRIC_THRESHOLDS.faceMatch) {
    throw new ValidationError("Tu rostro no coincide con la foto del documento. Inténtalo con más luz.");
  }
}

/** Últimos 4 caracteres del documento: lo único que se muestra o se guarda en claro. */
export function documentTail(number: string): string {
  return number.slice(-4);
}
