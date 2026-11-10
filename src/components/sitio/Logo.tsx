import Image from "next/image";
import Link from "next/link";

/**
 * Marca: el oso de anteojos (silueta sin fondo) y el nombre en DM Serif Display.
 * Sobre fondos oscuros el oso va dentro de un círculo crema para que se distinga.
 */
export function Logo({ dark = false, href = "/" }: { dark?: boolean; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3" aria-label="Proof of Wild, ir al inicio">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full ${dark ? "bg-crema" : "bg-white ring-1 ring-arena"}`}
      >
        <Image src="/marca/logo-oso.png" alt="" width={30} height={33} priority />
      </span>
      <span className={`font-serif text-2xl ${dark ? "text-white" : "text-bosque"}`}>Proof of Wild</span>
    </Link>
  );
}
