import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getJobsEnv } from "@/platform/config/env";
import { getContributionService } from "@/platform/container";
import { errorResponse } from "../../_lib/http";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const expected = Buffer.from(`Bearer ${getJobsEnv().CRON_SECRET}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Reintenta los aportes pendientes de confirmación (ADR-04). La llama la tarea programada. */
export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: { code: "unauthorized", message: "No autorizado." } }, { status: 401 });
    }
    return NextResponse.json(await getContributionService().reconcile());
  } catch (error) {
    return errorResponse(error);
  }
}
