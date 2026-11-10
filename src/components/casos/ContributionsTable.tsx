import Link from "next/link";
import { formatAmount, formatShortDate } from "@/app/_lib/format";
import { buttonClass, EmptyState, ExplorerLink } from "@/components/ui";
import { shortAccount } from "@/lib/stellar-account";
import type { PublicContribution } from "@/modules/catalog";
import { Reveal } from "@/components/movimiento/Reveal";

/** Aportes recibidos: monto, fecha y dirección abreviada de la billetera. Sin nombres. */
export function ContributionsTable({
  contributions,
  myAccount,
  sponsorHref,
}: {
  contributions: PublicContribution[];
  myAccount?: string | null;
  /** Enlace para apadrinar desde el estado vacío; nulo si el caso ya no recibe aportes. */
  sponsorHref?: string | null;
}) {
  const latest = contributions[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[2.6fr_1fr]">
      {contributions.length === 0 ? (
        <EmptyState
          title="Este caso aún no recibe aportes."
          action={
            sponsorHref ? (
              <Link href={sponsorHref} scroll={false} className={buttonClass("primario")}>
                Apadrinar este caso
              </Link>
            ) : undefined
          }
        >
          ¡Puedes ser el primero! Tu aporte aparecerá aquí con su enlace a Stellar Expert.
        </EmptyState>
      ) : (
        <Reveal as="section" variant="sube" className="overflow-x-auto rounded-[24px] bg-white p-6 ring-1 ring-arena/70" aria-label="Aportes recibidos">
          <table className="w-full min-w-[32rem] text-left">
            <thead className="rotulo border-b border-arena text-secundario">
              <tr>
                <th className="py-2 font-bold">Fecha</th>
                <th className="py-2 font-bold">Billetera</th>
                <th className="py-2 font-bold">Monto</th>
                <th className="py-2 font-bold">Comprobar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arena/40">
              {contributions.map((c) => (
                <tr key={c.txUrl} className="transition-colors hover:bg-crema/60">
                  <td className="cifras py-3 pr-3">{formatShortDate(c.confirmedAt)}</td>
                  <td className="py-3 pr-3 font-mono text-sm">
                    {shortAccount(c.donorAccount)}{" "}
                    {myAccount === c.donorAccount ? (
                      <span className="ml-1 rounded-md bg-salvia px-2 py-0.5 font-sans text-xs font-semibold">Tú</span>
                    ) : null}
                  </td>
                  <td className="cifras py-3 pr-3 font-semibold">{formatAmount(c.amount)}</td>
                  <td className="py-3">
                    <ExplorerLink href={c.txUrl} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {latest ? (
            <p className="mt-4 text-sm text-secundario">
              {contributions.length === 1
                ? "Es el primer aporte de este caso. Se repartió así: "
                : "El aporte más reciente se repartió así: "}
              {latest.allocations.map((a) => `${formatAmount(a.amount)} a la etapa ${a.position}`).join(" y ")}.
            </p>
          ) : null}
        </Reveal>
      )}

      <Reveal as="aside" variant="pop" delay={1} className="rounded-[24px] bg-profundo p-6 text-white">
        <h3 className="text-2xl">Qué demuestra la red</h3>
        <p className="mt-3 text-white/90">
          Que hubo un pago, por cuánto y a quién, y que la factura publicada es la misma que se registró.
        </p>
        <p className="mt-3 text-white/90">
          <strong>Lo que no demuestra:</strong> que la factura sea auténtica. Eso lo revisa un profesional.
        </p>
      </Reveal>
    </div>
  );
}
