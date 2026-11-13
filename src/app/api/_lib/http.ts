import { NextResponse } from "next/server";
import { z } from "zod";
import { traducirError } from "@/i18n/errores";
import { getT } from "@/i18n/servidor";
import { DomainError, ValidationError } from "@/modules/shared/errors";

const STATUS_BY_CODE: Record<string, number> = {
  validation: 400,
  auth_required: 401,
  forbidden: 403,
  verification_required: 403,
  not_found: 404,
  invalid_transition: 409,
  contribution_rejected: 422,
  identity_rejected: 422,
  not_supported: 501,
};

/** Mensaje de un cuerpo que no cumple el esquema, salvo que el esquema traiga el suyo. */
const INVALID_DATA = "Los datos enviados no son válidos.";

/**
 * Lee y valida el cuerpo JSON de una petición con un esquema zod. Los errores salen en español, como los del
 * dominio, y `errorResponse` los traduce. Los mensajes por defecto de zod (en inglés y técnicos) se cambian por
 * uno genérico; un mensaje propio del esquema tiene prioridad.
 */
export async function readJson<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("El cuerpo de la petición debe ser JSON.");
  }
  const parsed = schema.safeParse(body, { error: () => INVALID_DATA });
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? INVALID_DATA);
  }
  return parsed.data;
}

/**
 * Traduce errores de dominio a respuestas HTTP, con el mensaje en el idioma de la persona (el proxy lo toma de su
 * cookie). Los errores inesperados no filtran detalles internos.
 */
export async function errorResponse(error: unknown): Promise<NextResponse> {
  if (!(error instanceof DomainError)) console.error(error);
  const { t } = await getT();
  if (error instanceof DomainError) {
    return NextResponse.json(
      { error: { code: error.code, message: traducirError(error.message, t) } },
      { status: STATUS_BY_CODE[error.code] ?? 400 },
    );
  }
  return NextResponse.json({ error: { code: "internal", message: t("errores.api.interno") } }, { status: 500 });
}

/** Traduce el `message` de un resultado: el motivo de un aporte fallido lo guardó el dominio en español. */
export async function withTranslatedMessage<T extends { message?: string }>(result: T): Promise<T> {
  if (!result.message) return result;
  const { t } = await getT();
  return { ...result, message: traducirError(result.message, t) };
}
