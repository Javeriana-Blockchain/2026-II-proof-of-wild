"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Muestra cada elemento con `data-reveal` cuando entra en pantalla (una sola vez). Observa también lo que aparece
 * después, al navegar o al cargar una lista. Si el navegador no tiene IntersectionObserver, el script de la cabecera
 * no activa el modo y todo se ve desde el principio.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.reveal !== "on") return;

    const show = (el: Element) => el.classList.add("is-visible");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    const watch = (scope: ParentNode) => {
      // <html data-reveal="on"> es el interruptor del modo, no un elemento que aparezca.
      scope.querySelectorAll("[data-reveal]:not(html):not(.is-visible)").forEach((el) => io.observe(el));
    };
    watch(document);

    const mo = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches("[data-reveal]:not(.is-visible)")) io.observe(node);
          watch(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
