import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/app/_lib/session";
import { BadgeCard, DonorHeader, DonorSections, DonorTotals } from "@/components/huella/DonorSections";
import { buttonClass } from "@/components/ui";
import { getExplorerEnv } from "@/platform/config/env";
import { evidenceUrl, getCatalogService, getIdentityService } from "@/platform/container";
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
  const [[profile], cases, identity] = await Promise.all([
    db
      .select({ alias: personProfiles.alias, account: personProfiles.stellarAccount })
      .from(personProfiles)
      .where(eq(personProfiles.userId, session.userId))
      .limit(1),
    getCatalogService().listCases(),
    getIdentityService().status(session.userId),
  ]);

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
  const routes = new Map(cases.map((c) => [c.code, c.route]));

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-8">
      <DonorHeader
        name={alias}
        account={account}
        verified={!!identity}
        seal={
          <BadgeCard
            view={view}
            sharePath={account ? `/huella/${account}` : "/#casos"}
            publicLink={account ? `/huella/${account}` : undefined}
          />
        }
        actions={
          <>
            <Link href="/cuenta/verificar" className={buttonClass(identity ? "contorno" : "arena")}>
              {identity ? "Ver mi verificación" : "Verificar mi identidad"}
            </Link>
            {account ? <DisconnectButton /> : null}
            {!profile?.alias ? (
              <Link href="/cuenta/perfil" className={buttonClass("arena")}>
                Completar mi perfil
              </Link>
            ) : null}
          </>
        }
      >
        {account ? null : (
          <p>
            Tu billetera queda vinculada a tu perfil con tu primer aporte: al firmarlo demuestras que es tuya.{" "}
            <Link
              href="/#casos"
              className="font-semibold text-arena underline decoration-arena/40 underline-offset-4 transition-[text-decoration-color] hover:decoration-arena"
            >
              Elegir un caso
            </Link>
          </p>
        )}
      </DonorHeader>

      <DonorTotals view={view} />
      <DonorSections view={view} explorerBaseUrl={getExplorerEnv().EXPLORER_BASE_URL} photo={evidenceUrl} own routes={routes} />
    </main>
  );
}
