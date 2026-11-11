"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { WalletChip } from "@/components/billetera/WalletChip";
import { IconoMenu } from "@/components/iconos";
import { buttonClass, TestnetBadge } from "@/components/ui";
import { Logo } from "./Logo";
import { SECCIONES } from "./secciones";


type Account = { label: string; href: string; profileHref: string | null } | null;

/** Sección visible en la página principal: la última cuyo inicio ya pasó debajo del menú. */
function useActiveSection(enabled: boolean): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const els = SECCIONES.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    const update = () => {
      const line = window.innerHeight * 0.35;
      let current: string | null = els[0]?.id ?? null;
      for (const el of els) if (el.getBoundingClientRect().top <= line) current = el.id;
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [enabled]);
  return enabled ? active : null;
}

export function SiteNav({ account }: { account: Account }) {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const active = useActiveSection(onHome);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  // Al llegar desde otra página con /#seccion, la página principal entra después de la pantalla de carga y el
  // navegador ya no encuentra el ancla: se espera a que la sección exista y se baja hasta ella.
  useEffect(() => {
    if (pathname !== "/" || !window.location.hash) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    let tries = 0;
    const timer = window.setInterval(() => {
      const el = document.getElementById(id);
      if (!el && ++tries < 40) return;
      window.clearInterval(timer);
      el?.scrollIntoView();
    }, 75);
    return () => window.clearInterval(timer);
  }, [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (id: string) => (onHome ? active === id : id === "casos" && pathname.startsWith("/casos"));

  const links = SECCIONES.map(({ id, label }) => (
    <li key={id}>
      <Link
        href={`/#${id}`}
        onClick={() => setOpen(false)}
        aria-current={isActive(id) ? "location" : undefined}
        className={`group relative inline-flex items-center gap-2 rounded-md px-1 py-2 whitespace-nowrap transition-colors duration-200 ${isActive(id) ? "font-semibold text-bosque" : "text-texto hover:text-bosque"}`}
      >
        <span
          aria-hidden
          className={`h-2 w-2 rounded-full border-2 border-bosque transition-all duration-300 ease-(--ease-spring) ${isActive(id) ? "scale-100 bg-bosque" : "scale-0 group-hover:scale-100"}`}
        />
        {label}
        <span
          aria-hidden
          className={`absolute inset-x-1 -bottom-0.5 h-0.5 origin-left rounded-full bg-bosque transition-transform duration-300 ease-(--ease-out-expo) ${isActive(id) ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`}
        />
      </Link>
    </li>
  ));

  const actions = (inMenu: boolean) => (
    <>
      <Link href="/ong/registro" className={`enlace whitespace-nowrap ${inMenu ? "" : "hidden xl:inline"}`}>
        Soy ONG
      </Link>
      <WalletChip profileHref={account?.profileHref ?? null} />
      {account ? (
        <Link href={account.href} className={buttonClass("primario", "py-2.5")}>
          <span aria-hidden className="h-2 w-2 animate-brillo rounded-full bg-salvia" />
          {account.label}
        </Link>
      ) : (
        <>
          <Link href="/ingresar?modo=ingresar" className="enlace whitespace-nowrap">
            Ingresar
          </Link>
          <Link href="/ingresar" className={buttonClass("primario", "py-2.5")}>
            Crear cuenta
          </Link>
        </>
      )}
    </>
  );

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-crema transition-[border-color,box-shadow] duration-300 ${scrolled ? "border-arena" : "border-transparent"}`}
    >
      <nav aria-label="Principal" className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Logo />
        <ul className="hidden items-center gap-4 lg:flex xl:gap-7">{links}</ul>
        <div className="hidden items-center gap-4 lg:flex">
          <span className="hidden xl:inline-flex">
            <TestnetBadge />
          </span>
          {actions(false)}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-movil"
          className="mov-hover flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border-2 border-bosque text-bosque transition-transform duration-200 ease-(--ease-spring) active:scale-95 lg:hidden"
        >
          <IconoMenu abierto={open} />
          <span className="sr-only">{open ? "Cerrar el menú" : "Abrir el menú"}</span>
        </button>
      </nav>

      {open ? (
        <div id="menu-movil" className="border-y border-arena bg-crema px-4 pt-2 pb-6 lg:hidden">
          <ul className="flex flex-col text-lg">{links}</ul>
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-arena pt-4">
            <TestnetBadge />
            {actions(true)}
          </div>
        </div>
      ) : null}
    </header>
  );
}
