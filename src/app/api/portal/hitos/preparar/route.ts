import { NextResponse } from "next/server";
import { getRecordService } from "@/platform/container";
import { errorResponse } from "../../../_lib/http";
import { file, readForm, requireNgoActor, text } from "../../_lib";

export const dynamic = "force-dynamic";

/** Ventana B: guarda la foto (sin metadatos) y arma registrar_hito con su hash para que lo firme la ONG. */
export async function POST(request: Request) {
  try {
    const actor = await requireNgoActor();
    const form = await readForm(request);
    const prepared = await getRecordService().prepareMilestone(actor, {
      caseCode: text(form, "caseCode"),
      stage: Number(text(form, "stage")),
      occurredOn: text(form, "occurredOn"),
      description: text(form, "description"),
      photo: await file(form, "photo"),
    });
    return NextResponse.json(prepared);
  } catch (error) {
    return errorResponse(error);
  }
}
