import { ContourField } from "@/components/mapa/ContourField";
import { Skeleton } from "@/components/ui";

/** Aviso para lectores de pantalla mientras llega la página. */
function Aviso({ texto }: { texto: string }) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {texto}
    </p>
  );
}

/** Carga general del sitio: una banda del mapa y bloques que respiran en el lugar del contenido. */
export function CargandoPagina() {
  return (
    <main aria-busy="true">
      <Aviso texto="Cargando la página…" />
      <section className="relative isolate overflow-hidden bg-profundo">
        <ContourField variant="noche" seed={3} className="absolute inset-0 -z-10 h-full w-full animate-brillo" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="h-14 w-11/12 animate-brillo rounded-2xl bg-white/15" />
            <div className="h-14 w-3/4 animate-brillo rounded-2xl bg-white/15" />
            <div className="h-6 w-1/2 animate-brillo rounded-xl bg-white/10" />
            <div className="grid gap-3 pt-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-36 animate-brillo rounded-2xl bg-white/10" />
              ))}
            </div>
          </div>
          <div className="hidden aspect-[4/5] animate-brillo rounded-[32px] bg-white/10 lg:block" />
        </div>
      </section>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-14 sm:px-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-72 w-full rounded-[28px]" />
      </div>
    </main>
  );
}

/** Carga del detalle de un caso: la foto, el bloque de apoyo y la ruta, en el mismo lugar donde aparecerán. */
export function CargandoCaso() {
  return (
    <main aria-busy="true">
      <Aviso texto="Cargando el caso…" />
      <section className="mx-auto max-w-7xl px-4 pt-6 pb-10 sm:px-8">
        <Skeleton className="mb-6 h-5 w-36" />
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr]">
          <Skeleton className="aspect-[4/3] w-full rounded-[32px]" />
          <div className="space-y-4">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <div className="h-48 w-full animate-brillo rounded-[28px] bg-profundo/80" />
          </div>
        </div>
      </section>
      <section className="border-y border-arena/70 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-12 sm:px-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-3">
              <div className="h-12 w-12 animate-brillo rounded-full border-2 border-dashed border-arena" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
