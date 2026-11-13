import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256Hex } from "@/lib/hash";
import type { EvidenceStorage, EvidenceUpload, StoredEvidence } from "@/ports/evidence-storage";
import { sanitizeImage } from "./sanitize-image";
import { assertAllowedUpload, extensionFor, isImageType } from "./upload-rules";

export const EVIDENCE_KEY_PATTERN = /^[0-9a-f-]{36}\.[a-z]{2,4}$/;

/** Almacén en disco para desarrollo y demo. En producción se reemplaza por un adaptador de almacenamiento de objetos. */
export class LocalEvidenceStorage implements EvidenceStorage {
  constructor(private readonly directory: string) {}

  async save(upload: EvidenceUpload): Promise<StoredEvidence> {
    assertAllowedUpload(upload.contentType, upload.data.byteLength);
    const data = isImageType(upload.contentType) ? await sanitizeImage(upload.data) : upload.data;

    const key = `${randomUUID()}.${extensionFor(upload.contentType)}`;
    await mkdir(this.directory, { recursive: true });
    await writeFile(this.resolve(key), data);

    return {
      key,
      sha256: await sha256Hex(data),
      contentType: upload.contentType,
      sizeBytes: data.byteLength,
    };
  }

  async read(key: string): Promise<Uint8Array> {
    return new Uint8Array(await readFile(this.resolve(key)));
  }

  publicUrl(key: string): string {
    if (!EVIDENCE_KEY_PATTERN.test(key)) throw new RangeError("Clave de evidencia inválida.");
    return `/api/evidencias/${key}`;
  }

  /** Solo acepta claves generadas por este almacén; evita rutas como ../../etc. */
  private resolve(key: string): string {
    if (!EVIDENCE_KEY_PATTERN.test(key)) throw new RangeError("Clave de evidencia inválida.");
    return path.join(this.directory, key);
  }
}
