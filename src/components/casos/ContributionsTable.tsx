import { formatAmount, formatShortDate } from "@/app/_lib/format";
import { ExplorerLink } from "@/components/ui";
import { shortAccount } from "@/lib/stellar-account";
import type { PublicContribution } from "@/modules/catalog";

/** Aportes recibidos: monto, fecha y dirección abreviada de la billetera. Sin nombres. */
export function ContributionsTable({
  contributions,
  myAccount,
}: {
  contributions: PublicContribution[];
  myAccount?: string | null;
}) {
  const latest = contributions[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[2.6fr_1fr]">
      <section className="overflow-x-auto rounded-2xl bg-white p-6" aria-label="Aportes recibidos">
        {contributions.length === 0 ? (
          <p className="text-secundario">Este caso aún no recibe aportes. ¡Puedes ser el primero!</p>
        ) : (
          <>
            <table className="w-full min-w-[32rem] text-left">
              <thead className="border-b border-arena text-sm text-secundario">
                <tr>
                  <th className="py-2 font-medium">Fecha</th>
                  <th className="py-2 font-medium">Billetera</th>
                  <th className="py-2 font-medium">Monto</th>
                  <th className="py-2 font-medium">Comprobar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-arena/40">
                {contributions.map((c) => (
                  <tr key={c.txUrl}>
                    <td className="py-3 pr-3">{formatShortDate(c.confirmedAt)}</td>
                    <td className="py-3 pr-3 font-mono text-sm">
                      {shortAccount(c.donorAccount)}{" "}
                      {myAccount === c.donorAccount ? (
                        <span className="ml-1 rounded-full bg-salvia px-2 py-0.5 font-sans text-xs font-semibold">Tú</span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3 font-semibold">{formatAmount(c.amount)}</td>
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
                {latest.allocations
                  .map((a) => `${formatAmount(a.amount)} a la etapa ${a.position}`)
                  .join(" y ")}
                .
              </p>
            ) : null}
          </>
        )}
      </section>

      <aside className="rounded-2xl bg-profundo p-6 text-white">
        <h3 className="text-2xl">Qué demuestra la red</h3>
        <p className="mt-3 text-white/90">
          Que hubo un pago, por cuánto y a quién, y que la factura publicada es la misma que se registró.
        </p>
        <p className="mt-3 text-white/90">
          <strong>Lo que no demuestra:</strong> que la factura sea auténtica. Eso lo revisa un profesional.
        </p>
      </aside>
    </div>
  );
}
