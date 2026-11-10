import { NextResponse } from "next/server";
import { getCatalogService } from "@/platform/container";
import { errorResponse } from "../../../_lib/http";

export const dynamic = "force-dynamic";

/** «Tu aporte» por etapa para la billetera conectada: { "1": "40.0000000", "2": "10.0000000" }. */
export async function GET(request: Request, context: { params: Promise<{ codigo: string }> }) {
  try {
    const { codigo } = await context.params;
    const account = new URL(request.url).searchParams.get("cuenta") ?? "";
    return NextResponse.json(await getCatalogService().donorAllocations(codigo, account), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
