"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/app/_lib/session";
import { getT } from "@/i18n/servidor";
import type { Traductor } from "@/i18n/traductor";
import { getDb } from "@/platform/db/client";
import { personProfiles } from "@/platform/db/schema";

const INTERESES = ["aves", "mamiferos", "reptiles"] as const;

/** El esquema con los mensajes en el idioma de la petición. */
const esquema = (t: Traductor["t"]) =>
  z.object({
    fullName: z.string().trim().min(3, t("cuenta.perfil.error.nombre")).max(120),
    alias: z.string().trim().min(2, t("cuenta.perfil.error.alias")).max(40),
    city: z.string().trim().min(2, t("cuenta.perfil.error.ciudad")).max(80),
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^[+0-9 ()-]*$/, t("cuenta.perfil.error.telefono"))
      .transform((v) => v || null),
    wantsToDonate: z.boolean(),
    wantsToVolunteer: z.boolean(),
    interests: z.array(z.enum(INTERESES)).max(INTERESES.length),
    showAlias: z.boolean(),
    emailUpdates: z.boolean(),
  });

export type ProfileInput = z.input<ReturnType<typeof esquema>>;

/** Guarda el perfil de la persona de la sesión. El nombre, el correo y el teléfono no se muestran en la página. */
export async function saveProfile(input: ProfileInput): Promise<{ ok: true } | { ok: false; message: string }> {
  const { t } = await getT();
  const session = await getSession();
  if (!session || session.role !== "persona") return { ok: false, message: t("cuenta.perfil.error.sesion") };

  const parsed = esquema(t).safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? t("cuenta.perfil.error.datos") };
  if (!parsed.data.wantsToDonate && !parsed.data.wantsToVolunteer) {
    return { ok: false, message: t("cuenta.perfil.error.participar") };
  }

  await getDb()
    .update(personProfiles)
    .set({ ...parsed.data, completedAt: new Date(), updatedAt: new Date() })
    .where(eq(personProfiles.userId, session.userId));
  return { ok: true };
}
