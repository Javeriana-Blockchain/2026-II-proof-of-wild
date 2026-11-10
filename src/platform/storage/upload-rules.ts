/** 4 MB: Vercel no acepta cuerpos de más de 4,5 MB en sus funciones. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_TYPES = [...IMAGE_TYPES, "application/pdf"] as const;

export function isImageType(contentType: string): boolean {
  return (IMAGE_TYPES as readonly string[]).includes(contentType);
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function extensionFor(contentType: string): string {
  return EXTENSIONS[contentType] ?? "bin";
}

/** Valida tipo y tamaño de un archivo subido. Lanza RangeError con un mensaje apto para mostrar. */
export function assertAllowedUpload(contentType: string, sizeBytes: number): void {
  if (!(ALLOWED_TYPES as readonly string[]).includes(contentType)) {
    throw new RangeError("Tipo de archivo no permitido. Usa JPG, PNG, WebP o PDF.");
  }
  if (sizeBytes <= 0) {
    throw new RangeError("El archivo está vacío.");
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    throw new RangeError("El archivo supera el tamaño máximo de 4 MB.");
  }
}
