import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/app/_lib/session";
import { getContributionService } from "@/platform/container";
import { getDb } from "@/platform/db/client";
import { contributions, personProfiles } from "@/platform/db/schema";
import { requireDonor } from "../../_lib/donante";
import { errorResponse, readJson, withTranslatedMessage } from "../../_lib/http";

export const dynamic = "force-dynamic";
// Espera unos segundos la confirmación de la red antes de responder.
export const maxDuration = 30;

const body = z.object({ signedXdr: z.string().min(10).max(20_000) });

/**
 * RF-APA-02: recibe la transacción firmada por la billetera, guarda una copia, la envía y la confirma leyendo
 * la red. Exige la sesión de una persona (ADR-16); su billetera queda ligada a su perfil (firmar prueba que es suya).
 */
export async function POST(request: Request) {
  try {
    await requireDonor();
    const { signedXdr } = await readJson(request, body);
    const result = await getContributionService().submit(signedXdr);
    await linkWalletToProfile(result.txHash);
    return NextResponse.json(await withTranslatedMessage(result), { status: result.status === "enviada" ? 202 : 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

async function linkWalletToProfile(txHash: string) {
  const session = await getSession();
  if (session?.role !== "persona") return;
  const db = getDb();
  const [row] = await db
    .select({ donor: contributions.donorAccount })
    .from(contributions)
    .where(eq(contributions.txHash, txHash))
    .limit(1);
  if (!row) return;
  await db
    .update(personProfiles)
    .set({ stellarAccount: row.donor, updatedAt: new Date() })
    .where(and(eq(personProfiles.userId, session.userId), isNull(personProfiles.stellarAccount)))
    .catch(() => {
      // Otra cuenta ya tiene esa billetera: no se cambia nada.
    });
}
