import { getStorageEnv } from "@/platform/config/env";
import { LocalEvidenceStorage } from "./local-storage";

/** Crea el almacén de evidencias con la configuración del entorno. Lo usa la raíz de composición. */
export function createEvidenceStorage(): LocalEvidenceStorage {
  return new LocalEvidenceStorage(getStorageEnv().EVIDENCE_DIR);
}

export { EVIDENCE_KEY_PATTERN, LocalEvidenceStorage } from "./local-storage";
export { sanitizeImage } from "./sanitize-image";
export { assertAllowedUpload, MAX_UPLOAD_BYTES } from "./upload-rules";
