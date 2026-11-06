import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStellarEnv, getExplorerEnv } from "@/platform/config/env";
import { getCatalogService } from "@/platform/container";
import { ApadrinarFlow } from "./ApadrinarFlow";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ codigo: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { codigo } = await params;
  return { title: `Apadrinar ${codigo}` };
}

export default async function ApadrinarPage({ params }: Params) {
  const { codigo } = await params;
  const detail = await getCatalogService().detail(codigo);
  if (!detail || detail.case.finalDestination) notFound();

  const stellar = getStellarEnv();

  return (
    <main className="space-y-6">
      <header>
        <p className="font-mono text-sm text-black/60">{detail.case.code}</p>
        <h1 className="text-2xl font-semibold">Apadrinar este caso</h1>
        <p className="mt-2 max-w-xl text-black/70">
          Apadrinar es seguir el caso: tu aporte financia su recuperación y podrás ver, paso a paso, en qué se usó.
          El pago se hace en {stellar.ASSET_CODE} de prueba, con tu billetera Freighter en la red Testnet.
        </p>
      </header>
      <ApadrinarFlow
        caseCode={detail.case.code}
        assetCode={stellar.ASSET_CODE}
        networkPassphrase={stellar.NETWORK_PASSPHRASE}
        horizonUrl={stellar.HORIZON_URL}
        explorerBaseUrl={getExplorerEnv().EXPLORER_BASE_URL}
      />
    </main>
  );
}
