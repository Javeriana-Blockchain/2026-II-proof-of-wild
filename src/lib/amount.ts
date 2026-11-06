const STROOPS_PER_UNIT = 10_000_000n;
const AMOUNT_PATTERN = /^(\d+)(?:\.(\d{1,7}))?$/;

/** Convierte un decimal de hasta 7 decimales a stroops (enteros), sin usar números de punto flotante. */
export function toStroops(amount: string): bigint {
  const match = AMOUNT_PATTERN.exec(amount);
  if (!match) {
    throw new RangeError(`Monto inválido: "${amount}". Usa un decimal positivo con hasta 7 decimales.`);
  }
  const whole = BigInt(match[1] ?? "0");
  const fraction = BigInt((match[2] ?? "").padEnd(7, "0"));
  return whole * STROOPS_PER_UNIT + fraction;
}

/** Convierte stroops a un decimal con 7 decimales, por ejemplo 255000000n -> "25.5000000". */
export function fromStroops(stroops: bigint): string {
  if (stroops < 0n) {
    throw new RangeError("Los montos negativos no son válidos.");
  }
  const whole = stroops / STROOPS_PER_UNIT;
  const fraction = (stroops % STROOPS_PER_UNIT).toString().padStart(7, "0");
  return `${whole}.${fraction}`;
}

/** Normaliza un monto positivo a 7 decimales. Lanza si es cero o no es válido. */
export function normalizePositiveAmount(amount: string): string {
  const stroops = toStroops(amount);
  if (stroops <= 0n) {
    throw new RangeError("El monto debe ser mayor que cero.");
  }
  return fromStroops(stroops);
}

export function sumAmounts(amounts: string[]): string {
  return fromStroops(amounts.reduce((total, amount) => total + toStroops(amount), 0n));
}
