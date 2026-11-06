import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sha256Hex } from "@/lib/hash";
import { LocalEvidenceStorage } from "@/platform/storage/local-storage";
import { sanitizeImage } from "@/platform/storage/sanitize-image";
import { signEvidenceUrl, verifyEvidenceSignature } from "@/platform/storage/signed-url";
import { assertAllowedUpload, MAX_UPLOAD_BYTES } from "@/platform/storage/upload-rules";

const SECRET = "x".repeat(40);

/** JPEG con metadatos EXIF, como los que dejan las cámaras y los teléfonos. */
async function jpegWithExif(): Promise<Uint8Array> {
  const buffer = await sharp({
    create: { width: 16, height: 16, channels: 3, background: { r: 200, g: 30, b: 30 } },
  })
    .jpeg()
    .withExif({ IFD0: { Copyright: "dato-privado", Artist: "persona" } })
    .toBuffer();
  return new Uint8Array(buffer);
}

describe("limpieza de imágenes (RN-06, QA-SEG-01)", () => {
  it("la imagen de prueba realmente trae EXIF antes de limpiarla", async () => {
    expect((await sharp(await jpegWithExif()).metadata()).exif).toBeDefined();
  });

  it("elimina el EXIF y conserva la imagen", async () => {
    const cleaned = await sanitizeImage(await jpegWithExif());
    const metadata = await sharp(cleaned).metadata();
    expect(metadata.exif).toBeUndefined();
    expect(metadata.format).toBe("jpeg");
    expect([metadata.width, metadata.height]).toEqual([16, 16]);
    expect(Buffer.from(cleaned).toString("latin1")).not.toContain("dato-privado");
  });
});

describe("reglas de subida", () => {
  it("acepta imágenes y PDF dentro del tamaño máximo", () => {
    expect(() => assertAllowedUpload("image/jpeg", 1000)).not.toThrow();
    expect(() => assertAllowedUpload("application/pdf", MAX_UPLOAD_BYTES)).not.toThrow();
  });

  it("rechaza tipos no permitidos, archivos vacíos y archivos demasiado grandes", () => {
    expect(() => assertAllowedUpload("text/html", 100)).toThrow(RangeError);
    expect(() => assertAllowedUpload("image/png", 0)).toThrow(RangeError);
    expect(() => assertAllowedUpload("image/png", MAX_UPLOAD_BYTES + 1)).toThrow(RangeError);
  });
});

describe("URL firmada de evidencias", () => {
  const now = Date.UTC(2026, 10, 10, 12, 0, 0);
  const parse = (url: string) => {
    const parsed = new URL(url, "http://localhost");
    return {
      key: decodeURIComponent(parsed.pathname.split("/").pop() ?? ""),
      exp: Number(parsed.searchParams.get("exp")),
      sig: parsed.searchParams.get("sig") ?? "",
    };
  };

  it("acepta una firma vigente", () => {
    const { key, exp, sig } = parse(signEvidenceUrl("abc.jpg", 60, SECRET, now));
    expect(verifyEvidenceSignature(key, exp, sig, SECRET, now + 30_000)).toBe(true);
  });

  it("rechaza firmas vencidas, alteradas o con otra clave", () => {
    const { key, exp, sig } = parse(signEvidenceUrl("abc.jpg", 60, SECRET, now));
    expect(verifyEvidenceSignature(key, exp, sig, SECRET, now + 61_000)).toBe(false);
    expect(verifyEvidenceSignature("otro.jpg", exp, sig, SECRET, now)).toBe(false);
    expect(verifyEvidenceSignature(key, exp + 1000, sig, SECRET, now)).toBe(false);
    expect(verifyEvidenceSignature(key, exp, sig, "y".repeat(40), now)).toBe(false);
    expect(verifyEvidenceSignature(key, exp, "no-es-hex", SECRET, now)).toBe(false);
  });
});

describe("almacén local de evidencias", () => {
  let directory: string;
  let storage: LocalEvidenceStorage;

  beforeAll(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "pow-evidence-"));
    storage = new LocalEvidenceStorage(directory, SECRET);
  });
  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("guarda un PDF sin modificarlo y devuelve su SHA-256", async () => {
    const pdf = new TextEncoder().encode("%PDF-1.4 factura de prueba");
    const stored = await storage.save({ data: pdf, contentType: "application/pdf" });
    expect(stored.key).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(stored.sha256).toBe(await sha256Hex(pdf));
    expect(await storage.read(stored.key)).toEqual(pdf);
  });

  it("guarda imágenes sin metadatos y el hash corresponde al archivo ya limpio", async () => {
    const stored = await storage.save({ data: await jpegWithExif(), contentType: "image/jpeg" });
    const onDisk = await storage.read(stored.key);
    expect((await sharp(onDisk).metadata()).exif).toBeUndefined();
    expect(stored.sha256).toBe(await sha256Hex(onDisk));
    expect(stored.sizeBytes).toBe(onDisk.byteLength);
  });

  it("rechaza claves con rutas y tipos no permitidos", async () => {
    await expect(storage.read("../../etc/passwd")).rejects.toThrow(RangeError);
    await expect(
      storage.save({ data: new Uint8Array([1, 2, 3]), contentType: "text/html" }),
    ).rejects.toThrow(RangeError);
  });
});
