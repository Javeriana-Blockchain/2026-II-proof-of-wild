import Link from "next/link";
import { buttonClass, EmptyState, ExplorerLink } from "@/components/ui";
import { getT } from "@/i18n/servidor";
import { shortAccount } from "@/lib/stellar-account";
import type { PublicContribution } from "@/modules/catalog";
import { Reveal } from "@/components/movimiento/Reveal";

/**
 * Aportes recibidos: monto, fecha y dirección abreviada de la billetera. Sin nombres. Componente de servidor:
 * `sponsorHref` llega sin prefijo de idioma y aquí se localiza.
 */
export async function ContributionsTable({
  contributions,
  myAccount,
  sponsorHref,
}: {
  contributions: PublicContribution[];
  myAccount?: string | null;
  /** Enlace para apadrinar desde el estado vacío; nulo si el caso ya no recibe aportes. */
  sponsorHref?: string | null;
}) {
  const { t, rich, ruta, formatAmount, formatShortDate } = await getT();
  const latest = contributions[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[2.6fr_1fr]">
      {contributions.length === 0 ? (
        <EmptyState
          title={t("casos.aportes.vacioTitulo")}
          action={
            sponsorHref ? (
              <Link href={ruta(sponsorHref)} scroll={false} className={buttonClass("primario")}>
                {t("casos.apadrinarEsteCaso")}
              </Link>
            ) : undefined
          }
        >
          {t("casos.aportes.vacioTexto")}
        </EmptyState>
      ) : (
        <Reveal
          as="section"
          variant="sube"
          className="overflow-x-auto rounded-[24px] bg-white p-6 ring-1 ring-arena/70"
          aria-label={t("casos.aportes.titulo")}
        >
          <table className="w-full min-w-[32rem] text-left">
            <thead className="rotulo border-b border-arena text-secundario">
              <tr>
                <th className="py-2 font-bold">{t("casos.col.fecha")}</th>
                <th className="py-2 font-bold">{t("casos.col.billetera")}</th>
                <th className="py-2 font-bold">{t("casos.col.monto")}</th>
                <th className="py-2 font-bold">{t("casos.col.comprobar")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arena/40">
              {contributions.map((c) => (
                <tr key={c.txUrl} className="transition-colors hover:bg-crema/60">
                  <td className="cifras py-3 pr-3">{formatShortDate(c.confirmedAt)}</td>
                  <td className="py-3 pr-3 font-mono text-sm">
                    {shortAccount(c.donorAccount)}{" "}
                    {myAccount === c.donorAccount ? (
                      <span className="ml-1 rounded-md bg-salvia px-2 py-0.5 font-sans text-xs font-semibold">
                        {t("casos.aportes.tu")}
                      </span>
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
              {t(contributions.length === 1 ? "casos.aportes.repartoPrimero" : "casos.aportes.repartoReciente", {
                reparto: latest.allocations
                  .map((a) => t("casos.aportes.repartoItem", { monto: formatAmount(a.amount), n: a.position }))
                  .join(t("casos.aportes.repartoSeparador")),
              })}
            </p>
          ) : null}
        </Reveal>
      )}

      <Reveal as="aside" variant="pop" delay={1} className="rounded-[24px] bg-profundo p-6 text-white">
        <h3 className="text-2xl">{t("casos.aportes.redTitulo")}</h3>
        <p className="mt-3 text-white/90">{t("casos.aportes.redSi")}</p>
        <p className="mt-3 text-white/90">{rich("casos.aportes.redNo", { b: (s) => <strong>{s}</strong> })}</p>
      </Reveal>
    </div>
  );
}
