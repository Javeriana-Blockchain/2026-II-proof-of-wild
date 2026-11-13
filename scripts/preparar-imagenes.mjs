/**
 * Prepara las fotos y el logo que entrega el equipo para usarlos en la página.
 *
 *   node scripts/preparar-imagenes.mjs "<carpeta con las fotos originales>"
 *   node scripts/preparar-imagenes.mjs --drive "<carpeta descargada del Drive de fotos por etapa>"
 *
 * - Re-codifica cada foto en WebP sin metadatos (EXIF con GPS incluido; RN-06) y la limita a 1600 px.
 * - Recorta la foto de Fundación Bosque Vivo para que no salga ninguna persona.
 * - Con --drive: la foto principal de la guacamaya y una foto por etapa de cada caso (máx. 960 px), desde el
 *   Drive del equipo, que tiene una carpeta por animal.
 * - Logo: usa `logo-oso.png` (la silueta con fondo transparente que entrega el equipo). Si no está, extrae
 *   el oso del centro del boceto y le quita el fondo blanco.
 *
 * Es idempotente: se puede volver a correr cuando lleguen mejores versiones de las imágenes.
 */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const drive = process.argv[2] === "--drive";
const origen = process.argv[drive ? 3 : 2];
if (!origen) {
  console.error('Uso: node scripts/preparar-imagenes.mjs [--drive] "<carpeta de origen>"');
  process.exit(1);
}

const publico = path.resolve(import.meta.dirname, "..", "public");
const MAX_ANCHO = 1600;

/** Archivo de origen → destino en public/, con recorte opcional { left, top, width, height }. */
const FOTOS = [
  { de: "osoanteojos_.png", a: "fotos/portada-oso-de-anteojos.webp" },
  { de: "tortugahicotea.webp", a: "fotos/casos/pow_002-tortuga-hicotea.webp" },
  { de: "zarihueya.jpg.jpeg", a: "fotos/casos/pow_003-zarigueya-comun.webp" },
  { de: "lorito.webp", a: "fotos/casos/pow_004-loro-real.webp" },
  { de: "perezoso.webp", a: "fotos/casos/pow_005-perezoso-de-dos-dedos.webp" },
  { de: "refugioalaslibres.jpg.jpeg", a: "fotos/ong/refugio-alas-libres.webp" },
  // En el centro de la foto original hay una persona: se conserva solo la parte derecha (sin personas).
  {
    de: "fundación bosque vivo.jpg.jpeg",
    a: "fotos/ong/fundacion-bosque-vivo.webp",
    recorte: { left: 440, top: 0, width: 584, height: 683 },
  },
];

/** Drive del equipo: la foto corregida de la guacamaya y la foto que muestra el avance de cada etapa. */
const ETAPA = 960;
const FOTOS_DRIVE = [
  // Foto vertical: se recorta a 4:3 con la cabeza y el pecho, que es como se ve en las tarjetas.
  {
    de: "Guacamayo Rojo/guacamayorojo_.jpg",
    a: "fotos/casos/pow_001-guacamaya-roja.webp",
    recorte: { left: 0, top: 380, width: 2192, height: 1640 },
  },
  { de: "Guacamayo Rojo/medicamentoguacamayo_etapa1.jpg", a: "fotos/etapas/pow_001-etapa-1.webp", ancho: ETAPA },
  { de: "Guacamayo Rojo/recintoadaptadoguacamayo_etapa2.jpg", a: "fotos/etapas/pow_001-etapa-2.webp", ancho: ETAPA },
  { de: "Tortuga Hicotea/valoracióntortugahicotea_etapa1.jpg", a: "fotos/etapas/pow_002-etapa-1.webp", ancho: ETAPA },
  { de: "Tortuga Hicotea/tratamientouv_tortugahicotea_etapa2.jpg", a: "fotos/etapas/pow_002-etapa-2.webp", ancho: ETAPA },
  { de: "Zarigüeya/lechezarigueya_etapa1.jpeg", a: "fotos/etapas/pow_003-etapa-1.webp", ancho: ETAPA },
  { de: "Zarigüeya/alimetaciónzarigueya_etapa2.jpeg", a: "fotos/etapas/pow_003-etapa-2.webp", ancho: ETAPA },
  { de: "Zarigüeya/entrenamientoexterior_zarigueya_etapa3.jpg", a: "fotos/etapas/pow_003-etapa-3.webp", ancho: ETAPA },
  { de: "Zarigüeya/liberaciónzarigueya_etapa4.jpg", a: "fotos/etapas/pow_003-etapa-4.webp", ancho: ETAPA },
  { de: "Loro Real/valoraciónlororeal_etapa1.png", a: "fotos/etapas/pow_004-etapa-1.webp", ancho: ETAPA },
  { de: "Loro Real/vitaminaslororeal_etapa2.jpg", a: "fotos/etapas/pow_004-etapa-2.webp", ancho: ETAPA },
  { de: "Loro Real/entrenamientovueloloro_etapa3.jpg", a: "fotos/etapas/pow_004-etapa-3.webp", ancho: ETAPA },
  { de: "Loro Real/liberaciónlororeal_etapa4.webp", a: "fotos/etapas/pow_004-etapa-4.webp", ancho: ETAPA },
  { de: "Perezoso/desnutriciónperezoso_etapa1.jpg", a: "fotos/etapas/pow_005-etapa-1.webp", ancho: ETAPA },
  { de: "Perezoso/recintoperezoso_etapa2.jpg", a: "fotos/etapas/pow_005-etapa-2.webp", ancho: ETAPA },
  { de: "Perezoso/alimentaciónperezoso_etapa3.jpg", a: "fotos/etapas/pow_005-etapa-3.webp", ancho: ETAPA },
  { de: "Perezoso/reservaperezoso_etapa4.jpg", a: "fotos/etapas/pow_005-etapa-4.webp", ancho: ETAPA },
];

