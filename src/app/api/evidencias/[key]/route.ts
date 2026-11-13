import { NextResponse } from "next/server";
import { getT } from "@/i18n/servidor";
import { getEvidenceStorage } from "@/platform/container";
import { EVIDENCE_KEY_PATTERN } from "@/platform/storage";

export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

/**
 * Entrega una evidencia publicada: la factura de un gasto o la foto de un hito. Son públicas para que
 * cualquiera compruebe que el archivo tiene el mismo hash que quedó en la red (doble confirmación).
 */
export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  if (!EVIDENCE_KEY_PATTERN.test(key)) return notFound();
  try {
    const data = await getEvidenceStorage().read(key);
    const extension = key.split(".").pop() ?? "";
    return new NextResponse(Buffer.from(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
        // El contenido de una clave nunca cambia: su hash está en la red.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return notFound();
  }
}

async function notFound() {
  const { t } = await getT();
  return NextResponse.json(
    { error: { code: "not_found", message: t("errores.archivo.evidenciaNoEncontrada") } },
    { status: 404 },
  );
}
