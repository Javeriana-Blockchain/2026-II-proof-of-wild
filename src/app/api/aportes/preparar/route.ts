import { NextResponse } from "next/server";
import { z } from "zod";
import { getContributionService, getIdentityService } from "@/platform/container";
import { requireDonor } from "../../_lib/donante";
import { errorResponse, readJson } from "../../_lib/http";

export const dynamic = "force-dynamic";

const body = z.object({
  caseCode: z.string().min(1).max(32),
  donorAccount: z.string().min(1).max(56),
  amount: z.string().min(1).max(30),
});

/**
 * RF-APA-01: transacción `aportar` sin firmar y el reparto previsto, para mostrarlo antes de firmar. Solo para una
 * persona con la sesión iniciada (ADR-16); un aporte por encima del límite exige identidad verificada (ADR-21).
 */
export async function POST(request: Request) {
  try {
    const donor = await requireDonor();
    const input = await readJson(request, body);
    await getIdentityService().assertCanContribute(donor.userId, input.amount);
    return NextResponse.json(await getContributionService().prepare(input));
  } catch (error) {
    return errorResponse(error);
  }
}
