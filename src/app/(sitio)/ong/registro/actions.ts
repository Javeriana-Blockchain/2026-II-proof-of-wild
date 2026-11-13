"use server";

import { eq, like } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/app/_lib/session";
import { getT } from "@/i18n/servidor";
import type { Traductor } from "@/i18n/traductor";
import { isStellarAccount } from "@/lib/stellar-account";
import { getDb } from "@/platform/db/client";
import { ngos } from "@/platform/db/schema";

/** Esquema con los mensajes en el idioma de la petición. */
const esquema = (t: Traductor["t"]) =>
  z.object({
    name: z.string().trim().min(3, t("ong.registro.error.nombre")).max(120),
    nit: z
      .string()
      .trim()
      .regex(/^[0-9.]{6,15}-?[0-9]?$/, t("ong.registro.error.nit")),
    kind: z.enum(["centro_atencion", "fundacion", "ong"]),
    city: z.string().trim().min(3, t("ong.registro.error.ciudad")).max(80),
    description: z.string().trim().min(20, t("ong.registro.error.descripcion")).max(400),
    environmentalPermit: z.string().trim().max(80),
    contactName: z.string().trim().min(3, t("ong.registro.error.contacto")).max(120),
    contactEmail: z.email(t("ong.registro.error.correo")).max(200),
    contactPhone: z.string().trim().regex(/^[+0-9 ()-]{7,20}$/, t("ong.registro.error.telefono")),
    stellarAccount: z.string().trim().refine(isStellarAccount, t("ong.registro.error.cuenta")),
    offersVolunteering: z.boolean(),
    consent: z.boolean().refine((v) => v, t("ong.registro.error.consentimiento")),
  });

export type NgoApplication = z.input<ReturnType<typeof esquema>>;

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
  const { t } = await getT();
  const session = await getSession();
  if (!session || session.role !== "ong") return { ok: false, message: t("ong.registro.error.sesion") };
  if (session.ngoId) return { ok: false, message: t("ong.registro.error.yaEnviada") };

  const parsed = esquema(t).safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? t("ong.registro.error.revisa") };
  const { consent: _, environmentalPermit, ...data } = parsed.data;

  const db = getDb();
  const base = slugify(data.name);
  const taken = new Set((await db.select({ slug: ngos.slug }).from(ngos).where(like(ngos.slug, `${base}%`))).map((r) => r.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

  const [sameAccount] = await db.select({ id: ngos.id }).from(ngos).where(eq(ngos.stellarAccount, data.stellarAccount)).limit(1);
  if (sameAccount) return { ok: false, message: t("ong.registro.error.cuentaUsada") };

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
