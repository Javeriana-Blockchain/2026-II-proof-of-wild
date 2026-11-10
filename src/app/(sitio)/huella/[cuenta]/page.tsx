import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCard, DonorSections, DonorTotals } from "@/components/huella/DonorSections";
import { isStellarAccount, shortAccount } from "@/lib/stellar-account";
import { getExplorerEnv } from "@/platform/config/env";
import { evidenceUrl } from "@/platform/container";
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
  const view = await getDonorView(getDb(), cuenta);

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[1fr_2.2fr]">
      <aside className="space-y-6">
        <section className="rounded-3xl bg-white p-6">
          <p className="text-sm text-secundario">Huella de</p>
          <p className="text-2xl font-semibold">{view.alias ?? "Donante"}</p>
          <p className="font-mono text-sm text-secundario">{shortAccount(cuenta)}</p>
        </section>
        <BadgeCard view={view} sharePath={`/huella/${cuenta}`} />
      </aside>
      <div className="space-y-6">
        <h1 className="text-5xl">Huella verificada</h1>
        <p className="text-secundario">
          Estos aportes están en la red Stellar: cualquiera puede comprobarlos en Stellar Expert. Proof of Wild no muestra
          el nombre ni los datos de contacto de nadie.
        </p>
        <DonorTotals view={view} own={false} />
        <DonorSections view={view} explorerBaseUrl={getExplorerEnv().EXPLORER_BASE_URL} photo={evidenceUrl} own={false} />
      </div>
    </main>
  );
}
