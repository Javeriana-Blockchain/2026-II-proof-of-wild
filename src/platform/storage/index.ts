import { getSessionEnv, getStorageEnv } from "@/platform/config/env";
import { LocalEvidenceStorage } from "./local-storage";

/** Crea el almacén de evidencias con la configuración del entorno. Lo usa la raíz de composición. */
export function createEvidenceStorage(): LocalEvidenceStorage {
  return new LocalEvidenceStorage(getStorageEnv().EVIDENCE_DIR, getSessionEnv().SESSION_SECRET);
}

export { LocalEvidenceStorage } from "./local-storage";
export { sanitizeImage } from "./sanitize-image";
export { signEvidenceUrl, verifyEvidenceSignature } from "./signed-url";
export { assertAllowedUpload, MAX_UPLOAD_BYTES } from "./upload-rules";
