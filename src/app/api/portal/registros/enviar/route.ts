import { NextResponse } from "next/server";
import { z } from "zod";
import { getRecordService } from "@/platform/container";
import { errorResponse, readJson } from "../../../_lib/http";
import { requireNgoActor } from "../../_lib";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const body = z.object({
  kind: z.enum(["gasto", "hito"]),
  id: z.string().min(1).max(64),
  signedXdr: z.string().min(10).max(20_000),
});

/** Recibe el gasto o el hito firmado por la billetera de la ONG, lo envía y lo confirma leyendo la red. */
export async function POST(request: Request) {
  try {
    const actor = await requireNgoActor();
    const { kind, id, signedXdr } = await readJson(request, body);
    const result = await getRecordService().submit(actor, kind, id, signedXdr);
    return NextResponse.json(result, { status: result.status === "enviada" ? 202 : 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
