import Link from "next/link";
import { TestnetBadge } from "@/components/ui";
import { Logo } from "./Logo";

/** Pie de página: qué prueba la red y qué no (RN-10), y contacto. Va debajo del contenido. */
export function SiteFooter() {
  return (
    <footer className="mt-16 bg-profundo text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-8 md:grid-cols-[1.2fr_2fr_1fr]">
        <div className="space-y-4">
          <Logo dark />
          <TestnetBadge dark />
          <p className="text-sm text-white/75">Demo con datos ficticios. No se usa dinero real.</p>
        </div>
        <div className="space-y-3">
          <h2 className="text-xl">Qué prueba la red</h2>
          <p className="text-sm leading-relaxed text-white/85">
            Stellar demuestra que hubo un pago, a quién y por cuánto, y que una factura no se modificó después de
            registrarla. No demuestra que la factura sea auténtica ni que el animal se haya atendido bien: eso lo
            revisa una persona.
          </p>
        </div>
        <div className="space-y-3 text-sm">
          <h2 className="text-xl">Contacto</h2>
          <p className="text-white/85">hola@proofofwild.example</p>
          <p>
            <Link href="/como-funciona" className="underline underline-offset-2">
              Cómo funciona
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
