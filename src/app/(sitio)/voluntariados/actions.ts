"use server";

import { z } from "zod";
import { getSession } from "@/app/_lib/session";
import { traducirError } from "@/i18n/errores";
import { getT } from "@/i18n/servidor";
import type { Traductor } from "@/i18n/traductor";
import { getDb } from "@/platform/db/client";
import { AlreadyEnrolledError, enroll, VolunteeringFullError } from "@/platform/db/repositories/volunteering";

/** Esquema con los mensajes en el idioma de la petición. */
const esquema = (t: Traductor["t"]) =>
  z.object({
    volunteeringId: z.uuid(),
    fullName: z.string().trim().min(3, t("ong.inscripcion.error.nombre")).max(120),
    email: z.email(t("ong.inscripcion.error.correo")).max(200),
    phone: z.string().trim().regex(/^[+0-9 ()-]{7,20}$/, t("ong.inscripcion.error.telefono")),
    availability: z.enum(["toda_la_jornada", "manana", "tarde"]),
    consent: z.boolean().refine((v) => v, t("ong.inscripcion.error.consentimiento")),
  });

export type EnrollmentInput = z.input<ReturnType<typeof esquema>>;

/** Inscripción a un voluntariado (ventana D). Con sesión de persona, queda ligada a su cuenta y aparece en su perfil. */
export async function submitEnrollment(input: EnrollmentInput): Promise<{ ok: true } | { ok: false; message: string }> {
  const { t } = await getT();
  const parsed = esquema(t).safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? t("ong.inscripcion.error.revisa") };
  const session = await getSession();
  const { consent: _, ...data } = parsed.data;
  try {
    await enroll(getDb(), { ...data, userId: session?.role === "persona" ? session.userId : null });
    return { ok: true };
  } catch (error) {
    if (error instanceof VolunteeringFullError || error instanceof AlreadyEnrolledError || error instanceof RangeError) {
      return { ok: false, message: traducirError(error.message, t) };
    }
    console.error(error);
    return { ok: false, message: t("ong.inscripcion.error.generico") };
  }
}
