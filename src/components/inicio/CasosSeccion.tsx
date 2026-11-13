import Link from "next/link";
import { CaseRow, RecoveredCard } from "@/components/casos/CaseRow";
import { buttonClass, EmptyState } from "@/components/ui";
import type { PublicCaseSummary } from "@/modules/catalog";
import { Reveal } from "@/components/movimiento/Reveal";
import { getT } from "@/i18n/servidor";

/** «Casos»: primero los que están en tratamiento, con su ruta; después los recuperados. */
export async function CasosSeccion({ cases }: { cases: PublicCaseSummary[] }) {
  const { t, tn, ruta } = await getT();
  const enTratamiento = cases.filter((c) => !c.recovered);
  const recuperados = cases.filter((c) => c.recovered);

  return (
    <section id="casos" aria-labelledby="titulo-casos" className="border-t border-arena/70">
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-20 sm:px-8">
        <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <Reveal as="h2" variant="sube" id="titulo-casos" className="text-5xl sm:text-6xl">
            {t("inicio.casos.titulo")}
          </Reveal>
          <Reveal variant="sube" delay={1} className="space-y-3 lg:justify-self-end">
            <p className="max-w-lg text-xl text-secundario">
              {t("inicio.casos.subtitulo")}
            </p>
            {cases.length > 0 ? (
              <p className="cifras flex flex-wrap gap-2 text-sm font-semibold">
                <span className="rounded-md bg-arena px-2.5 py-1">{t("inicio.casos.enTratamiento", { n: enTratamiento.length })}</span>
                <span className="rounded-md bg-bosque px-2.5 py-1 text-white">{tn("inicio.casos.recuperados", recuperados.length)}</span>
              </p>
            ) : null}
          </Reveal>
        </header>

        {cases.length === 0 ? (
          <EmptyState
            title={t("inicio.casos.vacio.titulo")}
            action={
              <Link href={ruta("/ong/registro")} className={buttonClass("primario")}>
                {t("inicio.soyOngAparecer")}
              </Link>
            }
          >
            {t("inicio.casos.vacio.texto")}
          </EmptyState>
        ) : (
          <>
            {enTratamiento.length === 0 ? (
              <EmptyState title={t("inicio.casos.sinTratamiento.titulo")}>
                {t("inicio.casos.sinTratamiento.texto")}
              </EmptyState>
            ) : (
              <div className="space-y-6">
                {enTratamiento.map((item, i) => (
                  <CaseRow key={item.code} item={item} delay={i} />
                ))}
              </div>
            )}

            {recuperados.length > 0 ? (
              <section aria-labelledby="recuperados" className="space-y-6">
                <Reveal as="h3" variant="sube" id="recuperados" className="text-4xl">
                  {t("inicio.casos.recuperadosTitulo")}
                </Reveal>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {recuperados.map((item, i) => (
                    <RecoveredCard key={item.code} item={item} delay={i} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
