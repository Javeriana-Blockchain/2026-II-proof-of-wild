import { defineConfig } from "drizzle-kit";
import { cleanDatabaseUrl } from "./src/platform/db/url";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/platform/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: cleanDatabaseUrl(process.env.DATABASE_URL ?? "postgres://pow:pow@127.0.0.1:55432/proofofwild"),
  },
});
