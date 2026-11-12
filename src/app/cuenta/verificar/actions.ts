"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/app/_lib/session";
import { DomainError } from "@/modules/shared/errors";
import { getIdentityService } from "@/platform/container";

const score = z.number().min(0).max(1);

const input = z.object({
  documentType: z.enum(["cedula", "pasaporte"]),
  documentNumber: z.string().min(1).max(20),
  consent: z.boolean(),
  evidence: z.discriminatedUnion("method", [
    z.object({
      method: z.literal("biometria"),
      faceMatch: score,
      real: score,
      live: score,
      blinked: z.boolean(),
      turned: z.boolean(),
    }),
    z.object({ method: z.literal("simulada") }),
  ]),
});

export type VerifiedIdentity = {
  documentLast4: string;
  method: "biometria" | "simulada";
  faceMatch: number | null;
  provider: string;
  providerReference: string;
  verifiedAt: string;
};

export type VerifyResult = { ok: true; identity: VerifiedIdentity } | { ok: false; message: string };

/**
 * Verifica la identidad de la persona con la sesión iniciada (ADR-21). Llegan los datos del documento y los
 * puntajes de la biometría hecha en el navegador; nunca las imágenes.
 */
export async function verifyIdentity(raw: unknown): Promise<VerifyResult> {
  const session = await getSession();
  if (session?.role !== "persona") return { ok: false, message: "Ingresa con tu cuenta de persona para verificarte." };
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Los datos de la verificación no son válidos." };
  try {
    // Sin revalidatePath: refrescaría esta página y taparía la celebración del final. El perfil es dinámico.
    const record = await getIdentityService().verify(session.userId, parsed.data);
    return {
      ok: true,
      identity: {
        documentLast4: record.documentLast4,
        method: record.method,
        faceMatch: record.faceMatch,
        provider: record.provider,
        providerReference: record.providerReference,
        verifiedAt: record.verifiedAt.toISOString(),
      },
    };
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, message: error.message };
    console.error(error);
    return { ok: false, message: "Algo falló de nuestro lado. Inténtalo de nuevo." };
  }
}

/** Borra la verificación (derecho de supresión, Ley 1581). La persona vuelve al nivel 1. */
export async function removeIdentity(): Promise<void> {
  const session = await getSession();
  if (session?.role !== "persona") return;
  await getIdentityService().remove(session.userId);
  revalidatePath("/perfil");
  revalidatePath("/cuenta/verificar");
}
