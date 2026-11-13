import type { ReactNode } from "react";
import { SiteFooter } from "@/components/sitio/SiteFooter";
import { SiteHeader } from "@/components/sitio/SiteHeader";

/** Páginas públicas: menú superior y pie de página comunes. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
