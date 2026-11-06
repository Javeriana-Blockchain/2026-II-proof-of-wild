import { NextResponse } from "next/server";
import { z } from "zod";
import { getContributionService } from "@/platform/container";
import { errorResponse, readJson } from "../../_lib/http";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  caseCode: z.string().min(1).max(28),
  txHash: z.string().length(64),
});

/**
 * RF-APA-02: confirma el aporte leyendo la transacción en la red (RN-03).
 * 200 si quedó confirmado; 202 si la red aún no la muestra y quedó pendiente; 422 si no cumple.
 */
export async function POST(request: Request) {
  try {
    const body = await readJson(request, bodySchema);
    const result = await getContributionService().confirm(body);
    if (result.status === "pending") {
      return NextResponse.json({ status: "pending" }, { status: 202 });
    }
    return NextResponse.json({ status: "confirmed", txHash: result.contribution.txHash });
  } catch (error) {
    return errorResponse(error);
  }
}
