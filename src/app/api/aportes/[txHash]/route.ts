import { NextResponse } from "next/server";
import { getContributionService } from "@/platform/container";
import { errorResponse, withTranslatedMessage } from "../../_lib/http";

export const dynamic = "force-dynamic";

/** Estado de un aporte enviado: «enviada», «confirmada» o «fallida». Si sigue enviada, vuelve a leer la red. */
export async function GET(_request: Request, context: { params: Promise<{ txHash: string }> }) {
  try {
    const { txHash } = await context.params;
    const result = await getContributionService().refresh(txHash.toLowerCase());
    return NextResponse.json(await withTranslatedMessage(result));
  } catch (error) {
    return errorResponse(error);
  }
}
