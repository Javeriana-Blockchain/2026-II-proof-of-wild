"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui";
import { useT } from "@/i18n/cliente";

/**
 * Compartir la insignia: LinkedIn (compartir enlace) y redes (menú del teléfono o copiar el enlace). `path` llega ya
 * en el idioma de la página; `text`, ya traducido.
 */
export function ShareButtons({ path, text }: { path: string; text: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const url = () => `${window.location.origin}${path}`;

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url())}`, "_blank", "noopener")}
        className={buttonClass("arena")}
      >
        {t("huella.compartir.linkedin")}
      </button>
      <button
        type="button"
        onClick={async () => {
          if (navigator.share) await navigator.share({ title: t("huella.compartir.titulo"), text, url: url() }).catch(() => {});
          else {
            await navigator.clipboard.writeText(url()).catch(() => {});
            setCopied(true);
          }
        }}
        className={buttonClass("contorno")}
      >
        {copied ? t("huella.compartir.copiado") : t("huella.compartir.redes")}
      </button>
    </div>
  );
}
