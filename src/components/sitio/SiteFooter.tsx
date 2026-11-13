import Link from "next/link";
import { ContourField } from "@/components/mapa/ContourField";
import { TestnetBadge } from "@/components/ui";
import { getT } from "@/i18n/servidor";
import { Logo } from "./Logo";
import { SECCIONES } from "./secciones";

/** Pie de página: qué prueba la red y qué no (RN-10), las secciones y el contacto. */
export async function SiteFooter() {
  const { t, ruta } = await getT();
  return (
    <footer className="relative isolate overflow-hidden bg-profundo text-white">
      <ContourField variant="noche" seed={21} className="absolute inset-0 -z-10 h-full w-full opacity-60" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1.2fr_2fr_1fr]">
        <div className="space-y-4">
          <Logo dark />
          <TestnetBadge dark />
          <p className="text-sm text-white/80">{t("comun.pie.demo")}</p>
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl">{t("comun.pie.pruebaTitulo")}</h2>
          <p className="max-w-prose leading-relaxed text-white/85">{t("comun.pie.pruebaTexto")}</p>
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl">{t("comun.pie.contacto")}</h2>
          <p className="text-white/85">hola@proofofwild.example</p>
          <ul className="space-y-1.5 pt-1">
            {SECCIONES.map((s) => (
              <li key={s.id}>
                <Link
                  href={ruta(`/#${s.id}`)}
                  className="text-white/85 underline decoration-white/30 underline-offset-4 transition-[color,text-decoration-color] hover:text-white hover:decoration-white"
                >
                  {t(s.clave)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
