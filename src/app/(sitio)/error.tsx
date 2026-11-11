"use client";

import Link from "next/link";
import { buttonClass, EmptyState } from "@/components/ui";

/** Error al cargar una página del sitio: lo que pasó y cómo seguir, sin perder el menú. */
export default function ErrorPagina({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
      <EmptyState
        title="No pudimos cargar esta página."
        action={
          <>
            <button type="button" onClick={reset} className={buttonClass("primario")}>
              Reintentar
            </button>
            <Link href="/" className={buttonClass("secundario")}>
              Ir al inicio
            </Link>
          </>
        }
      >
        Puede ser la conexión o la red de pruebas. Vuelve a intentarlo en unos segundos.
      </EmptyState>
    </main>
  );
}
