"use client";

import Link from "next/link";
import { buttonClass, EmptyState } from "@/components/ui";
import { useT } from "@/i18n/cliente";

/** Error al cargar una página del sitio: lo que pasó y cómo seguir, sin perder el menú. */
export default function ErrorPagina({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t, ruta } = useT();
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
      <EmptyState
        title={t("comun.error.titulo")}
        action={
          <>
            <button type="button" onClick={reset} className={buttonClass("primario")}>
              {t("comun.error.reintentar")}
            </button>
            <Link href={ruta("/")} className={buttonClass("secundario")}>
              {t("comun.irAlInicio")}
            </Link>
          </>
        }
      >
        {t("comun.error.texto")}
      </EmptyState>
    </main>
  );
}
