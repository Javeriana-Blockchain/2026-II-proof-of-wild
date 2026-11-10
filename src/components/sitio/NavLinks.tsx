"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/como-funciona", label: "Cómo funciona" },
  { href: "/casos", label: "Casos" },
  { href: "/voluntariados", label: "Voluntariados" },
  { href: "/ong/registro", label: "Soy ONG", match: "/ong" },
];

/** Menú principal; subraya la sección actual. */
export function NavLinks() {
  const pathname = usePathname();
  return (
    <ul className="flex flex-wrap items-center gap-x-8 gap-y-2">
      {LINKS.map(({ href, label, match }) => {
        const prefix = match ?? href;
        const active = prefix === "/" ? pathname === "/" : pathname.startsWith(prefix);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`border-b-2 pb-1 transition ${active ? "border-bosque font-semibold text-bosque" : "border-transparent text-texto hover:text-bosque"}`}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
