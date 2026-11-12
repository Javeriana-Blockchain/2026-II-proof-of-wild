import * as srp from "secure-remote-password/client";
import { createAccount, loginStep1, loginStep2, logout, type ActionResult } from "./actions";

/**
 * SRP-6a del lado del navegador (mismo diseño que Casino). La contraseña nunca sale de aquí: al servidor
 * solo viajan el correo, A y M1 y, al crear la cuenta, la sal y el verificador.
 */

const normalize = (email: string) => email.trim().toLowerCase();

export async function signUp(
  email: string,
  password: string,
  role: "persona" | "ong",
  returnTo?: string,
): Promise<ActionResult<{ redirectTo: string }>> {
  const user = normalize(email);
  const salt = srp.generateSalt();
  const verifier = srp.deriveVerifier(srp.derivePrivateKey(salt, user, password));
  const created = await createAccount({ email: user, role, salt, verifier, consent: true });
  if (!created.ok) return created;
  // Quien venía de apadrinar vuelve al caso con la ventana abierta; el perfil se completa después.
  return signIn(user, password, returnTo);
}

/** Inicia sesión en dos pasos y verifica M2: si el servidor no conoce el verificador, no puede calcularlo. */
export async function signIn(
  email: string,
  password: string,
  returnTo?: string,
): Promise<ActionResult<{ redirectTo: string }>> {
  const user = normalize(email);
  const ephemeral = srp.generateEphemeral();

  const step1 = await loginStep1(user, ephemeral.public);
  if (!step1.ok) return step1;

  let session: srp.Session;
  try {
    const privateKey = srp.derivePrivateKey(step1.data.salt, user, password);
    session = srp.deriveSession(ephemeral.secret, step1.data.serverPublic, step1.data.salt, user, privateKey);
  } catch {
    return { ok: false, message: "Correo o contraseña incorrectos." };
  }

  const step2 = await loginStep2(step1.data.challengeId, session.proof, returnTo);
  if (!step2.ok) return step2;

  try {
    srp.verifySession(ephemeral.public, session, step2.data.serverProof);
  } catch {
    await logout();
    return { ok: false, message: "No se pudo verificar el servidor. No continúes y avísanos." };
  }
  return { ok: true, data: { redirectTo: step2.data.redirectTo } };
}
