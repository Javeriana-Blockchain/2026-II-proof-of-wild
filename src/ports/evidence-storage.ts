export interface StoredEvidence {
  /** Clave opaca del archivo en el almacén. */
  key: string;
  /** SHA-256 del archivo tal como quedó guardado (ya sin metadatos). Es el hash que queda en la red. */
  sha256: string;
  contentType: string;
  sizeBytes: number;
}

export interface EvidenceUpload {
  data: Uint8Array;
  contentType: string;
}

/**
 * Puerto del almacén de evidencias. Las facturas (con los datos de terceros tapados) y las fotos de los hitos
 * se publican: así cualquiera puede comprobar que el archivo publicado tiene el mismo hash que quedó en la red
 * (doble confirmación). Los informes veterinarios completos no se suben aquí (RN-08).
 */
export interface EvidenceStorage {
  /**
   * Valida y guarda el archivo. Las imágenes se re-codifican para eliminar los metadatos (EXIF con GPS),
   * así que el hash devuelto corresponde al archivo ya limpio (RN-06).
   */
  save(upload: EvidenceUpload): Promise<StoredEvidence>;
  read(key: string): Promise<Uint8Array>;
  /** Ruta pública relativa del archivo. */
  publicUrl(key: string): string;
}
