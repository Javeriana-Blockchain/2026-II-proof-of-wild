"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/app/_lib/session";
import { getDb } from "@/platform/db/client";
import { personProfiles } from "@/platform/db/schema";

const INTERESES = ["aves", "mamiferos", "reptiles"] as const;

const schema = z.object({
  fullName: z.string().trim().min(3, "Escribe tu nombre completo.").max(120),
  alias: z.string().trim().min(2, "Escribe un alias de al menos 2 letras.").max(40),
  city: z.string().trim().min(2, "Escribe tu ciudad.").max(80),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+0-9 ()-]*$/, "El teléfono solo puede tener números, espacios y +.")
    .transform((v) => v || null),
  wantsToDonate: z.boolean(),
  wantsToVolunteer: z.boolean(),
  interests: z.array(z.enum(INTERESES)).max(INTERESES.length),
  showAlias: z.boolean(),
  emailUpdates: z.boolean(),
});

export type ProfileInput = z.input<typeof schema>;

/** Guarda el perfil de la persona de la sesión. El nombre, el correo y el teléfono no se muestran en la página. */
export async function saveProfile(input: ProfileInput): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await getSession();
  if (!session || session.role !== "persona") return { ok: false, message: "Tu sesión venció. Vuelve a ingresar." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  if (!parsed.data.wantsToDonate && !parsed.data.wantsToVolunteer) {
    return { ok: false, message: "Elige al menos una forma de participar." };
  }

  await getDb()
    .update(personProfiles)
    .set({ ...parsed.data, completedAt: new Date(), updatedAt: new Date() })
    .where(eq(personProfiles.userId, session.userId));
  return { ok: true };
}
