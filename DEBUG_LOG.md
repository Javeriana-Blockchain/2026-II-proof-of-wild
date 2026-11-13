# Bitácora de depuración

Errores reales que encontramos al construir Proof of Wild, cómo los diagnosticamos y cómo quedaron resueltos. Cada entrada enlaza el commit que lo arregló. Al final están los problemas que siguen abiertos.

Formato: **síntoma** (lo que se veía), **causa** (lo que de verdad pasaba), **cómo lo encontramos**, **solución** y **lección**.

---

## 2026-11-09 · La base local no respondía en Windows

- **Síntoma:** la conexión con la base de Docker se quedaba esperando hasta vencer, sin error claro. Además, el puerto 55432 ya lo usaba otro proyecto.
- **Causa:** en Windows, `localhost` resuelve primero a IPv6 (`::1`) y el PostgreSQL de Docker solo escuchaba en IPv4.
- **Solución:** la URL usa `127.0.0.1`, y el puerto se puede cambiar con `POW_DB_PORT` en `.env`. Commit `fb01024`.
- **Lección:** en Windows, `127.0.0.1` y no `localhost` para servicios en Docker.

## 2026-11-10 · Neon rechazaba la conexión desde Vercel

- **Síntoma:** la aplicación no lograba conectarse a la base de Neon.
- **Causa:** dos cosas. Neon agrega `channel_binding=require` a la URL y `postgres-js` no lo reconoce, así que lo reenvía al servidor como parámetro de arranque. Además, el pool de Neon (tipo PgBouncer en modo transacción) no admite sentencias preparadas con nombre.
- **Solución:** `cleanDatabaseUrl` quita `channel_binding` (la conexión sigue con TLS) y la usan la app y `drizzle.config.ts`; el cliente desactiva las sentencias preparadas y limita el pool a 5 conexiones. Commits `cabb4e2` y `f11a91f`.
- **Lección:** probar la URL real del proveedor desde el primer despliegue, no solo la de Docker.

## 2026-11-10 · Un aporte rechazado quedaba «fallido» aunque luego entrara en la red

- **Síntoma:** si la red rechazaba un aporte (por ejemplo, firmado con otra cuenta) y luego llegaba la misma transacción bien firmada, la copia en la base seguía `fallida` aunque el aporte sí entraba en el contrato.
- **Causa:** el hash de una transacción de Stellar no incluye las firmas. La segunda transacción tenía el mismo hash y la base la trataba como un duplicado ya resuelto.
- **Solución:** una transacción `fallida` que llega otra vez vuelve a `enviada` y se confirma leyendo la red; una `confirmada` no cambia (ADR-12). La prueba de punta a punta (`npm run red:probar`) incluye ese rechazo. Commit `5d81d9a`.
- **Lección:** la fuente de verdad es la red; la base solo es una copia que se debe poder corregir.

## 2026-11-10 · Una etapa «Completada» mostraba 0 de 40 USDC

- **Síntoma:** Diana lo reportó al revisar la demo: una etapa marcada como completada mostraba 0 de 40 USDC.
- **Causa:** el estado de cada etapa venía escrito a mano en los datos de prueba y no coincidía con lo aportado en el contrato.
- **Solución:** el estado se calcula con lo cubierto, igual que el contrato llena las etapas: completada si está cubierta, en curso la primera sin cubrir, pendientes las demás (ADR-19). Commit `314f24d`.
- **Lección:** no guardar dos veces un dato que se puede derivar.

## 2026-11-10 · Error de hidratación al hacer scroll

- **Síntoma:** React avisaba de un error de hidratación en la página principal.
- **Causa:** un observador global agregaba la clase de aparición al HTML del servidor antes de que React hidratara cada bloque.
- **Solución:** cada bloque animado es un componente `<Reveal>` que se marca visible después de hidratar, al entrar en pantalla. Commit `cb92eba`.
- **Lección:** nada debe tocar el DOM que React todavía no hidrató.

## 2026-11-10 · Un componente del servidor importaba una constante de un módulo de cliente

- **Síntoma:** al compilar, Next.js fallaba al usar la lista de secciones del menú desde la página principal.
- **Causa:** la constante `SECCIONES` vivía en un archivo con `"use client"`, y un componente del servidor no puede importar valores de ese límite.
- **Solución:** la constante pasó a `components/sitio/secciones.ts`, sin directiva, y la usan los dos lados. Quedó en el mismo commit de la página principal, `4248a16`.

## 2026-11-10 · Las rutas viejas respondían 200 y redirigían en el navegador

