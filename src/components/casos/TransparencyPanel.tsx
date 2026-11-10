import { formatAmount, formatShortDate } from "@/app/_lib/format";
import { CATEGORY_LABELS } from "@/app/_lib/labels";
import { ExplorerLink, ValidationChip } from "@/components/ui";
import type { PublicCaseDetail } from "@/modules/catalog";

/**
 * Panel de transparencia: recibido, gastado y disponible; desglose por necesidad y la lista de gastos con
 * doble confirmación: la factura publicada y el pago al proveedor en Stellar Expert.
 */
export function TransparencyPanel({ transparency }: { transparency: PublicCaseDetail["transparency"] }) {
  const totals = [
    { label: "Recibido", value: transparency.received, border: "border-t-bosque" },
    { label: "Gastado", value: transparency.spent, border: "border-t-arena" },
    { label: "Disponible", value: transparency.available, border: "border-t-salvia" },
  ];

  return (
    <div className="space-y-5">
      <dl className="grid gap-4 sm:grid-cols-3">
        {totals.map((t) => (
          <div key={t.label} className={`rounded-2xl border-t-4 bg-white p-5 ${t.border}`}>
            <dt className="text-sm text-secundario">{t.label}</dt>
            <dd className="mt-1 font-serif text-4xl">{formatAmount(t.value)}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-[1fr_2.3fr]">
        <section className="rounded-2xl bg-white p-6" aria-labelledby="desglose">
          <h3 id="desglose" className="mb-3 font-sans text-lg font-semibold">
            Desglose por necesidad
          </h3>
          <dl className="space-y-2">
            {transparency.byCategory.map((c) => (
              <div key={c.category} className="flex justify-between gap-4">
                <dt className={Number(c.amount) > 0 ? "" : "text-secundario"}>{CATEGORY_LABELS[c.category]}</dt>
                <dd className={Number(c.amount) > 0 ? "font-semibold" : "text-secundario"}>{formatAmount(c.amount)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="overflow-x-auto rounded-2xl bg-white p-6" aria-labelledby="gastos">
          <h3 id="gastos" className="mb-3 font-sans text-lg font-semibold">
            Gastos con doble confirmación
          </h3>
          {transparency.expenses.length === 0 ? (
            <p className="text-secundario">Todavía no hay gastos registrados.</p>
          ) : (
            <table className="w-full min-w-[40rem] text-left">
              <thead className="border-b border-arena text-sm text-secundario">
                <tr>
                  <th className="py-2 font-medium">Fecha</th>
                  <th className="py-2 font-medium">Etapa</th>
                  <th className="py-2 font-medium">Monto</th>
                  <th className="py-2 font-medium">Validación</th>
                  <th className="py-2 font-medium">Comprobar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-arena/40">
                {transparency.expenses.map((e) => (
                  <tr key={e.txUrl}>
                    <td className="py-3 pr-3 whitespace-nowrap">{formatShortDate(e.occurredOn)}</td>
                    <td className="py-3 pr-3">
                      {e.stagePosition}. {e.concept}
                      <span className="block text-sm text-secundario">
                        {e.providerName} · {e.invoiceNumber}
                      </span>
                    </td>
                    <td className="py-3 pr-3 font-semibold whitespace-nowrap">{formatAmount(e.amount)}</td>
                    <td className="py-3 pr-3">
                      <ValidationChip level={e.validationLevel} short />
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <a href={e.invoiceUrl} target="_blank" rel="noreferrer" className="font-medium text-bosque underline">
                        Factura
                      </a>{" "}
                      · <ExplorerLink href={e.txUrl} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-sm text-secundario">
            El pago salió del contrato directo a la cuenta del proveedor. La factura publicada tiene el mismo hash que
            quedó en la red.
          </p>
        </section>
      </div>
    </div>
  );
}