async function prepararFoto({ de, a, recorte, ancho = MAX_ANCHO }) {
  let imagen = sharp(path.join(origen, de)).rotate();
  if (recorte) imagen = imagen.extract(recorte);
  const destino = path.join(publico, a);
  await mkdir(path.dirname(destino), { recursive: true });
  // sharp no copia metadatos al resultado salvo que se pida con withMetadata().
  const info = await imagen
    .resize({ width: ancho, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(destino);
  console.log(`${a}  ${info.width}×${info.height}`);
}

/**
 * Respaldo: el oso de la mitad del boceto (el que mira de frente). Se quita solo el fondo blanco exterior:
 * las marcas blancas de la cara y del pecho quedan como parte del dibujo.
 */
async function extraerOsoDelBoceto() {
  const RECORTE = { left: 375, top: 115, width: 285, height: 300 };
  const { data, info } = await sharp(path.join(origen, "WhatsApp Image 2026-11-08 at 9.09.00 PM.jpeg"))
    .extract(RECORTE)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: w, height: h } = info;
  const luz = data; // un canal: 0 = negro, 255 = blanco
  const CLARO = 150;

  // 1. Fondo exterior: píxeles claros conectados con el borde de la imagen.
  const fondo = new Uint8Array(w * h);
  const pila = [];
  for (let x = 0; x < w; x++) pila.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) pila.push(y * w, y * w + w - 1);
  while (pila.length) {
    const i = pila.pop();
    if (fondo[i] || luz[i] < CLARO) continue;
    fondo[i] = 1;
    const x = i % w;
    if (x > 0) pila.push(i - 1);
    if (x < w - 1) pila.push(i + 1);
    if (i >= w) pila.push(i - w);
    if (i < w * (h - 1)) pila.push(i + w);
  }

  // 2. Manchas sueltas (puntos del escaneo): zonas oscuras pequeñas rodeadas de fondo.
  const visto = new Uint8Array(w * h);
  const descartar = new Uint8Array(w * h);
  for (let inicio = 0; inicio < w * h; inicio++) {
    if (visto[inicio] || fondo[inicio]) continue;
    const zona = [];
    const cola = [inicio];
    visto[inicio] = 1;
    while (cola.length) {
      const i = cola.pop();
      zona.push(i);
      const x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j >= 0 && j < w * h && !visto[j] && !fondo[j]) {
          visto[j] = 1;
          cola.push(j);
        }
      }
    }
    if (zona.length < 80) for (const i of zona) descartar[i] = 1;
  }

  // 3. Borde suavizado: solo los píxeles de fondo a 2 px o menos del oso (así no quedan sombras ni motas).
  const BORDE = 2;
  const cerca = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (fondo[i] || descartar[i]) continue;
    const x0 = i % w;
    const y0 = (i - x0) / w;
    for (let dy = -BORDE; dy <= BORDE; dy++) {
      for (let dx = -BORDE; dx <= BORDE; dx++) {
        const x = x0 + dx;
        const y = y0 + dy;
        if (x >= 0 && x < w && y >= 0 && y < h) cerca[y * w + x] = 1;
      }
    }
  }

  // 4. RGBA: el fondo pasa a transparente conservando el borde suavizado como tinta negra semitransparente.
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (descartar[i]) continue; // queda transparente
    if (fondo[i]) {
      if (!cerca[i]) continue;
      rgba[o + 3] = Math.max(0, Math.min(255, Math.round((255 - luz[i]) * 1.6)));
    } else {
      rgba[o] = rgba[o + 1] = rgba[o + 2] = luz[i];
      rgba[o + 3] = 255;
    }
  }

  return sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 1 })
    .png()
    .toBuffer();
}

/** Silueta del logo: la versión transparente del equipo si existe; si no, la extraída del boceto. */
async function prepararLogo() {
  const transparente = path.join(origen, "logo-oso.png");
  let recortada;
  if (existsSync(transparente)) {
    const meta = await sharp(transparente).metadata();
    if (!meta.hasAlpha) throw new Error("logo-oso.png debe tener fondo transparente (PNG con canal alfa).");
    recortada = await sharp(transparente).trim({ threshold: 1 }).png().toBuffer();
  } else {
    recortada = await extraerOsoDelBoceto();
  }

  const dir = path.join(publico, "marca");
  await mkdir(dir, { recursive: true });
  await sharp(recortada).png().toFile(path.join(dir, "logo-oso.png"));

  // Ícono de la pestaña: el oso centrado en un cuadrado transparente.
  await sharp(recortada)
    .resize(64, 64, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.resolve(import.meta.dirname, "..", "src", "app", "icon.png"));

  const meta = await sharp(recortada).metadata();
  console.log(`marca/logo-oso.png  ${meta.width}×${meta.height}  (y src/app/icon.png 64×64)`);
}

if (drive) {
  for (const foto of FOTOS_DRIVE) await prepararFoto(foto);
} else {
  for (const foto of FOTOS) await prepararFoto(foto);
  await prepararLogo();
}
