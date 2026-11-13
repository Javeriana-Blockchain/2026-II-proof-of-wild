import { isSha256Hex } from "@/lib/hash";

/** Un memo de texto de Stellar admite hasta 28 bytes (CON-02). */
export const MEMO_TEXT_MAX_BYTES = 28;

const CASE_CODE = /^POW-\d{3,6}$/;

/** Valida que el código del caso sirva como memo de texto y lo devuelve sin cambios. */
export function assertCaseCodeMemo(caseCode: string): string {
  if (!CASE_CODE.test(caseCode)) {
    throw new RangeError(`Código de caso inválido: "${caseCode}". Formato esperado: POW-001.`);
  }
  if (new TextEncoder().encode(caseCode).length > MEMO_TEXT_MAX_BYTES) {
    throw new RangeError(`El código de caso supera ${MEMO_TEXT_MAX_BYTES} bytes.`);
  }
  return caseCode;
}

export function assertEvidenceHash(hashHex: string): string {
  if (!isSha256Hex(hashHex)) {
    throw new RangeError("El hash de evidencia debe ser SHA-256 en hexadecimal minúscula (64 caracteres).");
  }
  return hashHex;
}

/** Horizon entrega los memos de tipo hash en base64; los guardamos en hexadecimal. */
export function base64ToHex(base64: string): string {
  return Buffer.from(base64, "base64").toString("hex");
}
