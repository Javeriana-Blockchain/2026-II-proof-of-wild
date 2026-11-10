"use server";

import { z } from "zod";
import { getSession } from "@/app/_lib/session";
import { getDb } from "@/platform/db/client";
import { AlreadyEnrolledError, enroll, VolunteeringFullError } from "@/platform/db/repositories/volunteering";

const schema = z.object({
  volunteeringId: z.uuid(),
  fullName: z.string().trim().min(3, "Escribe tu nombre completo.").max(120),
  email: z.email("El correo no es válido.").max(200),
  phone: z.string().trim().regex(/^[+0-9 ()-]{7,20}$/, "Escribe un teléfono válido, por ejemplo +57 300 000 0000."),
  availability: z.enum(["toda_la_jornada", "manana", "tarde"]),
  consent: z.boolean().refine((v) => v, "Autoriza el uso de tus datos para gestionar la inscripción."),
});

export type EnrollmentInput = z.input<typeof schema>;

/** Inscripción a un voluntariado (ventana D). Con sesión de persona, queda ligada a su cuenta y aparece en su perfil. */
export async function submitEnrollment(input: EnrollmentInput): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  const session = await getSession();
  const { consent: _, ...data } = parsed.data;
  try {
    await enroll(getDb(), { ...data, userId: session?.role === "persona" ? session.userId : null });
    return { ok: true };
  } catch (error) {
    if (error instanceof VolunteeringFullError || error instanceof AlreadyEnrolledError || error instanceof RangeError) {
      return { ok: false, message: error.message };
    }
    console.error(error);
    return { ok: false, message: "No pudimos enviar la inscripción. Inténtalo de nuevo." };
  }
}
