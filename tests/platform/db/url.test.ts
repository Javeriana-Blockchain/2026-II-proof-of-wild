import { describe, expect, it } from "vitest";
import { cleanDatabaseUrl } from "@/platform/db/url";

describe("URL de conexión a PostgreSQL", () => {
  it("quita channel_binding (Neon) y conserva sslmode y el resto", () => {
    const neon = "postgresql://usuario:clave@ep-x-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
    expect(cleanDatabaseUrl(neon)).toBe(
      "postgresql://usuario:clave@ep-x-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require",
    );
  });

  it("deja igual una URL local o una que no se puede interpretar", () => {
    expect(cleanDatabaseUrl("postgres://pow:pow@127.0.0.1:55432/proofofwild")).toBe(
      "postgres://pow:pow@127.0.0.1:55432/proofofwild",
    );
    expect(cleanDatabaseUrl("no es una url")).toBe("no es una url");
  });
});
