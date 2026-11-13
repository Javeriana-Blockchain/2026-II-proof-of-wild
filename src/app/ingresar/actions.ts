"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { homeFor } from "@/app/_lib/session";
import { traducirError } from "@/i18n/errores";
import { getT } from "@/i18n/servidor";
import type { Traductor } from "@/i18n/traductor";
import {
  closeSession,
  createSession,
  EmailTakenError,
  findSessionUser,
  finishLogin,
  registerAccount,
  SESSION_COOKIE,
  startLogin,
  TooManyAttemptsError,
} from "@/platform/auth";
import { getSessionEnv } from "@/platform/config/env";
import { getDb } from "@/platform/db/client";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

const hex = z.string().regex(/^[0-9a-f]{1,1024}$/i).transform((s) => s.toLowerCase());
const email = z.string().trim().min(3).max(200);

function fail(error: unknown, t: Traductor["t"]): { ok: false; message: string } {
  if (error instanceof TooManyAttemptsError || error instanceof EmailTakenError || error instanceof RangeError) {
    return { ok: false, message: traducirError(error.message, t) };
  }
  console.error(error);
  return { ok: false, message: t("cuenta.error.generico") };
}

/** Solo rutas internas: evita redirigir a otro sitio con ?volver=https://… */
function safeReturn(path: string | undefined): string | null {
  return path && path.startsWith("/") && !path.startsWith("//") ? path : null;
}

/** Paso 1 de SRP: recibe (correo, A) y responde (desafío, sal, B). Un correo inexistente recibe un señuelo. */
export async function loginStep1(
  rawEmail: string,
  clientPublic: string,
): Promise<ActionResult<{ challengeId: string; salt: string; serverPublic: string }>> {
  const { t } = await getT();
  const parsed = z.tuple([email, hex]).safeParse([rawEmail, clientPublic]);
  if (!parsed.success) return { ok: false, message: t("cuenta.error.credenciales") };
  try {
    const data = await startLogin(getDb(), parsed.data[0], parsed.data[1], getSessionEnv().SESSION_SECRET);
    return { ok: true, data };
  } catch (error) {
    return fail(error, t);
  }
}

/**
 * Paso 2 de SRP: verifica M1, crea la sesión (cookie httpOnly) y devuelve M2 para que el navegador verifique al
 * servidor. `redirectTo` va sin prefijo de idioma: el navegador lo localiza con `ruta()`.
 */
export async function loginStep2(
  challengeId: string,
  clientProof: string,
  returnTo?: string,
): Promise<ActionResult<{ serverProof: string; redirectTo: string }>> {
  const { t } = await getT();
  const parsed = z.tuple([z.uuid(), hex]).safeParse([challengeId, clientProof]);
  if (!parsed.success) return { ok: false, message: t("cuenta.error.credenciales") };
  try {
    const db = getDb();
    const success = await finishLogin(db, parsed.data[0], parsed.data[1], getSessionEnv().SESSION_SECRET);
    if (!success) return { ok: false, message: t("cuenta.error.credenciales") };

    const { token, expiresAt } = await createSession(db, success.userId);
    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
    const user = await findSessionUser(db, token);
    const redirectTo = safeReturn(returnTo) ?? (user ? homeFor(user) : "/");
    return { ok: true, data: { serverProof: success.serverProof, redirectTo } };
  } catch (error) {
    return fail(error, t);
  }
}

const accountSchema = z.object({
  email,
  role: z.enum(["persona", "ong"]),
  salt: hex,
  verifier: hex,
  consent: z.literal(true),
});

/** Crea la cuenta con la sal y el verificador derivados en el navegador. Después el navegador inicia sesión. */
export async function createAccount(input: z.input<typeof accountSchema>): Promise<ActionResult<null>> {
  const { t } = await getT();
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: t("cuenta.error.revisaCorreo") };
  }
  try {
    await registerAccount(getDb(), parsed.data);
    return { ok: true, data: null };
  } catch (error) {
    return fail(error, t);
  }
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await closeSession(getDb(), token).catch((error) => console.error(error));
  store.delete(SESSION_COOKIE);
}
