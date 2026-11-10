import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { sha256Hex } from "@/lib/hash";
import type { EvidenceStorage, EvidenceUpload, StoredEvidence } from "@/ports/evidence-storage";
import type { Db } from "@/platform/db/client";
import { evidenceFiles } from "@/platform/db/schema";
import { EVIDENCE_KEY_PATTERN } from "./local-storage";
import { sanitizeImage } from "./sanitize-image";
import { assertAllowedUpload, extensionFor, isImageType } from "./upload-rules";

/**
 * Almacén de evidencias en PostgreSQL. Sirve en servidores sin disco persistente (Vercel) y viaja con la
 * base de datos: al copiar la base de la demo se copian también sus facturas. Para el MVP basta; con más
 * volumen se reemplaza por un almacén de objetos sin tocar el dominio (mismo puerto).
 */
export class DbEvidenceStorage implements EvidenceStorage {
  constructor(private readonly db: Db) {}

  async save(upload: EvidenceUpload): Promise<StoredEvidence> {
    assertAllowedUpload(upload.contentType, upload.data.byteLength);
    const data = isImageType(upload.contentType) ? await sanitizeImage(upload.data) : upload.data;
    const stored: StoredEvidence = {
      key: `${randomUUID()}.${extensionFor(upload.contentType)}`,
      sha256: await sha256Hex(data),
      contentType: upload.contentType,
      sizeBytes: data.byteLength,
    };
    await this.db.insert(evidenceFiles).values({ ...stored, data: Buffer.from(data) });
    return stored;
  }

  async read(key: string): Promise<Uint8Array> {
    if (!EVIDENCE_KEY_PATTERN.test(key)) throw new RangeError("Clave de evidencia inválida.");
    const [row] = await this.db.select({ data: evidenceFiles.data }).from(evidenceFiles).where(eq(evidenceFiles.key, key));
    if (!row) throw new RangeError("Evidencia no encontrada.");
    return new Uint8Array(row.data);
  }

  publicUrl(key: string): string {
    if (!EVIDENCE_KEY_PATTERN.test(key)) throw new RangeError("Clave de evidencia inválida.");
    return `/api/evidencias/${key}`;
  }
}
