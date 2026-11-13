import sharp from "sharp";

/**
 * Re-codifica una imagen para eliminar todos sus metadatos (EXIF, incluido el GPS) conservando la orientación
 * visual (RN-06, RN-07). Por defecto sharp no copia metadatos al resultado; `rotate()` aplica la orientación
 * EXIF a los píxeles antes de descartarla.
 */
export async function sanitizeImage(data: Uint8Array): Promise<Uint8Array> {
  const cleaned = await sharp(data).rotate().toBuffer();
  return new Uint8Array(cleaned);
}
