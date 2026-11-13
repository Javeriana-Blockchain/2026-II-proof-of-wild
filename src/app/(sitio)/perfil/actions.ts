"use server";

import { eq } from "drizzle-orm";
import { getSession } from "@/app/_lib/session";
import { getDb } from "@/platform/db/client";
import { personProfiles } from "@/platform/db/schema";

/** Desvincula la billetera del perfil. Sus aportes siguen en la red; solo dejan de mostrarse en el perfil. */
export async function unlinkWallet(): Promise<void> {
  const session = await getSession();
  if (session?.role !== "persona") return;
  await getDb()
    .update(personProfiles)
    .set({ stellarAccount: null, updatedAt: new Date() })
    .where(eq(personProfiles.userId, session.userId));
}
