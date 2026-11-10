import Image from "next/image";
import Link from "next/link";

/**
 * Marca: el oso de anteojos (silueta sin fondo) en una placa redonda y el nombre en la slab de los títulos.
 * Sobre fondos oscuros la placa es crema para que el oso se distinga. Al pasar el mouse el oso se ladea.
 */
export function Logo({ dark = false, href = "/" }: { dark?: boolean; href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-xl" aria-label="Proof of Wild, ir al inicio">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-300 ease-(--ease-spring) group-hover:-rotate-8 group-hover:scale-105 ${dark ? "bg-crema" : "bg-white ring-2 ring-arena"}`}
      >
        <Image src="/marca/logo-oso.png" alt="" width={30} height={33} priority />
      </span>
      <span className={`font-display text-2xl font-bold tracking-tight whitespace-nowrap ${dark ? "text-white" : "text-bosque"}`}>
        Proof of Wild
      </span>
    </Link>
  );
}
