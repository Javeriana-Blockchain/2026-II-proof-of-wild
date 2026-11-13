import type { Metadata } from "next";
import { Archivo, Zilla_Slab } from "next/font/google";
import type { ReactNode } from "react";
import { WalletProvider } from "@/components/billetera/WalletProvider";
import { ProveedorIdioma } from "@/i18n/cliente";
import { LANG_HTML, LOCALE_OG } from "@/i18n/config";
import { MENSAJES } from "@/i18n/mensajes";
import { getAlternativas, getIdioma, getT } from "@/i18n/servidor";
import "./globals.css";

/** Títulos en Zilla Slab (la slab de un letrero de parque); texto y rótulos en Archivo, con su eje de ancho. */
const display = Zilla_Slab({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-zilla",
  display: "swap",
});
const sans = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const [{ t, idioma }, languages] = await Promise.all([getT(), getAlternativas()]);
  return {
    title: { default: "Proof of Wild", template: "%s · Proof of Wild" },
    description: t("comun.meta.descripcion"),
    alternates: { languages },
    openGraph: { locale: LOCALE_OG[idioma] },
  };
}

/**
 * Activa la aparición al hacer scroll antes de pintar, para que nada parpadee. Sin JavaScript no corre y el contenido
 * se queda visible.
 */
const REVEAL_SCRIPT = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches&&"IntersectionObserver"in window)document.documentElement.dataset.reveal="on"}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const idioma = await getIdioma();
  return (
    <html
      lang={LANG_HTML[idioma]}
      data-scroll-behavior="smooth"
      className={`${display.variable} ${sans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: REVEAL_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <ProveedorIdioma idioma={idioma} mensajes={MENSAJES[idioma]}>
          <WalletProvider>{children}</WalletProvider>
        </ProveedorIdioma>
      </body>
    </html>
  );
}
