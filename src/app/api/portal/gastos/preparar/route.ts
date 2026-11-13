import { NextResponse } from "next/server";
import { z } from "zod";
import { ValidationError } from "@/modules/shared/errors";
import { getRecordService } from "@/platform/container";
import { errorResponse } from "../../../_lib/http";
import { file, readForm, requireNgoActor, text } from "../../_lib";

export const dynamic = "force-dynamic";

const CATEGORY = z.enum(["alimentacion", "atencion_veterinaria", "medicamentos", "rehabilitacion", "traslado_liberacion"]);

/** Ventana C: guarda la factura (sin datos de terceros) y arma registrar_gasto para que lo firme la ONG. */
export async function POST(request: Request) {
  try {
    const actor = await requireNgoActor();
    const form = await readForm(request);
    const category = CATEGORY.safeParse(text(form, "category"));
    if (!category.success) throw new ValidationError("Elige la categoría del gasto.");
    const prepared = await getRecordService().prepareExpense(actor, {
      caseCode: text(form, "caseCode"),
      stage: Number(text(form, "stage")),
      providerId: text(form, "providerId"),
      amount: text(form, "amount"),
      category: category.data,
      occurredOn: text(form, "occurredOn"),
      invoiceNumber: text(form, "invoiceNumber"),
      concept: text(form, "concept"),
      invoice: await file(form, "invoice"),
    });
    return NextResponse.json(prepared);
  } catch (error) {
    return errorResponse(error);
  }
}
