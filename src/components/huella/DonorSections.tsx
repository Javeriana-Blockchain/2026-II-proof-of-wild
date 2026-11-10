import Image from "next/image";
import Link from "next/link";
import { formatAmount, formatDate, formatShortDate } from "@/app/_lib/format";
import { IconoCheck, IconoHuella } from "@/components/iconos";
import { buttonClass, ExplorerLink } from "@/components/ui";
import { explorerTxUrl } from "@/lib/explorer";
import type { DonorView } from "@/platform/db/repositories/donor";
import { ShareButtons } from "./ShareButtons";

/** Insignia «Huella verificada»: se activa con el primer aporte o voluntariado. */
export function BadgeCard({ view, sharePath, publicLink }: { view: DonorView; sharePath: string; publicLink?: string }) {
  const casesCount = view.cases.length;
  const active = casesCount > 0 || view.volunteerings.length > 0;
  const parts = [
    casesCount > 0 ? `Apoya ${casesCount} ${casesCount === 1 ? "caso" : "casos"}` : null,
    view.volunteerings.length > 0 ? "Voluntariado inscrito" : null,
  ].filter(Boolean);

  return (
    <section className="flex flex-col items-center gap-4 rounded-3xl bg-profundo p-8 text-center text-white">
      <span className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-arena bg-crema text-profundo">
        <IconoHuella className="h-12 w-12" />
        {active ? (
          <span className="absolute -right-1 -bottom-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-crema bg-bosque text-white">
            <IconoCheck />
          </span>
        ) : null}
      </span>
      <h2 className="text-4xl">Huella verificada</h2>
      {active ? (
        <>
          <p className="text-lg text-white/90">{parts.join(" · ")}</p>
          <p className="text-sm text-white/80">Cada aporte que la respalda se puede comprobar en Stellar Expert.</p>
          <ShareButtons path={sharePath} text={`Mi Huella verificada en Proof of Wild: ${parts.join(" · ")}.`} />
          {publicLink ? (
            <Link href={publicLink} className="font-medium underline">
              Ver la página pública de tu insignia
            </Link>
          ) : null}
        </>
      ) : (
        <p className="text-white/85">Se activa con tu primer aporte o voluntariado.</p>
      )}
    </section>
  );
}

export function DonorTotals({ view, own = true }: { view: DonorView; own?: boolean }) {
  const items: Array<[string, string, string]> = [
    ["Total aportado", formatAmount(view.totalAmount), "border-t-bosque"],
    [own ? "Casos que apoyas" : "Casos que apoya", String(view.cases.length), "border-t-salvia"],
    ["Voluntariados inscritos", String(view.volunteerings.length), "border-t-arena"],
  ];
  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      {items.map(([label, value, border]) => (
        <div key={label} className={`rounded-2xl border-t-4 bg-white p-5 ${border}`}>
          <dt className="text-sm text-secundario">{label}</dt>
          <dd className="mt-1 font-serif text-4xl">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Mis casos, historial de aportes y voluntariados de una billetera. */
export function DonorSections({
  view,
  explorerBaseUrl,
  photo,
  own,
}: {
  view: DonorView;
  explorerBaseUrl: string;
  photo: (path: string) => string;
  own: boolean;
}) {
  if (view.cases.length === 0 && view.volunteerings.length === 0) {
    return (
      <section className="space-y-4 rounded-3xl bg-white p-8 text-center">
        <p className="text-xl">{own ? "Aún no apadrinas ningún caso." : "Esta billetera aún no apoya ningún caso."}</p>
        <Link href="/casos" className={buttonClass("primario")}>
          Ver casos
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {view.cases.length > 0 ? (
        <section aria-labelledby="mis-casos" className="space-y-3">
          <h2 id="mis-casos" className="font-sans text-xl font-semibold">
            {own ? "Mis casos" : "Casos que apoya"}
          </h2>
          {view.cases.map((c) => (
            <article key={c.code} className="grid overflow-hidden rounded-3xl bg-white shadow-sm sm:grid-cols-[12rem_1fr] xl:grid-cols-[14rem_1fr_18rem]">
              <div className="relative min-h-40 sm:row-span-2 xl:row-span-1">
                {c.photoPath ? <Image src={photo(c.photoPath)} alt={c.name} fill sizes="224px" className="object-cover" /> : null}
              </div>
              <div className="space-y-2 p-5 pb-0 xl:pb-5">
                <p className="text-sm text-secundario">
                  {c.code} · {c.ngoName}
                </p>
                <h3 className="text-3xl">{c.name}</h3>
                {c.lastUpdate ? (
                  <p>
                    <strong>Última actualización:</strong> {formatShortDate(c.lastUpdate.at)} · {c.lastUpdate.text}
                  </p>
                ) : null}
                <Link href={`/casos/${c.code}`} className="font-medium text-bosque underline">
                  Ver el caso
                </Link>
              </div>
              <div className="m-5 self-start rounded-2xl bg-salvia p-5 xl:self-center">
                <p className="font-semibold">{own ? "Tu aporte se usó en" : "Su aporte se usó en"}</p>
                <ul className="mt-2 space-y-1">
                  {c.allocations.map((a) => (
                    <li key={a.stageName} className="flex justify-between gap-3">
                      <span>{a.stageName}</span>
                      <strong className="whitespace-nowrap">{formatAmount(a.amount)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-3xl bg-white p-6" aria-labelledby="historial">
          <h2 id="historial" className="mb-3 border-b border-arena pb-2 font-sans text-xl font-semibold">
            Historial de aportes
          </h2>
          {view.contributions.length === 0 ? (
            <p className="text-secundario">Sin aportes todavía.</p>
          ) : (
            <ul className="divide-y divide-arena/40">
              {view.contributions.map((c) => (
                <li key={c.txHash} className="flex items-start justify-between gap-3 py-3">
                  <span className="min-w-0">
                    {formatShortDate(c.confirmedAt)} · {c.caseName}
                    <span className="mt-1 flex gap-4 text-sm">
                      <Link href={`/comprobante/${c.txHash}`} className="font-medium text-bosque underline">
                        Comprobante
                      </Link>
                      <ExplorerLink href={explorerTxUrl(explorerBaseUrl, c.txHash)} />
                    </span>
                  </span>
                  <strong className="whitespace-nowrap">{formatAmount(c.amount)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-3xl bg-white p-6" aria-labelledby="voluntariados">
          <h2 id="voluntariados" className="mb-3 border-b border-arena pb-2 font-sans text-xl font-semibold">
            {own ? "Mis voluntariados" : "Voluntariados"}
          </h2>
          {view.volunteerings.length === 0 ? (
            <p className="text-secundario">
              {own ? (
                <>
                  Aún no te inscribes.{" "}
                  <Link href="/voluntariados" className="font-medium text-bosque underline">
                    Ver voluntariados
                  </Link>
                </>
              ) : (
                "Sin voluntariados inscritos."
              )}
            </p>
          ) : (
            <ul className="space-y-3">
              {view.volunteerings.map((v) => (
                <li key={v.ngoName + v.date} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    {v.ngoName} · {formatDate(v.date)}
                  </span>
                  <span className="rounded-full bg-crema px-3 py-0.5 text-sm font-semibold">Inscrito</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
