import { formatAmount, formatShortDate } from "@/app/_lib/format";
import { CATEGORY_LABELS } from "@/app/_lib/labels";
import { EmptyState, ExplorerLink, ValidationChip } from "@/components/ui";
import type { PublicCaseDetail } from "@/modules/catalog";
import { Reveal } from "@/components/movimiento/Reveal";

/**
 * Panel de transparencia: recibido, gastado y disponible; desglose por necesidad y la lista de gastos con
 * doble confirmación: la factura publicada y el pago al proveedor en Stellar Expert.
 */
export function TransparencyPanel({ transparency }: { transparency: PublicCaseDetail["transparency"] }) {
  const totals = [
    { label: "Recibido", value: transparency.received, plate: "bg-bosque text-white", sub: "text-white/80" },
    { label: "Gastado", value: transparency.spent, plate: "bg-arena text-texto", sub: "text-texto/75" },
    { label: "Disponible", value: transparency.available, plate: "bg-salvia text-texto", sub: "text-texto/75" },
  ];
  const maxCategory = Math.max(1, ...transparency.byCategory.map((c) => Number(c.amount)));

  return (
    <div className="space-y-5">
      <dl className="grid gap-4 sm:grid-cols-3">
        {totals.map((t, i) => (
          <Reveal variant="pop" delay={i} key={t.label} className={`rounded-[24px] p-6 ${t.plate}`}>
            <dt className={`rotulo ${t.sub}`}>{t.label}</dt>
            <dd className="cifras mt-1 font-display text-4xl font-bold">{formatAmount(t.value)}</dd>
          </Reveal>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-[1fr_2.3fr]">
        <Reveal as="section" variant="sube" className="rounded-[24px] bg-white p-6 ring-1 ring-arena/70" aria-labelledby="desglose">
          <h3 id="desglose" className="mb-4 text-2xl">
            Desglose por necesidad
          </h3>
          <dl className="space-y-3">
            {transparency.byCategory.map((c) => {
              const value = Number(c.amount);
              return (
                <div key={c.category}>
                  <div className="flex justify-between gap-4">
                    <dt className={value > 0 ? "" : "text-secundario"}>{CATEGORY_LABELS[c.category]}</dt>
                    <dd className={`cifras ${value > 0 ? "font-semibold" : "text-secundario"}`}>{formatAmount(c.amount)}</dd>
                  </div>
                  <div aria-hidden className="mt-1 h-1.5 rounded-full bg-arena/40">
                    <div className="h-full rounded-full bg-bosque" style={{ width: `${(value / maxCategory) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </dl>
        </Reveal>

        <Reveal as="section" variant="sube" delay={1} className="overflow-x-auto rounded-[24px] bg-white p-6 ring-1 ring-arena/70" aria-labelledby="gastos">
          <h3 id="gastos" className="mb-4 text-2xl">
            Gastos con doble confirmación
          </h3>
          {transparency.expenses.length === 0 ? (
            <EmptyState title="Todavía no hay gastos registrados." className="py-8">
              Cuando la ONG pague una etapa, aquí verás la factura y el pago al proveedor en Stellar.
            </EmptyState>
          ) : (
            <table className="w-full min-w-[40rem] text-left">
              <thead className="rotulo border-b border-arena text-secundario">
                <tr>
                  <th className="py-2 font-bold">Fecha</th>
                  <th className="py-2 font-bold">Etapa</th>
                  <th className="py-2 font-bold">Monto</th>
                  <th className="py-2 font-bold">Validación</th>
                  <th className="py-2 font-bold">Comprobar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-arena/40">
                {transparency.expenses.map((e) => (
                  <tr key={e.txUrl} className="transition-colors hover:bg-crema/60">
                    <td className="cifras py-3 pr-3 whitespace-nowrap">{formatShortDate(e.occurredOn)}</td>
                    <td className="py-3 pr-3">
                      {e.stagePosition}. {e.concept}
                      <span className="block text-sm text-secundario">
                        {e.providerName} · {e.invoiceNumber}
                      </span>
                    </td>
                    <td className="cifras py-3 pr-3 font-semibold whitespace-nowrap">{formatAmount(e.amount)}</td>
                    <td className="py-3 pr-3">
                      <ValidationChip level={e.validationLevel} short />
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <a href={e.invoiceUrl} target="_blank" rel="noreferrer" className="enlace">
                        Factura
                      </a>{" "}
                      · <ExplorerLink href={e.txUrl} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-4 text-sm text-secundario">
            El pago salió del contrato directo a la cuenta del proveedor. La factura publicada tiene el mismo hash que
            quedó en la red.
          </p>
        </Reveal>
      </div>
    </div>
  );
}
