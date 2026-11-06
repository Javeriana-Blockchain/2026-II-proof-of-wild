import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseEnv } from "@/platform/config/env";
import * as schema from "./schema";

function createDb() {
  const client = postgres(getDatabaseEnv().DATABASE_URL, { max: 10 });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;

let instance: Db | undefined;

/** Cliente único por proceso, creado al primer uso (no durante la compilación). */
export function getDb(): Db {
  instance ??= createDb();
  return instance;
}
