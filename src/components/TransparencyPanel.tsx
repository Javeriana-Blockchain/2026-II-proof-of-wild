import { formatAmount, formatDate } from "@/app/_lib/format";
import { CATEGORY_LABELS } from "@/app/_lib/labels";
import type { PublicCaseDetail } from "@/modules/catalog";

type Props = { transparency: PublicCaseDetail["transparency"]; assetCode: string };

export function TransparencyPanel({ transparency, assetCode }: Props) {
  const { summary, contributions, expenses } = transparency;
  const rows: Array<[string, string]> = [
    ["Aportes recibidos", summary.received],
    ["Gastos respaldados", summary.spentVerified],
    ["Gastos pendientes de verificación", summary.spentPending],
    ["Saldo disponible", summary.available],
  ];

  return (
    <section aria-labelledby="transparencia" className="space-y-5">
      <h2 id="transparencia" className="text-xl font-semibold">
        Transparencia
      </h2>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-black/10 bg-white p-3">
            <dt className="text-xs text-black/60">{label}</dt>
            <dd className="mt-1 font-medium">{formatAmount(value, assetCode)}</dd>
          </div>
        ))}
      </dl>

      <div>
        <h3 className="font-medium">Aportes</h3>
        {contributions.length === 0 ? (
          <p className="text-sm text-black/60">Aún no hay aportes confirmados.</p>
        ) : (
          <ul className="mt-2 divide-y divide-black/10 text-sm">
            {contributions.map((c) => (
              <li key={c.txUrl} className="flex justify-between py-2">
                <span>
                  {formatAmount(c.amount, c.assetCode)} · {formatDate(c.confirmedAt)}
                </span>
                <a className="underline" href={c.txUrl} target="_blank" rel="noreferrer">
                  ver en Stellar
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="font-medium">Gastos</h3>
        {expenses.length === 0 ? (
          <p className="text-sm text-black/60">Aún no hay gastos registrados.</p>
        ) : (
          <ul className="mt-2 divide-y divide-black/10 text-sm">
            {expenses.map((e) => (
              <li key={e.anchorUrl} className="flex justify-between gap-3 py-2">
                <span>
                  {CATEGORY_LABELS[e.category]} · {formatAmount(e.amount, assetCode)} ·{" "}
                  <strong>{e.status === "verificado" ? "Verificado" : "Pendiente de verificación"}</strong>
                </span>
                <a className="underline" href={e.validationUrl ?? e.anchorUrl} target="_blank" rel="noreferrer">
                  ver en Stellar
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-black/60">
        Stellar demuestra que hubo un pago y que un documento no cambió después de registrarse. No demuestra que
        una factura sea auténtica ni que el animal haya sido bien atendido: eso lo valida una persona del centro.
      </p>
    </section>
  );
}
