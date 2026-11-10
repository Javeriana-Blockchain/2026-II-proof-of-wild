import Link from "next/link";
import { ContourField } from "@/components/mapa/ContourField";
import { TestnetBadge } from "@/components/ui";
import { Logo } from "./Logo";
import { SECCIONES } from "./secciones";

/** Pie de página: qué prueba la red y qué no (RN-10), las secciones y el contacto. */
export function SiteFooter() {
  return (
    <footer className="relative isolate overflow-hidden bg-profundo text-white">
      <ContourField variant="noche" seed={21} className="absolute inset-0 -z-10 h-full w-full opacity-60" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1.2fr_2fr_1fr]">
        <div className="space-y-4">
          <Logo dark />
          <TestnetBadge dark />
          <p className="text-sm text-white/80">Demo con datos ficticios. No se usa dinero real.</p>
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl">Qué prueba la red</h2>
          <p className="max-w-prose leading-relaxed text-white/85">
            Stellar demuestra que hubo un pago, a quién y por cuánto, y que una factura no se modificó después de
            registrarla. No demuestra que la factura sea auténtica ni que el animal se haya atendido bien: eso lo revisa una
            persona.
          </p>
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl">Contacto</h2>
          <p className="text-white/85">hola@proofofwild.example</p>
          <ul className="space-y-1.5 pt-1">
            {SECCIONES.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/#${s.id}`}
                  className="text-white/85 underline decoration-white/30 underline-offset-4 transition-[color,text-decoration-color] hover:text-white hover:decoration-white"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
