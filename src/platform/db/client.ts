import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseEnv } from "@/platform/config/env";
import * as schema from "./schema";
import { cleanDatabaseUrl } from "./url";

function createDb() {
  const client = postgres(cleanDatabaseUrl(getDatabaseEnv().DATABASE_URL), {
    max: 5,
    // Neon y otros PostgreSQL gestionados se usan con un pool tipo PgBouncer en modo transacción, que no
    // admite sentencias preparadas con nombre. Desactivarlas no cambia nada en local.
    prepare: false,
    onnotice: () => {},
  });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;

let instance: Db | undefined;

/** Cliente único por proceso, creado al primer uso (no durante la compilación). */
export function getDb(): Db {
  instance ??= createDb();
  return instance;
}
