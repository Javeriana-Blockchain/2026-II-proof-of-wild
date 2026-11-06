"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate } from "@/platform/auth/login";
import { createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/platform/auth";
import { getSessionEnv } from "@/platform/config/env";
import { getDb } from "@/platform/db/client";

/** Inicia sesión en el portal. Ante cualquier fallo responde lo mismo, sin revelar si el correo existe. */
export async function login(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const actor = email && password ? await authenticate(getDb(), email, password) : null;
  if (!actor) redirect("/portal/ingresar?error=1");

  const token = await createSessionToken(actor, getSessionEnv().SESSION_SECRET);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  redirect("/portal");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/portal/ingresar");
}
