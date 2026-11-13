"use client";

import Image from "next/image";
import Link from "next/link";
import { useT } from "@/i18n/cliente";

/**
 * Marca: el oso de anteojos (silueta sin fondo) en una placa redonda y el nombre en la slab de los títulos.
 * Sobre fondos oscuros la placa es crema para que el oso se distinga. Al pasar el mouse el oso se ladea.
 * Con `testnet`, debajo del nombre va la marca de la demo («Demo en testnet»). El enlace sigue el idioma de la página.
 */
export function Logo({ dark = false, href = "/", testnet = false }: { dark?: boolean; href?: string; testnet?: boolean }) {
  const { t, ruta } = useT();
  return (
    <Link href={ruta(href)} className="group flex items-center gap-3 rounded-xl" aria-label={t("comun.logo.aria")}>
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform duration-300 ease-(--ease-spring) group-hover:-rotate-8 group-hover:scale-105 ${dark ? "bg-crema" : "bg-white ring-2 ring-arena"}`}
      >
        <Image src="/marca/logo-oso.png" alt="" width={30} height={33} priority />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={`font-display text-2xl font-bold tracking-tight whitespace-nowrap ${dark ? "text-white" : "text-bosque"}`}
        >
          Proof of Wild
        </span>
        {testnet ? (
          <span className="rotulo mt-1 flex items-center gap-1.5 text-[0.65rem] text-secundario">
            <span aria-hidden className="h-1.5 w-1.5 animate-brillo rounded-full bg-bosque" />
            {t("comun.demoTestnet")}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
