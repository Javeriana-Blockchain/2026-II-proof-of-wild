import { NoEncontrado } from "@/components/estados/NoEncontrado";
import { SiteFooter } from "@/components/sitio/SiteFooter";
import { SiteHeader } from "@/components/sitio/SiteHeader";

/** Rutas que no existen fuera del sitio público: lleva su propio menú y pie. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <NoEncontrado />
      <SiteFooter />
    </>
  );
}
