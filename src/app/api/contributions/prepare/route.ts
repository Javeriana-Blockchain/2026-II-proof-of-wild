import { NextResponse } from "next/server";
import { z } from "zod";
import { getContributionService } from "@/platform/container";
import { errorResponse, readJson } from "../../_lib/http";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  caseCode: z.string().min(1).max(28),
  donorAccount: z.string().min(1).max(56),
  amount: z.string().min(1).max(30),
});

/** RF-APA-01: devuelve la transacción de aporte sin firmar para que la firme la billetera del donante. */
export async function POST(request: Request) {
  try {
    const body = await readJson(request, bodySchema);
    return NextResponse.json(await getContributionService().prepare(body));
  } catch (error) {
    return errorResponse(error);
  }
}
