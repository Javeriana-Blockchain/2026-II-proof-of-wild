import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import type { Actor } from "@/modules/shared/actor";
import { hashPassword, verifyPassword } from "@/platform/auth/password";
import { createSessionToken, readSessionToken } from "@/platform/auth/session";

const SECRET = "s".repeat(40);
const actor: Actor = {
  userId: "user-1",
  role: "validator",
  centerId: "center-1",
  stellarAccount: "GAOKEU3JCLOTL3DY55HRKFYQJJDFFAR5CFSMJUHFAU42KPB5IKOVAUZ6",
};

describe("contraseñas", () => {
  it("verifica la contraseña correcta y rechaza las demás", async () => {
    const stored = await hashPassword("clave de prueba");
    expect(stored.startsWith("scrypt:")).toBe(true);
    expect(await verifyPassword("clave de prueba", stored)).toBe(true);
    expect(await verifyPassword("otra clave", stored)).toBe(false);
  });

  it("usa una sal distinta en cada hash y no guarda la contraseña", async () => {
    const [a, b] = await Promise.all([hashPassword("igual"), hashPassword("igual")]);
    expect(a).not.toBe(b);
    expect(a).not.toContain("igual");
  });

  it("rechaza formatos de hash inválidos", async () => {
    expect(await verifyPassword("x", "texto-plano")).toBe(false);
    expect(await verifyPassword("x", "bcrypt:aa:bb")).toBe(false);
  });
});

describe("sesión", () => {
  it("recupera al usuario de un token válido", async () => {
    const token = await createSessionToken(actor, SECRET);
    expect(await readSessionToken(token, SECRET)).toEqual(actor);
  });

  it("rechaza tokens con otra clave, alterados o vencidos", async () => {
    const token = await createSessionToken(actor, SECRET);
    expect(await readSessionToken(token, "z".repeat(40))).toBeNull();
    expect(await readSessionToken(`${token}x`, SECRET)).toBeNull();
    expect(await readSessionToken("basura", SECRET)).toBeNull();

    const expired = await createSessionToken(actor, SECRET, -10);
    expect(await readSessionToken(expired, SECRET)).toBeNull();
  });

  it("rechaza tokens con un rol desconocido", async () => {
    const forged = await new SignJWT({ role: "superadmin", centerId: null, stellarAccount: null })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(SECRET));
    expect(await readSessionToken(forged, SECRET)).toBeNull();
  });
});
