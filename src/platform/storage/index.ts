import { getStorageEnv } from "@/platform/config/env";
import { getDb } from "@/platform/db/client";
import type { EvidenceStorage } from "@/ports/evidence-storage";
import { DbEvidenceStorage } from "./db-storage";
import { LocalEvidenceStorage } from "./local-storage";

/**
 * Crea el almacén de evidencias según EVIDENCE_STORAGE: «db» (por defecto; sirve en Vercel y viaja con la
 * base de datos) o «local» (disco, en EVIDENCE_DIR). Lo usa la raíz de composición.
 */
export function createEvidenceStorage(): EvidenceStorage {
  const env = getStorageEnv();
  return env.EVIDENCE_STORAGE === "local" ? new LocalEvidenceStorage(env.EVIDENCE_DIR) : new DbEvidenceStorage(getDb());
}

export { DbEvidenceStorage } from "./db-storage";
export { EVIDENCE_KEY_PATTERN, LocalEvidenceStorage } from "./local-storage";
export { sanitizeImage } from "./sanitize-image";
export { assertAllowedUpload, MAX_UPLOAD_BYTES } from "./upload-rules";
