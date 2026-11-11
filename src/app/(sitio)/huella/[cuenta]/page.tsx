import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCard, DonorHeader, DonorSections, DonorTotals } from "@/components/huella/DonorSections";
import { isStellarAccount, shortAccount } from "@/lib/stellar-account";
import { getExplorerEnv } from "@/platform/config/env";
import { evidenceUrl, getCatalogService } from "@/platform/container";
import { getDb } from "@/platform/db/client";
import { getDonorView } from "@/platform/db/repositories/donor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ cuenta: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cuenta } = await params;
  if (!isStellarAccount(cuenta)) return { title: "Huella no encontrada" };
  const view = await getDonorView(getDb(), cuenta);
  const who = view.alias ?? shortAccount(cuenta);
  const title = `Huella verificada de ${who}`;
  const description = `Apoya ${view.cases.length} ${view.cases.length === 1 ? "caso" : "casos"} de fauna silvestre rescatada. Cada aporte se puede comprobar en Stellar.`;
  return { title, description, openGraph: { title, description, type: "profile" } };
}

/**
 * Página pública de la insignia: el alias (si la persona lo permite) o la billetera abreviada, y los aportes que
 * la respaldan con su enlace a Stellar Expert, para que cualquiera compruebe que es real.
 */
export default async function HuellaPage({ params }: Props) {
  const { cuenta } = await params;
  if (!isStellarAccount(cuenta)) notFound();
  const [view, cases] = await Promise.all([getDonorView(getDb(), cuenta), getCatalogService().listCases()]);
  const routes = new Map(cases.map((c) => [c.code, c.route]));

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-8">
      <DonorHeader name={view.alias ?? "Donante"} account={cuenta} seal={<BadgeCard view={view} sharePath={`/huella/${cuenta}`} />}>
        <p>
          Estos aportes están en la red Stellar: cualquiera puede comprobarlos en Stellar Expert. Proof of Wild no muestra
          el nombre ni los datos de contacto de nadie.
        </p>
      </DonorHeader>
      <DonorTotals view={view} own={false} />
      <DonorSections
        view={view}
        explorerBaseUrl={getExplorerEnv().EXPLORER_BASE_URL}
        photo={evidenceUrl}
        own={false}
        routes={routes}
      />
    </main>
  );
}
