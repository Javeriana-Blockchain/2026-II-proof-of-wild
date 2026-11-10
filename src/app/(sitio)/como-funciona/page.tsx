import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType } from "react";
import { IconoCorazon, IconoEscudo, IconoPersonas } from "@/components/iconos";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Cómo funciona" };

type Camino = {
  titulo: string;
  icono: ComponentType<{ className?: string }>;
  cabecera: string;
  pasos: Array<[string, string]>;
  accion: { texto: string; href: string; variante: "primario" | "secundario" };
};

const CAMINOS: Camino[] = [
  {
    titulo: "Si eres donante",
    icono: IconoCorazon,
    cabecera: "bg-profundo text-white",
    pasos: [
      ["Crea tu cuenta y elige un caso.", "Mira su historia, lo que necesita y cuánto cuesta."],
      ["Apadrínalo con tu billetera de Stellar.", "Tu aporte se reparte en orden entre las etapas."],
      ["Sigue y verifica.", "En Stellar Expert compruebas en qué se usó tu aporte."],
    ],
    accion: { texto: "Ver casos", href: "/casos", variante: "primario" },
  },
  {
    titulo: "Si eres ONG",
    icono: IconoEscudo,
    cabecera: "bg-bosque text-white",
    pasos: [
      ["Crea tu cuenta y tu perfil.", "Lo revisamos y lo publicamos."],
      ["Publica tus casos.", "Cada uno con el costo de cada etapa."],
      ["Registra hitos y gastos.", "Con su foto o factura; los aportes llegan al contrato del caso."],
    ],
    accion: { texto: "Soy ONG y quiero aparecer", href: "/ong/registro", variante: "secundario" },
  },
  {
    titulo: "Si quieres ser voluntario",
    icono: IconoPersonas,
    cabecera: "bg-salvia text-texto",
    pasos: [
      ["Elige un voluntariado.", "Cada ONG publica fecha, tareas y cupos."],
      ["Inscríbete con tu cuenta.", "Eliges tu disponibilidad y queda en tu perfil."],
      ["La ONG te confirma.", "Las tareas no implican contacto directo con los animales."],
    ],
    accion: { texto: "Ver voluntariados", href: "/voluntariados", variante: "secundario" },
  },
];

const PREGUNTAS = [
  {
    id: "billetera",
    pregunta: "¿Qué es una billetera de Stellar?",
    respuesta:
      "Una aplicación gratuita (por ejemplo, Freighter o xBull) que guarda tu cuenta y firma tus aportes. En la demo usamos cuentas de prueba: no se usa dinero real.",
  },
  {
    id: "verificado",
    pregunta: "¿Qué significa «verificado»?",
    respuesta:
      "Cada hito y gasto tiene un nivel: presentado por la ONG, revisado por un profesional o verificado de forma independiente.",
  },
  {
    id: "blockchain",
    pregunta: "¿Qué prueba la blockchain y qué no?",
    respuesta:
      "Prueba que hubo un pago, a quién y por cuánto, y que una factura no cambió. No prueba que sea auténtica: eso lo revisa un profesional.",
  },
  {
    id: "cuenta",
    pregunta: "¿Olvidaste tu contraseña?",
    respuesta:
      "Tu contraseña nunca llega a nuestros servidores, así que no podemos mostrártela. Durante la demo, escríbenos a hola@proofofwild.example y te ayudamos a crear una nueva.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-12 px-4 py-12 sm:px-8">
      <header className="text-center">
        <h1 className="text-6xl">¿Cómo funciona?</h1>
        <p className="mt-3 text-lg text-secundario">
          Tres caminos para ser parte de la recuperación de fauna silvestre rescatada.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {CAMINOS.map(({ titulo, icono: Icono, cabecera, pasos, accion }) => (
          <section key={titulo} className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm">
            <h2 className={`flex items-center gap-4 px-7 py-5 text-3xl ${cabecera}`}>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-crema text-bosque">
                <Icono className="h-6 w-6" />
              </span>
              {titulo}
            </h2>
            <ol className="flex-1 space-y-5 px-7 py-6">
              {pasos.map(([fuerte, resto], i) => (
                <li key={fuerte} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crema text-sm font-semibold">
                    {i + 1}
                  </span>
                  <p className="text-lg">
                    <strong>{fuerte}</strong> <span className="text-secundario">{resto}</span>
                  </p>
                </li>
              ))}
            </ol>
            <div className="px-7 pb-7">
              <Link href={accion.href} className={buttonClass(accion.variante, "w-full py-3")}>
                {accion.texto}
              </Link>
            </div>
          </section>
        ))}
      </div>

      <section aria-labelledby="preguntas">
        <h2 id="preguntas" className="mb-5 text-4xl">
          Preguntas frecuentes
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PREGUNTAS.map((p) => (
            <article key={p.id} id={p.id} className="scroll-mt-24 rounded-2xl bg-arena/45 p-6">
              <h3 className="font-sans text-lg font-semibold">{p.pregunta}</h3>
              <p className="mt-2">{p.respuesta}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
