import { createHmac } from "node:crypto";
import { and, count, eq, gt, isNull } from "drizzle-orm";
import * as srpServer from "secure-remote-password/server";
import type { Db } from "@/platform/db/client";
import { authChallenges, users } from "@/platform/db/schema";

/**
 * SRP-6a del lado del servidor (mismo diseño que el login de Casino). La contraseña nunca viaja ni se
 * guarda: la base de datos tiene la sal y el verificador v = g^x mod N, y el navegador demuestra que
 * conoce la contraseña sin enviarla. No importa nada de Next para poder probarlo aislado.
 */

export const CHALLENGE_TTL_MS = 2 * 60 * 1000;
export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
export const LOCKOUT_MAX_FAILURES = 5;

export class TooManyAttemptsError extends Error {
  constructor() {
    super("Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.");
    this.name = "TooManyAttemptsError";
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const HEX = /^[0-9a-f]{1,1024}$/;

export function isSrpHex(value: string): boolean {
  return HEX.test(value);
}

/** Sal y verificador falsos pero deterministas: la respuesta a un correo inexistente es indistinguible. */
function decoy(secret: string, email: string) {
  const mac = (label: string) => createHmac("sha256", secret).update(`${label}:${email}`).digest("hex");
  return { salt: mac("salt"), verifier: mac("verifier") + mac("verifier-2") };
}

export interface LoginChallenge {
  challengeId: string;
  salt: string;
  serverPublic: string;
}

/**
 * Paso 1: el navegador envía (correo, A) y recibe (idDesafio, sal, B).
 * Si el correo no existe, se responde un señuelo con el mismo formato y el mismo costo.
 */
export async function startLogin(
  db: Db,
  rawEmail: string,
  clientPublic: string,
  secret: string,
  now = new Date(),
): Promise<LoginChallenge> {
  if (!isSrpHex(clientPublic)) throw new RangeError("Datos de autenticación inválidos.");
  const email = normalizeEmail(rawEmail);
  const [user] = await db
    .select({ id: users.id, salt: users.srpSalt, verifier: users.srpVerifier })
    .from(users)
    .where(and(eq(users.email, email), eq(users.active, true)))
    .limit(1);

  if (user) {
    const [failed] = await db
      .select({ n: count() })
      .from(authChallenges)
      .where(
        and(
          eq(authChallenges.userId, user.id),
          eq(authChallenges.succeeded, false),
          gt(authChallenges.createdAt, new Date(now.getTime() - LOCKOUT_WINDOW_MS)),
        ),
      );
    if ((failed?.n ?? 0) >= LOCKOUT_MAX_FAILURES) throw new TooManyAttemptsError();
  }

  const data = user ?? decoy(secret, email);
  const ephemeral = srpServer.generateEphemeral(data.verifier);
  const [challenge] = await db
    .insert(authChallenges)
    .values({
      userId: user?.id ?? null,
      clientPublic,
      serverPublic: ephemeral.public,
      serverSecret: ephemeral.secret,
      expiresAt: new Date(now.getTime() + CHALLENGE_TTL_MS),
    })
    .returning({ id: authChallenges.id });
  if (!challenge) throw new Error("No se pudo crear el desafío.");

  return { challengeId: challenge.id, salt: data.salt, serverPublic: ephemeral.public };
}

export interface LoginSuccess {
  userId: string;
  role: (typeof users.$inferSelect)["role"];
  /** M2: el navegador lo verifica para comprobar que el servidor conoce el verificador. */
  serverProof: string;
}

/**
 * Paso 2: el navegador envía (idDesafio, M1). El desafío se consume una sola vez y de forma atómica.
 * Devuelve nulo ante cualquier credencial inválida, sin distinguir el motivo.
 */
export async function finishLogin(
  db: Db,
  challengeId: string,
  clientProof: string,
  secret: string,
): Promise<LoginSuccess | null> {
  if (!isSrpHex(clientProof)) return null;

  const [challenge] = await db
    .update(authChallenges)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(authChallenges.id, challengeId),
        isNull(authChallenges.usedAt),
        gt(authChallenges.expiresAt, new Date()),
      ),
    )
    .returning();
  if (!challenge) return null;

  const [user] = challenge.userId
    ? await db
        .select()
        .from(users)
        .where(and(eq(users.id, challenge.userId), eq(users.active, true)))
        .limit(1)
    : [];

  let proof: string | null = null;
  try {
    if (user) {
      proof = srpServer.deriveSession(
        challenge.serverSecret,
        challenge.clientPublic,
        user.srpSalt,
        user.email,
        user.srpVerifier,
        clientProof,
      ).proof;
    } else {
      // Señuelo: el mismo cálculo para gastar el mismo tiempo; siempre falla.
      const fake = decoy(secret, "");
      srpServer.deriveSession(challenge.serverSecret, challenge.clientPublic, fake.salt, "", fake.verifier, clientProof);
    }
  } catch {
    proof = null;
  }

  await db
    .update(authChallenges)
    .set({ succeeded: proof !== null && Boolean(user) })
    .where(eq(authChallenges.id, challenge.id));

  if (!proof || !user) return null;
  return { userId: user.id, role: user.role, serverProof: proof };
}
