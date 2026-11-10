import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatAmount, formatDate } from "@/app/_lib/format";
import { IconoCheck } from "@/components/iconos";
import { buttonClass, ExplorerLink } from "@/components/ui";
import { shortAccount } from "@/lib/stellar-account";
import { getCatalogService } from "@/platform/container";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ txHash: string }> };

/** Metadatos para compartir en redes (Open Graph): por esto el comprobante se renderiza en el servidor. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const receipt = await getCatalogService().receipt((await params).txHash.toLowerCase());
  if (!receipt) return { title: "Comprobante no encontrado" };
  const title = `Apadriné a ${receipt.caseName} (${receipt.caseCode})`;
  const description = `Aporté ${formatAmount(receipt.amount)} a su recuperación con ${receipt.ngoName}. Compruébalo en Stellar.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: receipt.photoUrl ? [receipt.photoUrl] : undefined },
  };
}

/** Comprobante público de un aporte (RF-COM-01). Solo muestra lo que ya es público en la red. */
export default async function ComprobantePage({ params }: Props) {
  const receipt = await getCatalogService().receipt((await params).txHash.toLowerCase());
  if (!receipt) notFound();

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-8 md:grid-cols-[1fr_1.4fr]">
      <aside className="space-y-4 rounded-3xl bg-white p-6">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-crema">
          {receipt.photoUrl ? <Image src={receipt.photoUrl} alt={receipt.caseName} fill sizes="400px" className="object-cover" /> : null}
        </div>
        <p className="font-serif text-3xl">{receipt.caseName}</p>
        <p className="text-secundario">
          {receipt.caseCode} · {receipt.ngoName}
        </p>
        <div className="rounded-2xl bg-salvia p-5">
          <p className="font-semibold">Cómo se repartió el aporte</p>
          <ul className="mt-2 space-y-1.5">
            {receipt.allocations.map((a) => (
              <li key={a.position} className="flex justify-between gap-3">
                <span>
                  {a.position}. {a.stageName}
                </span>
                <strong className="whitespace-nowrap">{formatAmount(a.amount)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="space-y-6 rounded-3xl bg-white p-8">
        <h1 className="flex items-center gap-4 text-4xl">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-bosque text-white">
            <IconoCheck className="h-7 w-7" />
          </span>
          Comprobante de aporte
        </h1>
        <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 rounded-2xl bg-gris p-5">
          <dt className="text-secundario">Monto</dt>
          <dd className="font-semibold">{formatAmount(receipt.amount)}</dd>
          <dt className="text-secundario">Caso</dt>
          <dd>
            {receipt.caseName} · {receipt.caseCode}
          </dd>
          <dt className="text-secundario">Fecha</dt>
          <dd>{formatDate(receipt.confirmedAt)}</dd>
          <dt className="text-secundario">Billetera</dt>
          <dd className="font-mono">{shortAccount(receipt.donorAccount)}</dd>
          <dt className="text-secundario">Transacción</dt>
          <dd className="flex flex-wrap gap-3">
            <span className="font-mono">
              {receipt.txHash.slice(0, 4)}…{receipt.txHash.slice(-4)}
            </span>
            <ExplorerLink href={receipt.txUrl}>Ver en Stellar Expert</ExplorerLink>
          </dd>
        </dl>
        <p className="text-sm text-secundario">
          La red demuestra que este pago llegó al contrato del caso y cómo se repartió entre sus etapas. Cada gasto se
          puede comprobar en el panel de transparencia del caso.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/casos/${receipt.caseCode}`} className={buttonClass("primario")}>
            Ver en qué se usa
          </Link>
          <Link href={`/huella/${receipt.donorAccount}`} className={buttonClass("secundario")}>
            Ver la Huella de esta billetera
          </Link>
        </div>
      </section>
    </main>
  );
}
