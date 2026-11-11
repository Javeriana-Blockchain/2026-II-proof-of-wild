import Link from "next/link";
import { ContourField } from "@/components/mapa/ContourField";
import { buttonClass } from "@/components/ui";

/** Contenido de la página no encontrada: un pedazo del mapa sin ruta, y el camino de vuelta. */
export function NoEncontrado() {
  return (
    <main className="relative isolate overflow-hidden bg-profundo text-white">
      <ContourField variant="noche" seed={9} className="absolute inset-0 -z-10 h-full w-full" />
      <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 py-20 text-center">
        <svg viewBox="0 0 64 64" aria-hidden className="h-16 w-16 text-salvia" fill="none">
          <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5 6" />
          <path d="M24 24l16 16M40 24 24 40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <h1 className="mt-6 text-5xl font-bold sm:text-6xl">Esta ruta no está en el mapa</h1>
        <p className="mt-4 max-w-xl text-xl text-white/85">
          La página que buscas no existe o el enlace está incompleto. Revisa el código del caso o vuelve al inicio.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/#casos" className={buttonClass("arena")}>
            Ver casos
          </Link>
          <Link href="/" className={buttonClass("contorno")}>
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
