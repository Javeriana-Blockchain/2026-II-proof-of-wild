import { NextResponse } from "next/server";
import { getSessionEnv } from "@/platform/config/env";
import { getEvidenceStorage } from "@/platform/container";
import { verifyEvidenceSignature } from "@/platform/storage";

export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

/** Entrega un soporte privado solo con una URL firmada y vigente (ADR-07). */
export async function GET(request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  const url = new URL(request.url);
  const expiresAt = Number(url.searchParams.get("exp"));
  const signature = url.searchParams.get("sig") ?? "";

  if (!verifyEvidenceSignature(key, expiresAt, signature, getSessionEnv().SESSION_SECRET)) {
    return NextResponse.json({ error: { code: "forbidden", message: "Enlace inválido o vencido." } }, { status: 403 });
  }

  try {
    const data = await getEvidenceStorage().read(key);
    const extension = key.split(".").pop() ?? "";
    return new NextResponse(Buffer.from(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: { code: "not_found", message: "Evidencia no encontrada." } }, { status: 404 });
  }
}
