import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/app/_lib/session";
import { BadgeCard, DonorSections, DonorTotals } from "@/components/huella/DonorSections";
import { buttonClass } from "@/components/ui";
import { shortAccount } from "@/lib/stellar-account";
import { getExplorerEnv } from "@/platform/config/env";
import { evidenceUrl } from "@/platform/container";
import { getDb } from "@/platform/db/client";
import { enrollmentsOf, getDonorView, type DonorView } from "@/platform/db/repositories/donor";
import { personProfiles } from "@/platform/db/schema";
import { DisconnectButton } from "./DisconnectButton";

export const metadata: Metadata = { title: "Tu perfil" };
export const dynamic = "force-dynamic";

/** Pantalla 5: perfil del donante, con su insignia, lo que apoya, en qué se usó su aporte y sus voluntariados. */
export default async function PerfilPage() {
  const session = await requireSession("/perfil", "persona");
  const db = getDb();
  const [profile] = await db
    .select({ alias: personProfiles.alias, account: personProfiles.stellarAccount })
    .from(personProfiles)
    .where(eq(personProfiles.userId, session.userId))
    .limit(1);

  const account = profile?.account ?? null;
  const view: DonorView = account
    ? await getDonorView(db, account, session.userId)
    : {
        account: "",
        alias: profile?.alias ?? null,
        contributions: [],
        cases: [],
        totalAmount: "0",
        volunteerings: await enrollmentsOf(db, session.userId),
      };
  const alias = profile?.alias ?? session.email;

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[1fr_2.2fr]">
      <aside className="space-y-6">
        <section className="flex items-center gap-4 rounded-3xl bg-white p-6">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-arena font-serif text-3xl">
            {alias.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{alias}</p>
            <p className="font-mono text-sm text-secundario">{account ? shortAccount(account) : "Sin billetera vinculada"}</p>
          </div>
          {account ? <DisconnectButton /> : null}
        </section>
        <BadgeCard view={view} sharePath={account ? `/huella/${account}` : "/casos"} publicLink={account ? `/huella/${account}` : undefined} />
        {!account ? (
          <p className="rounded-2xl bg-crema p-5 text-sm">
            Tu billetera queda vinculada a tu perfil con tu primer aporte: al firmarlo demuestras que es tuya.{" "}
            <Link href="/casos" className="font-medium text-bosque underline">
              Elegir un caso
            </Link>
          </p>
        ) : null}
        {!profile?.alias ? (
          <Link href="/cuenta/perfil" className={buttonClass("secundario", "w-full")}>
            Completar mi perfil
          </Link>
        ) : null}
      </aside>

      <div className="space-y-6">
        <h1 className="text-6xl">Tu perfil</h1>
        <DonorTotals view={view} />
        <DonorSections view={view} explorerBaseUrl={getExplorerEnv().EXPLORER_BASE_URL} photo={evidenceUrl} own />
      </div>
    </main>
  );
}
