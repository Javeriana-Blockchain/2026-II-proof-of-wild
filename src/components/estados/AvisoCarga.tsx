"use client";

import { useT } from "@/i18n/cliente";

/**
 * Aviso para lectores de pantalla mientras llega la página. Es de cliente para que la pantalla de carga salga al
 * instante, sin esperar al servidor para saber el idioma.
 */
export function AvisoCarga({ clave }: { clave: "comun.cargando.pagina" | "comun.cargando.caso" }) {
  const { t } = useT();
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {t(clave)}
    </p>
  );
}
