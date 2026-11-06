import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatAmount, formatDate } from "@/app/_lib/format";
import { getCatalogService } from "@/platform/container";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ txHash: string }> };

/** Metadatos para compartir en redes (Open Graph): por esto el comprobante se renderiza en servidor. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { txHash } = await params;
  const receipt = await getCatalogService().receipt(txHash);
  if (!receipt) return { title: "Comprobante no encontrado" };

  const title = `Apadriné el caso ${receipt.caseCode}`;
  const description = `Aporté ${formatAmount(receipt.amount, receipt.assetCode)} a la recuperación de un animal silvestre. Compruébalo en Stellar.`;
  return { title, description, openGraph: { title, description, type: "website" } };
}

export default async function ReceiptPage({ params }: Params) {
  const { txHash } = await params;
  const receipt = await getCatalogService().receipt(txHash);
  if (!receipt) notFound();

  return (
    <main className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Comprobante de aporte</h1>
      <dl className="divide-y divide-black/10 rounded-lg bg-white">
        <div className="flex justify-between px-4 py-3">
          <dt className="text-black/60">Caso</dt>
          <dd>
            <Link className="underline" href={`/casos/${receipt.caseCode}`}>
              {receipt.caseCode}
            </Link>
          </dd>
        </div>
        <div className="flex justify-between px-4 py-3">
          <dt className="text-black/60">Monto</dt>
          <dd>{formatAmount(receipt.amount, receipt.assetCode)}</dd>
        </div>
        <div className="flex justify-between px-4 py-3">
          <dt className="text-black/60">Fecha</dt>
          <dd>{formatDate(receipt.confirmedAt)}</dd>
        </div>
      </dl>
      <p>
        <a className="underline" href={receipt.txUrl} target="_blank" rel="noreferrer">
          Verificar la transacción en Stellar
        </a>
      </p>
    </main>
  );
}
