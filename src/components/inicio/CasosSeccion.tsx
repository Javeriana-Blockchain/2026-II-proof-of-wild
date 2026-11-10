import Link from "next/link";
import { CaseRow, RecoveredCard } from "@/components/casos/CaseRow";
import { buttonClass, EmptyState } from "@/components/ui";
import type { PublicCaseSummary } from "@/modules/catalog";
import { Reveal } from "@/components/movimiento/Reveal";

/** «Casos»: primero los que están en tratamiento, con su ruta; después los recuperados. */
export function CasosSeccion({ cases }: { cases: PublicCaseSummary[] }) {
  const enTratamiento = cases.filter((c) => !c.recovered);
  const recuperados = cases.filter((c) => c.recovered);

  return (
    <section id="casos" aria-labelledby="titulo-casos" className="border-t border-arena/70">
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-20 sm:px-8">
        <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <Reveal as="h2" variant="sube" id="titulo-casos" className="text-5xl sm:text-6xl">
            Casos
          </Reveal>
          <Reveal variant="sube" delay={1} className="space-y-3 lg:justify-self-end">
            <p className="max-w-lg text-xl text-secundario">
              Conoce a los animales que puedes apadrinar y sigue su recuperación paso a paso.
            </p>
            {cases.length > 0 ? (
              <p className="cifras flex flex-wrap gap-2 text-sm font-semibold">
                <span className="rounded-md bg-arena px-2.5 py-1">{enTratamiento.length} en tratamiento</span>
                <span className="rounded-md bg-bosque px-2.5 py-1 text-white">{recuperados.length} recuperados</span>
              </p>
            ) : null}
          </Reveal>
        </header>

        {cases.length === 0 ? (
          <EmptyState
            title="Aún no hay casos publicados."
            action={
              <Link href="/ong/registro" className={buttonClass("primario")}>
                Soy ONG y quiero aparecer
              </Link>
            }
          >
            Cuando una ONG publique un caso, aquí verás su historia y la ruta de su tratamiento.
          </EmptyState>
        ) : (
          <>
            {enTratamiento.length === 0 ? (
              <EmptyState title="Hoy no hay casos en tratamiento.">
                Todos los animales de la página terminaron su recuperación. Mira cómo les fue más abajo.
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
                  Casos recuperados
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
