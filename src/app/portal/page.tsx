import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { formatAmount, formatShortDate } from "@/app/_lib/format";
import { VALIDATION_LABELS } from "@/app/_lib/labels";
import { requireSession } from "@/app/_lib/session";
import { buttonClass, Chip, ExplorerLink } from "@/components/ui";
import { explorerTxUrl } from "@/lib/explorer";
import { fromStroops, sumAmounts, toStroops } from "@/lib/amount";
import { getExplorerEnv } from "@/platform/config/env";
import { evidenceUrl, getCatalogService } from "@/platform/container";
import { getDb } from "@/platform/db/client";
import { getPortalData } from "@/platform/db/repositories/portal";
import { DbRecordStore } from "@/platform/db/repositories/records";
import { RecordDialog, type PortalCaseOption } from "./RecordDialog";

export const metadata: Metadata = { title: "Portal de la ONG" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ registrar?: string; caso?: string }> };

const KIND_CHIP = { gasto: "Gasto", aporte: "Aporte recibido", hito: "Hito" } as const;

/** Pantalla 9: el portal de la ONG. Lo que registra aquí aparece en la línea de tiempo y el panel de cada caso. */
export default async function PortalPage({ searchParams }: Props) {
  const session = await requireSession("/portal", "ong");
  const { registrar, caso } = await searchParams;
  const db = getDb();
  const data = await getPortalData(db, session.ngoId!);
  if (!data) return null;

  const explorer = getExplorerEnv().EXPLORER_BASE_URL;
  const own = (await getCatalogService().listCases()).filter((c) => c.ngo.slug === data.ngo.slug);
  const store = new DbRecordStore(db);
  const funding = await Promise.all(own.map((c) => store.caseForNgo(data.ngo.id, c.code)));
  const options: PortalCaseOption[] = own.map((c, i) => ({
    code: c.code,
    name: c.commonName ?? "Especie reservada",
    stages: (funding[i]?.stages ?? []).map((s) => {
      const available = toStroops(s.covered) - toStroops(s.spent);
      return { position: s.position, name: s.name, available: fromStroops(available > 0n ? available : 0n) };
    }),
  }));
  const spentOf = (i: number) => sumAmounts((funding[i]?.stages ?? []).map((s) => s.spent));
  const active = own.filter((c) => !c.recovered).length;

  const kpis: Array<[string, string, string]> = [
    ["Casos activos", String(active), "border-t-bosque"],
    ["Recibido", formatAmount(data.totals.received), "border-t-salvia"],
    ["Gastado", formatAmount(data.totals.spent), "border-t-arena"],
    ["Pendientes", String(data.pending.length), "border-t-error"],
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl">Hola, {data.ngo.name}</h1>
          <p className="mt-1 text-lg text-secundario">
            Registra los avances y los gastos de tus casos. Cada registro queda en Stellar.{" "}
            <Link href={`/ong/${data.ngo.slug}`} className="font-medium text-bosque underline">
              Ver mi perfil público
            </Link>
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/portal?registrar=hito" scroll={false} className={buttonClass("secundario", "py-3")}>
            Registrar hito
          </Link>
          <Link href="/portal?registrar=gasto" scroll={false} className={buttonClass("primario", "py-3")}>
            Registrar gasto
          </Link>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(([label, value, border]) => (
          <div key={label} className={`rounded-2xl border-t-4 bg-white p-5 ${border}`}>
            <dt className="text-sm text-secundario">{label}</dt>
            <dd className="mt-1 font-serif text-4xl">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[2.4fr_1fr]">
        <section className="overflow-x-auto rounded-3xl bg-white p-6" aria-labelledby="mis-casos">
          <h2 id="mis-casos" className="mb-3 text-3xl">
            Mis casos
          </h2>
          <table className="w-full min-w-[44rem] text-left">
            <thead className="border-b border-arena text-sm text-secundario">
              <tr>
                <th className="py-2 font-medium">Caso</th>
                <th className="py-2 font-medium">Etapa actual</th>
                <th className="py-2 font-medium">Costo total</th>
                <th className="py-2 font-medium">Recaudado</th>
                <th className="py-2 font-medium">Gastado</th>
                <th className="py-2 font-medium">Registrar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arena/40">
              {own.map((c, i) => (
                <tr key={c.code}>
                  <td className="py-3 pr-3">
                    <span className="flex items-center gap-3">
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-crema">
                        {c.photoUrl ? <Image src={c.photoUrl} alt="" fill sizes="48px" className="object-cover" /> : null}
                      </span>
                      <span>
                        <strong className="block">{c.commonName ?? "Especie reservada"}</strong>
                        <span className="text-sm text-secundario">{c.code}</span>
                      </span>
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <Chip tone={c.chip.tone === "logro" ? "logro" : "etapa"} className="text-xs">
                      {c.chip.label}
                    </Chip>
                  </td>
                  <td className="py-3 pr-3">{formatAmount(c.goal)}</td>
                  <td className="py-3 pr-3">{formatAmount(c.raised)}</td>
                  <td className="py-3 pr-3">{formatAmount(spentOf(i))}</td>
                  <td className="py-3">
                    <span className="flex gap-2">
                      <Link href={`/portal?registrar=hito&caso=${c.code}`} scroll={false} className={buttonClass("secundario", "px-4 py-1.5 text-sm")}>
                        {c.recovered ? "Seguimiento" : "Hito"}
                      </Link>
                      {c.recovered ? null : (
                        <Link href={`/portal?registrar=gasto&caso=${c.code}`} scroll={false} className={buttonClass("primario", "px-4 py-1.5 text-sm")}>
                          Gasto
                        </Link>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="space-y-3 rounded-3xl bg-white p-6" aria-labelledby="pendientes">
          <h2 id="pendientes" className="text-3xl">
            Pendientes
          </h2>
          {data.pending.length === 0 ? (
            <p className="text-secundario">No tienes pendientes. ¡Todo está al día!</p>
          ) : (
            data.pending.map((p) => (
              <p key={p.title + p.detail} className={`rounded-2xl border-l-4 bg-gris p-4 ${p.tone === "accion" ? "border-error" : "border-arena"}`}>
                <strong className="block">{p.title}</strong>
                <span className="text-secundario">{p.detail}</span>
              </p>
            ))
          )}
        </section>
      </div>

      <section className="overflow-x-auto rounded-3xl bg-white p-6" aria-labelledby="ultimos">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="ultimos" className="text-3xl">
            Últimos registros
          </h2>
          <p className="text-sm text-secundario">Lo mismo que ven los donantes en el panel de transparencia de cada caso.</p>
        </div>
        {data.records.length === 0 ? (
          <p className="text-secundario">Aún no hay registros.</p>
        ) : (
          <table className="w-full min-w-[48rem] text-left">
            <thead className="border-b border-arena text-sm text-secundario">
              <tr>
                <th className="py-2 font-medium">Fecha</th>
                <th className="py-2 font-medium">Tipo</th>
                <th className="py-2 font-medium">Caso y etapa</th>
                <th className="py-2 font-medium">Monto</th>
                <th className="py-2 font-medium">Estado</th>
                <th className="py-2 font-medium">Comprobantes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arena/40">
              {data.records.map((r) => (
                <tr key={`${r.kind}-${r.txHash}`}>
                  <td className="py-3 pr-3 whitespace-nowrap">{formatShortDate(r.at)}</td>
                  <td className="py-3 pr-3">
                    <Chip tone="etapa" className="text-xs">
                      {KIND_CHIP[r.kind]}
                    </Chip>
                  </td>
                  <td className="py-3 pr-3">
                    {r.caseCode} · {r.detail}
                  </td>
                  <td className="py-3 pr-3 font-semibold whitespace-nowrap">{r.amount ? formatAmount(r.amount) : "—"}</td>
                  <td className="py-3 pr-3">
                    <Chip tone={r.status === "por_confirmar" ? "borde" : "salvia"} className="text-xs">
                      {r.status === "en_la_red"
                        ? "En la red"
                        : r.status === "por_confirmar"
                          ? "Por confirmar"
                          : VALIDATION_LABELS[r.status].short}
                    </Chip>
                  </td>
                  <td className="py-3 whitespace-nowrap">
                    {r.fileKey ? (
                      <>
                        <a href={evidenceUrl(r.fileKey)} target="_blank" rel="noreferrer" className="font-medium text-bosque underline">
                          {r.kind === "gasto" ? "Factura" : "Foto"}
                        </a>{" "}
                        ·{" "}
                      </>
                    ) : null}
                    {r.txHash ? <ExplorerLink href={explorerTxUrl(explorer, r.txHash)} /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {registrar === "gasto" || registrar === "hito" ? (
        <RecordDialog
          kind={registrar}
          cases={registrar === "gasto" ? options.filter((o) => !own.find((c) => c.code === o.code)?.recovered) : options}
          providers={data.providers}
          ngoAccount={data.ngo.stellarAccount}
          explorerBaseUrl={explorer}
          initialCase={caso}
        />
      ) : null}
    </main>
  );
}
