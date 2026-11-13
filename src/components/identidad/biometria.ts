import type { Config, FaceResult, Human } from "@vladmandic/human";
import type { Traductor } from "@/i18n/traductor";

/**
 * Biometría en el navegador con `@vladmandic/human` (ADR-21): detecta el rostro, su malla de puntos, si es real
 * (antispoof), si está vivo (liveness) y su descriptor para compararlo. Las imágenes nunca salen del navegador; al
 * servidor solo llegan los puntajes. Los modelos se sirven desde /modelos/human y quedan en caché del navegador.
 */
const CONFIG: Partial<Config> = {
  modelBasePath: "/modelos/human/",
  backend: "webgl",
  debug: false,
  warmup: "face",
  cacheSensitivity: 0,
  filter: { enabled: true, equalization: false, flip: false },
  face: {
    enabled: true,
    detector: { rotation: false, maxDetected: 1, minConfidence: 0.3, return: false },
    mesh: { enabled: true },
    iris: { enabled: false },
    attention: { enabled: false },
    description: { enabled: true },
    emotion: { enabled: false },
    antispoof: { enabled: true },
    liveness: { enabled: true },
    gear: { enabled: false },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
  segmentation: { enabled: false },
};

let instance: Promise<Human> | null = null;

/** Carga la librería y los modelos una sola vez (unos 11 MB la primera vez). */
export function loadHuman(): Promise<Human> {
  instance ??= (async () => {
    const { Human } = await import("@vladmandic/human");
    const human = new Human(CONFIG);
    await human.load();
    await human.warmup();
    return human;
  })().catch((error) => {
    instance = null;
    throw error;
  });
  return instance;
}

export type Face = FaceResult;

/** El rostro principal de una imagen, video o lienzo. */
export async function detectFace(human: Human, input: HTMLVideoElement | HTMLCanvasElement): Promise<Face | null> {
  const result = await human.detect(input);
  return result.face[0] ?? null;
}

/** Parecido entre dos descriptores de rostro, de 0 a 1 (desde 0,5 se considera la misma persona). */
export function similarity(human: Human, a: number[], b: number[]): number {
  return human.match.similarity(a, b);
}

type Point = [number, number, number?];
const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * Apertura de los ojos (eye aspect ratio) con los puntos de la malla de MediaPipe: alto del párpado sobre el ancho
 * del ojo, promedio de los dos. Abierto ronda 0,25 a 0,35; al parpadear cae a la mitad o menos.
 */
export function eyeOpenness(face: Face): number | null {
  const m = face.meshRaw as Point[];
  if (!m || m.length < 400) return null;
  const left = dist(m[159], m[145]) / dist(m[33], m[133]);
  const right = dist(m[386], m[374]) / dist(m[362], m[263]);
  return (left + right) / 2;
}

/**
 * Hacia dónde mira la cabeza: posición de la punta de la nariz entre los extremos de los ojos (0,5 es de frente).
 * Por debajo de 0,32 o por encima de 0,68, la cabeza está girada.
 */
export function headTurn(face: Face): number | null {
  const m = face.meshRaw as Point[];
  if (!m || m.length < 400) return null;
  const width = m[263][0] - m[33][0];
  if (Math.abs(width) < 1e-6) return null;
  return (m[1][0] - m[33][0]) / width;
}

/** Recorta el rostro de una imagen en un cuadrado con margen, para mostrarlo junto al otro en la comparación. */
export function cropFace(source: HTMLCanvasElement, face: Face, size = 240): string {
  const [x, y, w, h] = face.box;
  const side = Math.max(w, h) * 1.35;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.getContext("2d")?.drawImage(source, cx - side / 2, cy - side / 2, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** Copia el cuadro actual del video a un lienzo (sin espejo: la imagen real, no la que se muestra volteada). */
export function grabFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d")?.drawImage(video, 0, 0);
  return canvas;
}

/** Dibuja una imagen subida en un lienzo, limitada a 1600 px por lado. */
export async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

/**
 * Abre la cámara. `environment` prefiere la trasera (para el documento en el celular). Si falla, lanza un error con
 * un mensaje apto para mostrar, en el idioma de `t`.
 */
export async function openCamera(facing: "user" | "environment", t: Traductor["t"]): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error(t("cuenta.identidad.camara.sinSoporte"));
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotAllowedError") throw new Error(t("cuenta.identidad.camara.sinPermiso"));
    if (name === "NotFoundError") throw new Error(t("cuenta.identidad.camara.sinCamara"));
    throw new Error(t("cuenta.identidad.camara.noAbre"));
  }
}

export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}
