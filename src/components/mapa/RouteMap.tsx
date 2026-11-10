import { formatAmount } from "@/app/_lib/format";
import { STAGE_STATUS_LABELS } from "@/app/_lib/labels";
import { IconoCheck, IconoEtapa, stageKind } from "@/components/iconos";
import { toStroops } from "@/lib/amount";
import type { RouteStage } from "@/modules/catalog";

/**
 * La ruta del tratamiento como en un mapa: un punto por etapa, unidos por un sendero punteado. El tramo ya recorrido
 * (las etapas cubiertas) se dibuja continuo al aparecer; el relleno de cada punto crece con lo cubierto, y en la
 * etapa en curso late el marcador «Aquí va».
 */
export function RouteMap({
  stages,
  tone = "claro",
  size = "grande",
  showAmounts = true,
  label,
  className = "",
}: {
  stages: RouteStage[];
  tone?: "claro" | "oscuro";
  size?: "grande" | "compacto";
  showAmounts?: boolean;
  /** Nombre accesible de la ruta, por ejemplo «Ruta de la guacamaya roja». */
  label: string;
  className?: string;
}) {
  const ordered = [...stages].sort((a, b) => a.position - b.position);
  const n = ordered.length;
  if (n === 0) return null;

  const dark = tone === "oscuro";
  const big = size === "grande";
  const current = ordered.findIndex((s) => s.status === "en_curso");
  const reached = current === -1 ? (ordered.every((s) => s.status === "completada") ? n - 1 : -1) : current;

  // Coordenadas del sendero en un lienzo de 1000 × 40 que se estira al ancho del contenedor.
  const x = (i: number) => ((i + 0.5) / n) * 1000;
  const segment = (from: number, to: number) => {
    let d = `M${x(from)} 20`;
    for (let i = from; i < to; i++) {
      const mid = (x(i) + x(i + 1)) / 2;
      d += ` Q${mid} ${i % 2 === 0 ? 6 : 34} ${x(i + 1)} 20`;
    }
    return d;
  };

  const marker = big ? "h-12 w-12" : "h-9 w-9";
  const lineTop = big ? "top-[4px]" : "top-[-2px]";

  return (
    <div data-reveal="sube" className={`relative ${className}`}>
      <svg
        viewBox="0 0 1000 40"
        preserveAspectRatio="none"
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 ${lineTop} hidden h-10 w-full sm:block`}
      >
        <path
          d={segment(0, n - 1)}
          fill="none"
          stroke={dark ? "#a7b894" : "#386641"}
          strokeOpacity={dark ? 0.55 : 0.35}
          strokeWidth={2}
          strokeDasharray="2 7"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {reached > 0 ? (
          <path
            d={segment(0, reached)}
            pathLength={1}
            className="ruta-trazo"
            style={{ ["--largo" as string]: 1 }}
            fill="none"
            stroke={dark ? "#f2e8cf" : "#386641"}
            strokeWidth={3.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>

      <ol
        aria-label={label}
        className="relative flex flex-col gap-4 sm:grid sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        {ordered.map((stage, i) => {
          const cost = toStroops(stage.cost);
          const covered = toStroops(stage.covered);
          const ratio = cost > 0n ? Math.min(1, Number((covered * 1000n) / cost) / 1000) : 0;
          const here = stage.status === "en_curso";
          const done = stage.status === "completada";
          const kind = stageKind(stage.name);
          return (
            <li
              key={stage.position}
              className="relative flex items-center gap-4 sm:flex-col sm:items-center sm:gap-2 sm:text-center"
            >
              {/* En el celular el sendero baja en vertical. */}
              {i < n - 1 ? (
                <span
                  aria-hidden
                  className={`absolute h-[calc(100%-1.5rem)] border-l-2 border-dotted sm:hidden ${dark ? "border-salvia/60" : "border-bosque/40"} ${big ? "top-12 left-[23px]" : "top-9 left-[17px]"}`}
                />
              ) : null}

              <span className={`relative flex shrink-0 items-center justify-center ${marker}`}>
                {here ? (
                  <span
                    aria-hidden
                    className={`absolute inset-0 animate-latido rounded-full ${dark ? "bg-crema" : "bg-bosque"}`}
                  />
                ) : null}
                <span
                  className={`relative flex h-full w-full items-center justify-center rounded-full ${
                    done
                      ? dark
                        ? "bg-salvia text-profundo"
                        : "bg-bosque text-white"
                      : here
                        ? dark
                          ? "border-[3px] border-crema bg-profundo"
                          : "border-[3px] border-bosque bg-white"
                        : dark
                          ? "border-2 border-dashed border-white/50 bg-profundo"
                          : "border-2 border-dashed border-arena bg-crema"
                  }`}
                >
                  {done ? (
                    <IconoCheck className={big ? "h-5 w-5" : "h-4 w-4"} />
                  ) : ratio > 0 ? (
                    <span
                      aria-hidden
                      className={`rounded-full ${dark ? "bg-crema" : "bg-bosque"}`}
                      style={{ width: `${Math.max(22, Math.sqrt(ratio) * 78)}%`, height: `${Math.max(22, Math.sqrt(ratio) * 78)}%` }}
                    />
                  ) : (
                    <IconoEtapa
                      kind={kind}
                      className={`${big ? "h-5 w-5" : "h-4 w-4"} ${dark ? "text-white/70" : "text-secundario"}`}
                    />
                  )}
                </span>
                {here ? (
                  <span
                    className={`rotulo absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-md px-2 py-1 leading-none whitespace-nowrap sm:block ${dark ? "bg-crema text-profundo" : "bg-bosque text-white"}`}
                  >
                    Aquí va
                  </span>
                ) : null}
              </span>

              <span className="min-w-0 space-y-0.5">
                <span className={`rotulo flex items-center gap-1.5 sm:justify-center ${dark ? "text-salvia" : "text-secundario"}`}>
                  <IconoEtapa kind={kind} className="h-3.5 w-3.5" />
                  Etapa {stage.position}
                  <span className="sm:hidden">· {here ? "Aquí va" : STAGE_STATUS_LABELS[stage.status]}</span>
                </span>
                <span className={`block leading-snug font-semibold ${big ? "text-base" : "text-sm"} ${dark ? "text-white" : "text-texto"}`}>
                  {stage.shortName}
                </span>
                {showAmounts ? (
                  <span className={`cifras block text-sm ${dark ? "text-white/80" : "text-secundario"}`}>
                    <strong className={dark ? "text-white" : "text-texto"}>{formatAmount(stage.covered, "")}</strong>
                    de {formatAmount(stage.cost)}
                  </span>
                ) : null}
                <span className="sr-only">{STAGE_STATUS_LABELS[stage.status]}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
