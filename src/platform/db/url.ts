/**
 * Limpia la URL de conexión antes de pasársela a postgres-js. Neon (y otros PostgreSQL gestionados) agregan
 * `channel_binding=require`, que postgres-js no entiende y reenvía al servidor como parámetro de arranque, lo
 * que hace fallar la conexión. La conexión sigue cifrada con TLS (`sslmode=require`).
 * Sin imports con alias: también lo usa drizzle.config.ts.
 */
export function cleanDatabaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  url.searchParams.delete("channel_binding");
  return url.toString();
}