- **Síntoma:** al pasar a una sola página principal, `/casos` respondía 200 y luego saltaba a `/#casos` en el navegador; un enlace compartido no bajaba a la sección.
- **Causa:** el `loading.tsx` empieza a transmitir la página antes de la redirección, así que el `redirect()` ya no puede cambiar el código de estado.
- **Cómo lo encontramos:** pidiendo las rutas con `curl`, que mostraba 200 donde esperábamos una redirección.
- **Solución:** las redirecciones van en `next.config.ts` y responden 307 desde el servidor. En el primer commit faltó el archivo de configuración y las rutas daban 404. Commits `91d4553` y `7494e8d`.
- **Lección:** revisar `git status` antes de cada commit, sobre todo cuando se borran archivos.

## 2026-11-10 · La página de «no encontrado» repetía el menú y el pie

- **Síntoma:** un caso inexistente mostraba dos encabezados y dos pies.
- **Causa:** el `not-found.tsx` de la raíz traía su propio menú y se renderizaba dentro del layout del sitio, que ya tenía uno.
- **Solución:** `(sitio)/not-found.tsx` con un componente `NoEncontrado` sin menú. Commit `91d4553`.

## 2026-11-10 · Columna ambigua en el portal de la ONG

- **Síntoma:** el portal fallaba con `column reference "amount" is ambiguous`.
- **Causa:** una subconsulta de Drizzle sobre aportes y repartos usaba `amount` de dos tablas sin calificar.
- **Solución:** una consulta aparte, agrupada, para los repartos. Commit `314f24d`.

## 2026-11-10 · Freighter no aparecía en la lista de billeteras

- **Síntoma:** al apadrinar, la lista de billeteras no mostraba Freighter.
- **Causa:** en Stellar Wallets Kit 2.8 el módulo de Freighter se llama «Varial» (`productId: "varial"`); estaba en la lista con un nombre que nadie reconocía.
- **Solución:** se muestra como «Freighter (Varial)» y va primero. Commit `9cfd503`.

## 2026-11-11 · La base local dejó de responder (`ECONNREFUSED 127.0.0.1:55442`)

- **Síntoma:** las pruebas y el servidor fallaban con `ECONNREFUSED`.
- **Causa:** Docker Desktop se había detenido durante la noche.
- **Solución:** `docker desktop start` y `docker compose up -d db`. Sin cambios de código.

## 2026-11-12 · La biometría rompía el render en el servidor

- **Síntoma:** `/cuenta/verificar` respondía 500 con `Module not found: Can't resolve '@tensorflow/tfjs-node'`.
- **Causa:** `@vladmandic/human` declara la condición `node` en sus `exports`. Al prerenderizar el componente de cliente en el servidor, Turbopack tomaba la versión para Node, que pide TensorFlow nativo.
- **Cómo lo encontramos:** la traza de importación en los registros del servidor apuntaba a `human.node.js`.
- **Solución:** un alias en `next.config.ts` (`turbopack.resolveAlias`) hacia `dist/human.esm.js`, la versión del navegador; la librería solo se carga con `import()` dentro de los efectos. Commit `056259d`.
- **Lección:** revisar la tabla `exports` de una librería que funciona en navegador y en Node antes de usarla en un componente de cliente.

## 2026-11-12 · La celebración final de la verificación no se veía

- **Síntoma:** al terminar la verificación, la página saltaba directo a «Ya verificaste tu identidad» sin mostrar el sello.
- **Causa:** la acción del servidor llamaba `revalidatePath`, y eso refresca la página actual; el servidor la volvía a renderizar ya con la verificación y desmontaba el flujo.
- **Cómo lo encontramos:** probando el flujo completo en el navegador antes de publicarlo.
- **Solución:** la acción ya no revalida (el perfil es dinámico y no lo necesita). Commit `056259d`.

## 2026-11-12 · Los pasos de la verificación se montaban en el celular

- **Síntoma:** en 375 px de ancho, «Comparación» y «Registro» se encimaban.
- **Solución:** en el celular solo se lee el nombre del paso actual; los demás quedan como número o visto bueno. Commit `7749029`.

---

## Abiertos

- **Las páginas que no existen responden 200.** `notFound()` llega cuando el sitio ya empezó a transmitir la página, así que se muestra «no encontrado» con código 200.
- **No hay tarea programada de reconciliación.** `reconcile()` existe, pero si el navegador se cierra antes de confirmar, un aporte queda `enviada` hasta que alguien vuelva a consultarlo.
- **La guacamaya tiene 10 USDC de una prueba con una billetera propia en el contrato de la demo.** Antes de presentar hay que volver a correr `npm run red:preparar` (contrato nuevo) y actualizar Neon y las variables de Vercel.
- **La verificación de identidad usa un registro simulado** y la biometría corre en el navegador (ver ADR-21).
