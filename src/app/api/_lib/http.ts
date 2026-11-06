import { NextResponse } from "next/server";
import { z } from "zod";
import { DomainError, ValidationError } from "@/modules/shared/errors";

const STATUS_BY_CODE: Record<string, number> = {
  validation: 400,
  forbidden: 403,
  not_found: 404,
  invalid_transition: 409,
  contribution_rejected: 422,
  not_supported: 501,
};

/** Lee y valida el cuerpo JSON de una petición con un esquema zod. */
export async function readJson<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("El cuerpo de la petición debe ser JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".") || "cuerpo"))];
    throw new ValidationError(`Los datos enviados no son válidos. Revisa: ${fields.join(", ")}.`);
  }
  return parsed.data;
}

/** Traduce errores de dominio a respuestas HTTP. Los errores inesperados no filtran detalles internos. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof DomainError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: STATUS_BY_CODE[error.code] ?? 400 },
    );
  }
  console.error(error);
  return NextResponse.json({ error: { code: "internal", message: "Error interno." } }, { status: 500 });
}
