import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { requireSession } from "@/app/_lib/session";
import { Logo } from "@/components/sitio/Logo";
import { TestnetBadge } from "@/components/ui";
import { getDb } from "@/platform/db/client";
import { personProfiles } from "@/platform/db/schema";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Termina tu perfil" };
export const dynamic = "force-dynamic";

const INTERESTS = ["aves", "mamiferos", "reptiles"] as const;

/** Cuenta 2: terminar de crear el perfil de una persona (donante, voluntaria o las dos). */
export default async function TerminarPerfilPage() {
  const session = await requireSession("/cuenta/perfil", "persona");
  const [profile] = await getDb()
    .select()
    .from(personProfiles)
    .where(eq(personProfiles.userId, session.userId))
    .limit(1);

  return (
    <>
      <header className="border-b border-arena/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Logo />
          <div className="flex items-center gap-4">
            <TestnetBadge />
            <span className="flex items-center gap-2 rounded-full border border-arena bg-white px-5 py-2 font-semibold">
              <span aria-hidden className="h-2 w-2 rounded-full bg-bosque" />
              {session.email}
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <ProfileForm
          email={session.email}
          initial={{
            fullName: profile?.fullName ?? "",
            alias: profile?.alias ?? "",
            city: profile?.city ?? "",
            phone: profile?.phone ?? "",
            wantsToDonate: profile?.wantsToDonate ?? true,
            wantsToVolunteer: profile?.wantsToVolunteer ?? false,
            interests: (profile?.interests ?? []).filter((i): i is (typeof INTERESTS)[number] =>
              (INTERESTS as readonly string[]).includes(i),
            ),
            showAlias: profile?.showAlias ?? true,
            emailUpdates: profile?.emailUpdates ?? false,
          }}
        />
      </main>
    </>
  );
}
