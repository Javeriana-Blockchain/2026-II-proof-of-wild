import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/platform/db/client";

export const dynamic = "force-dynamic";

/** Salud del servicio. Con `?deep=1` comprueba también la conexión a la base de datos. */
export async function GET(request: Request) {
  const deep = new URL(request.url).searchParams.get("deep") === "1";
  if (!deep) return NextResponse.json({ status: "ok" });

  try {
    await getDb().execute(sql`select 1`);
    return NextResponse.json({ status: "ok", database: "ok" });
  } catch {
    return NextResponse.json({ status: "degraded", database: "unavailable" }, { status: 503 });
  }
}
