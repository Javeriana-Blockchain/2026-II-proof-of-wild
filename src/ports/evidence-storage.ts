export interface StoredEvidence {
  /** Clave opaca del archivo en el almacén privado. */
  key: string;
  /** SHA-256 del archivo tal como quedó guardado (ya sin metadatos). Es el hash que se ancla en la red. */
  sha256: string;
  contentType: string;
  sizeBytes: number;
}

export interface EvidenceUpload {
  data: Uint8Array;
  contentType: string;
}

/**
 * Puerto del almacén privado de evidencias (ADR-07). Los soportes nunca se sirven de forma pública:
 * se entregan solo por URL firmada de vida corta a personas autorizadas.
 */
export interface EvidenceStorage {
  /**
   * Valida y guarda el archivo. Las imágenes se re-codifican para eliminar los metadatos (EXIF con GPS),
   * así que el hash devuelto corresponde al archivo ya limpio (RN-06).
   */
  save(upload: EvidenceUpload): Promise<StoredEvidence>;
  read(key: string): Promise<Uint8Array>;
  /** URL relativa firmada que expira en `ttlSeconds`. */
  signedUrl(key: string, ttlSeconds: number): string;
}
