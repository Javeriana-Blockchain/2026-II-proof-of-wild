import Link from "next/link";
import type { ComponentType } from "react";
import { IconoCorazon, IconoEscudo, IconoHuella, IconoMas, IconoPersonas } from "@/components/iconos";
import { buttonClass, type ButtonVariant } from "@/components/ui";
import { Reveal } from "@/components/movimiento/Reveal";

const PASOS = [
  { icono: IconoHuella, titulo: "Elige un caso", texto: "Conoce su historia y lo que necesita su tratamiento." },
  { icono: IconoCorazon, titulo: "Apadrínalo", texto: "Aporta con tu billetera de Stellar; se reparte entre las etapas." },
  { icono: IconoEscudo, titulo: "Sigue su recuperación", texto: "Mira cada etapa y compruébala en Stellar Expert." },
];

type Camino = {
  titulo: string;
  icono: ComponentType<{ className?: string }>;
  placa: string;
  pasos: Array<[string, string]>;
  accion: { texto: string; href: string; variante: ButtonVariant };
};

const CAMINOS: Camino[] = [
  {
    titulo: "Si eres donante",
    icono: IconoCorazon,
    placa: "bg-profundo text-white",
    pasos: [
      ["Crea tu cuenta y elige un caso.", "Mira su historia, lo que necesita y cuánto cuesta."],
      ["Apadrínalo con tu billetera de Stellar.", "Tu aporte se reparte en orden entre las etapas."],
      ["Sigue y verifica.", "En Stellar Expert compruebas en qué se usó tu aporte."],
    ],
    accion: { texto: "Ver casos", href: "/#casos", variante: "primario" },
  },
  {
    titulo: "Si eres ONG",
    icono: IconoEscudo,
    placa: "bg-bosque text-white",
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
    placa: "bg-salvia text-texto",
    pasos: [
      ["Elige un voluntariado.", "Cada ONG publica fecha, tareas y cupos."],
      ["Inscríbete con tu cuenta.", "Eliges tu disponibilidad y queda en tu perfil."],
      ["La ONG te confirma.", "Las tareas no implican contacto directo con los animales."],
    ],
    accion: { texto: "Ver voluntariados", href: "/#voluntariados", variante: "secundario" },
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

/** «Cómo funciona»: los tres pasos del donante como un sendero, los tres caminos y las preguntas frecuentes. */
export function ComoFunciona() {
  return (
    <section id="como-funciona" aria-labelledby="titulo-como" className="mx-auto max-w-7xl space-y-16 px-4 py-20 sm:px-8">
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
        <Reveal as="h2" variant="sube" id="titulo-como" className="text-5xl sm:text-6xl">
          ¿Cómo funciona?
        </Reveal>
        <Reveal as="p" variant="sube" delay={1} className="max-w-lg text-xl text-secundario lg:justify-self-end">
          Tres caminos para ser parte de la recuperación de fauna silvestre rescatada.
        </Reveal>
      </header>

      {/* Los tres pasos del donante, unidos por el sendero. */}
      <ol className="relative grid gap-8 md:grid-cols-3 md:gap-6">
        <svg
          viewBox="0 0 1000 40"
          preserveAspectRatio="none"
          aria-hidden
          className="pointer-events-none absolute inset-x-[16%] top-5 hidden h-10 w-[68%] md:block"
        >
          <path
            d="M0 20 Q250 2 500 20 T1000 20"
            fill="none"
            stroke="#386641"
            strokeOpacity={0.45}
            strokeWidth={2}
            strokeDasharray="2 8"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {PASOS.map(({ icono: Icono, titulo, texto }, i) => (
          <Reveal as="li" variant="pop" delay={i} key={titulo} className="relative flex flex-col items-start md:items-center md:text-center">
            <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white text-bosque ring-4 ring-crema transition-transform duration-300 ease-(--ease-spring) hover:scale-110">
              <Icono className="h-8 w-8" />
              <span className="cifras absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-bosque text-sm font-bold text-white">
                {i + 1}
              </span>
            </span>
            <h3 className="mt-5 text-3xl">{titulo}</h3>
            <p className="mt-2 max-w-xs text-lg text-secundario">{texto}</p>
          </Reveal>
        ))}
      </ol>

      {/* Tres caminos: cada uno es un sendero con su placa de inicio y su salida. */}
      <div className="space-y-4">
        {CAMINOS.map(({ titulo, icono: Icono, placa, pasos, accion }, i) => (
          <Reveal as="section" variant="capa" delay={i}
            key={titulo}
            aria-label={titulo}
            className="group/camino grid overflow-hidden rounded-[28px] bg-white ring-1 ring-arena/60 hover:ring-bosque/60 transition-shadow duration-300 lg:grid-cols-[17rem_minmax(0,1fr)_auto]"
          >
            <h3 className={`flex items-center gap-4 px-6 py-6 text-3xl lg:px-7 ${placa}`}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-crema text-bosque transition-transform duration-300 ease-(--ease-spring) group-hover/camino:-rotate-6">
                <Icono className="h-6 w-6" />
              </span>
              {titulo}
            </h3>
            <ol className="grid gap-5 px-6 py-6 sm:grid-cols-3 lg:px-8">
              {pasos.map(([fuerte, resto], j) => (
                <li key={fuerte} className="flex gap-3">
                  <span className="cifras flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-bosque/50 text-sm font-bold text-bosque">
                    {j + 1}
                  </span>
                  <p>
                    <strong className="block leading-snug">{fuerte}</strong>
                    <span className="text-secundario">{resto}</span>
                  </p>
                </li>
              ))}
            </ol>
            <div className="flex items-center px-6 pb-6 lg:px-7 lg:pb-0">
              <Link href={accion.href} className={buttonClass(accion.variante, "w-full lg:w-auto")}>
                {accion.texto}
              </Link>
            </div>
          </Reveal>
        ))}
      </div>

      <section aria-labelledby="preguntas" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Reveal as="h3" variant="sube" id="preguntas" className="text-4xl">
          Preguntas frecuentes
        </Reveal>
        <div className="divide-y divide-arena/70 border-y border-arena/70">
          {PREGUNTAS.map((p, i) => (
            <Reveal as="details" variant="sube" delay={i} key={p.id} id={p.id} className="group/p scroll-mt-28">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold transition-colors hover:text-bosque [&::-webkit-details-marker]:hidden">
                {p.pregunta}
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-bosque/40 text-bosque transition-transform duration-300 ease-(--ease-spring) group-open/p:rotate-45 group-hover/p:border-bosque">
                  <IconoMas className="h-4 w-4" />
                </span>
              </summary>
              <p className="max-w-prose pb-6 text-lg text-secundario">{p.respuesta}</p>
            </Reveal>
          ))}
        </div>
      </section>
    </section>
  );
}
