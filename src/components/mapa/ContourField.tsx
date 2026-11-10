/**
 * Curvas de nivel en capas planas, como papel recortado y pegado: cada cota es una forma de un solo color sobre la
 * de abajo, sin sombras ni degradados. Se generan con una semilla fija, así el mismo lugar del sitio siempre muestra
 * el mismo relieve y el servidor y el navegador dibujan lo mismo.
 */

type Variant = "noche" | "papel" | "bosque";

const PALETTES: Record<Variant, { bands: string[]; line: string; lineOpacity: number }> = {
  // Sobre profundo: bandas bosque y profundo alternadas, líneas salvia.
  noche: { bands: ["#386641", "#2c4f33", "#386641", "#2c4f33", "#386641", "#2c4f33"], line: "#a7b894", lineOpacity: 0.32 },
  // Sobre crema o blanco: arena, crema y salvia en la cima.
  papel: { bands: ["#d8c299", "#f2e8cf", "#d8c299", "#f2e8cf", "#a7b894", "#f2e8cf"], line: "#386641", lineOpacity: 0.16 },
  // Sobre bosque: profundo y salvia apagada.
  bosque: { bands: ["#2c4f33", "#386641", "#2c4f33", "#386641", "#2c4f33", "#386641"], line: "#d8c299", lineOpacity: 0.28 },
};

const W = 1200;
const H = 800;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Curva cerrada suave por los puntos (Catmull-Rom convertido a Bézier cúbicas). */
function closedPath(points: Array<[number, number]>): string {
  const n = points.length;
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(points[0]![0])} ${f(points[0]![1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]!;
    const p1 = points[i]!;
    const p2 = points[(i + 1) % n]!;
    const p3 = points[(i + 2) % n]!;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0]!)} ${f(c1[1]!)} ${f(c2[0]!)} ${f(c2[1]!)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}

interface Relief {
  bands: Array<{ d: string; fill: string }>;
  lines: string[];
}

const cache = new Map<string, Relief>();

function relief(variant: Variant, seed: number): Relief {
  const key = `${variant}:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const rand = mulberry32(seed * 9973 + 17);
  const palette = PALETTES[variant];
  const peaks = [
    { x: W * (0.15 + rand() * 0.25), y: H * (0.2 + rand() * 0.35), r: 520 + rand() * 160 },
    { x: W * (0.6 + rand() * 0.3), y: H * (0.45 + rand() * 0.4), r: 460 + rand() * 180 },
  ];
  const STEPS = palette.bands.length;
  const POINTS = 26;

  const bands: Relief["bands"] = [];
  const lines: string[] = [];
  for (const peak of peaks) {
    const harmonics = [2, 3, 5].map((k) => ({ k, a: 0.06 + rand() * 0.08, phase: rand() * Math.PI * 2 }));
    for (let step = 0; step < STEPS; step++) {
      const scale = 1 - step / (STEPS + 0.6);
      const pts: Array<[number, number]> = [];
      for (let i = 0; i < POINTS; i++) {
        const t = (i / POINTS) * Math.PI * 2;
        const wobble = harmonics.reduce((sum, h) => sum + h.a * Math.sin(h.k * t + h.phase + step * 0.35), 0);
        const r = peak.r * scale * (1 + wobble);
        pts.push([peak.x + Math.cos(t) * r * 1.25, peak.y + Math.sin(t) * r * 0.8]);
      }
      const d = closedPath(pts);
      bands.push({ d, fill: palette.bands[step]! });
      lines.push(d);
    }
  }
  const result = { bands, lines };
  cache.set(key, result);
  return result;
}

export function ContourField({
  variant = "papel",
  seed = 1,
  className = "",
  lines = true,
}: {
  variant?: Variant;
  seed?: number;
  className?: string;
  lines?: boolean;
}) {
  const { bands, lines: paths } = relief(variant, seed);
  const palette = PALETTES[variant];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden className={className}>
      {bands.map((b, i) => (
        <path key={`b${i}`} d={b.d} fill={b.fill} />
      ))}
      {lines
        ? paths.map((d, i) => (
            <path
              key={`l${i}`}
              d={d}
              fill="none"
              stroke={palette.line}
              strokeOpacity={palette.lineOpacity}
              strokeWidth={1.4}
              vectorEffect="non-scaling-stroke"
            />
          ))
        : null}
    </svg>
  );
}
