import { NextResponse } from "next/server";
import { NotFoundError } from "@/modules/shared/errors";
import { getRecordService } from "@/platform/container";
import { errorResponse } from "../../../../_lib/http";
import { requireNgoActor } from "../../../_lib";

export const dynamic = "force-dynamic";

/** Estado de un gasto o hito enviado; si sigue «enviada», vuelve a leer la red. */
export async function GET(_request: Request, context: { params: Promise<{ kind: string; id: string }> }) {
  try {
    const actor = await requireNgoActor();
    const { kind, id } = await context.params;
    if (kind !== "gasto" && kind !== "hito") throw new NotFoundError("No encontramos ese registro.");
    return NextResponse.json(await getRecordService().refresh(actor, kind, id));
  } catch (error) {
    return errorResponse(error);
  }
}
