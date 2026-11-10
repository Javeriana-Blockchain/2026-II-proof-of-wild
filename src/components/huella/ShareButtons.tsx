"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui";

/** Compartir la insignia: LinkedIn (compartir enlace) y redes (menú del teléfono o copiar el enlace). */
export function ShareButtons({ path, text }: { path: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const url = () => `${window.location.origin}${path}`;

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url())}`, "_blank", "noopener")}
        className={buttonClass("arena")}
      >
        Compartir en LinkedIn
      </button>
      <button
        type="button"
        onClick={async () => {
          if (navigator.share) await navigator.share({ title: "Huella verificada · Proof of Wild", text, url: url() }).catch(() => {});
          else {
            await navigator.clipboard.writeText(url()).catch(() => {});
            setCopied(true);
          }
        }}
        className={buttonClass("contorno")}
      >
        {copied ? "Enlace copiado" : "Compartir en redes"}
      </button>
    </div>
  );
}
