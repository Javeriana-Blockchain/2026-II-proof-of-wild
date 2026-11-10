"use server";

import { eq, like } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/app/_lib/session";
import { isStellarAccount } from "@/lib/stellar-account";
import { getDb } from "@/platform/db/client";
import { ngos } from "@/platform/db/schema";

const schema = z.object({
  name: z.string().trim().min(3, "Escribe el nombre de la organización.").max(120),
  nit: z
    .string()
    .trim()
    .regex(/^[0-9.]{6,15}-?[0-9]?$/, "Escribe el NIT con su dígito de verificación, por ejemplo 900.000.303-3."),
  kind: z.enum(["centro_atencion", "fundacion", "ong"]),
  city: z.string().trim().min(3, "Escribe la ciudad y el departamento.").max(80),
  description: z.string().trim().min(20, "Cuéntanos en una o dos frases qué hace la organización.").max(400),
  environmentalPermit: z.string().trim().max(80),
  contactName: z.string().trim().min(3, "Escribe la persona de contacto.").max(120),
  contactEmail: z.email("El correo de contacto no es válido.").max(200),
  contactPhone: z.string().trim().regex(/^[+0-9 ()-]{7,20}$/, "Escribe un teléfono válido, por ejemplo +57 300 000 0303."),
  stellarAccount: z.string().trim().refine(isStellarAccount, "La cuenta de Stellar empieza por G y tiene 56 caracteres."),
  offersVolunteering: z.boolean(),
  consent: z.boolean().refine((v) => v, "Acepta el tratamiento de datos para enviar la solicitud."),
});

export type NgoApplication = z.input<typeof schema>;

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "ong";
}

/**
 * Registro de ONG (pantalla 7): la cuenta de la ONG envía sus datos y queda «en revisión» hasta que un
 * administrador la apruebe. En la demo, las ONG ficticias ya vienen aprobadas.
 */
export async function submitNgoApplication(input: NgoApplication): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await getSession();
  if (!session || session.role !== "ong") return { ok: false, message: "Ingresa con la cuenta de tu ONG para enviar la solicitud." };
  if (session.ngoId) return { ok: false, message: "Tu ONG ya envió su solicitud." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  const { consent: _, environmentalPermit, ...data } = parsed.data;

  const db = getDb();
  const base = slugify(data.name);
  const taken = new Set((await db.select({ slug: ngos.slug }).from(ngos).where(like(ngos.slug, `${base}%`))).map((r) => r.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

  const [sameAccount] = await db.select({ id: ngos.id }).from(ngos).where(eq(ngos.stellarAccount, data.stellarAccount)).limit(1);
  if (sameAccount) return { ok: false, message: "Esa cuenta de Stellar ya está registrada por otra organización." };

  await db.insert(ngos).values({
    ...data,
    slug,
    environmentalPermit: environmentalPermit || null,
    userId: session.userId,
    status: "en_revision",
    dataConsentAt: new Date(),
  });
  return { ok: true };
}
