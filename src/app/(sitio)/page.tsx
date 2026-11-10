import Image from "next/image";
import Link from "next/link";
import { IconoCorazon, IconoEscudo, IconoFlecha, IconoHuella } from "@/components/iconos";
import { buttonClass, Chip } from "@/components/ui";
import { getCatalogService } from "@/platform/container";

// Lee de la base de datos en cada visita; no se prerenderiza en la compilación.
export const dynamic = "force-dynamic";

const PASOS = [
  { icono: IconoHuella, titulo: "Elige un caso", texto: "Conoce su historia y lo que necesita su tratamiento." },
  {
    icono: IconoCorazon,
    titulo: "Apadrínalo",
    texto: "Aporta con tu billetera de Stellar; se reparte entre las etapas.",
  },
  {
    icono: IconoEscudo,
    titulo: "Sigue su recuperación",
    texto: "Mira cada etapa y compruébala en Stellar Expert.",
  },
];

const CAMINOS = [
  {
    titulo: "Para donantes",
    texto: "Apadrina un caso y ve en qué se usa cada dólar de tu aporte.",
    accion: "Quiero ser donante",
    href: "/casos",
    variante: "arena" as const,
  },
  {
    titulo: "Para ONG",
    texto: "Visibilidad y credibilidad para recibir aportes.",
    accion: "Soy ONG y quiero aparecer",
    href: "/ong/registro",
    variante: "contorno" as const,
  },
  {
    titulo: "Para voluntarios",
    texto: "Ayuda con tu tiempo en una fundación.",
    accion: "Quiero ser voluntario",
    href: "/voluntariados",
    variante: "contorno" as const,
  },
];

export default async function InicioPage() {
  const recuperados = (await getCatalogService().recoveredCases()).slice(0, 3);

  return (
    <main>
      <section className="relative overflow-hidden bg-profundo text-white">
        <Image
          src="/fotos/portada-oso-de-anteojos.webp"
          alt="Dos osos de anteojos en un pastizal de páramo"
          fill
          priority
          sizes="100vw"
          className="object-cover object-right"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-profundo via-profundo/95 to-transparent lg:via-45%" />
        <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-28 sm:px-8">
          <h1 className="max-w-3xl text-5xl leading-tight sm:text-6xl">
            Apadrina a un animal rescatado y sigue cada paso de su recuperación
          </h1>
          <p className="mt-5 text-xl text-white/90">Todo queda registrado en Stellar y lo puedes verificar.</p>
          <div className="mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
            {CAMINOS.map((c) => (
              <div key={c.titulo} className="flex flex-col rounded-2xl border border-white/25 bg-white/10 p-5">
                <h2 className="font-sans text-lg font-semibold">{c.titulo}</h2>
                <p className="mt-2 flex-1 text-white/85">{c.texto}</p>
                <Link href={c.href} className={buttonClass(c.variante, "mt-4 w-full text-center")}>
                  {c.accion}
                </Link>
              </div>
            ))}
          </div>
        </div>
        <svg
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          aria-hidden
          className="absolute bottom-0 h-12 w-full text-crema"
        >
          <path d="M0 60V35C360 0 1080 0 1440 40V60Z" fill="currentColor" />
        </svg>
      </section>

      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-12 sm:px-8 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="como-funciona">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 id="como-funciona" className="text-4xl">
              ¿Cómo funciona?
            </h2>
            <Link href="/como-funciona" className="inline-flex items-center gap-2 font-medium text-bosque underline">
              Ver en detalle <IconoFlecha />
            </Link>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {PASOS.map(({ icono: Icono, titulo, texto }, i) => (
              <li key={titulo} className="relative flex gap-4 rounded-2xl bg-white p-5 shadow-sm">
                <span className="absolute -top-2 -left-2 flex h-7 w-7 items-center justify-center rounded-full bg-bosque text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-crema text-bosque">
                  <Icono />
                </span>
                <div>
                  <h3 className="font-sans text-lg font-semibold">{titulo}</h3>
                  <p className="mt-1 text-secundario">{texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="recuperados">
          <h2 id="recuperados" className="mb-6 text-4xl">
            Casos recuperados
          </h2>
          {recuperados.length === 0 ? (
            <p className="text-secundario">Pronto verás aquí las historias completas.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-3">
              {recuperados.map((c) => (
                <li key={c.code} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  <div className="relative aspect-[4/3.5]">
                    {c.photoUrl ? (
                      <Image src={c.photoUrl} alt={c.commonName ?? "Animal recuperado"} fill sizes="200px" className="object-cover" />
                    ) : null}
                  </div>
                  <div className="space-y-1.5 p-3">
                    <h3 className="font-sans font-semibold leading-tight">{c.commonName ?? "Especie reservada"}</h3>
                    <Chip tone={c.chip.tone === "logro" ? "logro" : "etapa"} className="text-xs">
                      {c.chip.label}
                    </Chip>
                    <Link href={`/casos/${c.code}`} className="block text-sm font-medium text-bosque underline">
                      Ver su historia
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
