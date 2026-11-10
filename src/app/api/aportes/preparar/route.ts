import { NextResponse } from "next/server";
import { z } from "zod";
import { getContributionService } from "@/platform/container";
import { errorResponse, readJson } from "../../_lib/http";

export const dynamic = "force-dynamic";

const body = z.object({
  caseCode: z.string().min(1).max(32),
  donorAccount: z.string().min(1).max(56),
  amount: z.string().min(1).max(30),
});

/** RF-APA-01: transacción `aportar` sin firmar y el reparto previsto, para mostrarlo antes de firmar. */
export async function POST(request: Request) {
  try {
    return NextResponse.json(await getContributionService().prepare(await readJson(request, body)));
  } catch (error) {
    return errorResponse(error);
  }
}
