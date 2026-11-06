import { createHmac, timingSafeEqual } from "node:crypto";

function signature(key: string, expiresAt: number, secret: string): string {
  return createHmac("sha256", secret).update(`${key}.${expiresAt}`).digest("hex");
}

/** Devuelve la ruta relativa de descarga con expiración y firma HMAC. */
export function signEvidenceUrl(key: string, ttlSeconds: number, secret: string, now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + ttlSeconds;
  const params = new URLSearchParams({ exp: String(expiresAt), sig: signature(key, expiresAt, secret) });
  return `/api/evidence/${encodeURIComponent(key)}?${params.toString()}`;
}

/** Comprueba firma y vigencia en tiempo constante. */
export function verifyEvidenceSignature(
  key: string,
  expiresAt: number,
  sig: string,
  secret: string,
  now = Date.now(),
): boolean {
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(now / 1000)) return false;
  const expected = Buffer.from(signature(key, expiresAt, secret), "hex");
  const received = Buffer.from(sig, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}
