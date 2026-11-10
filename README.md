# Proof of Wild

Plataforma web donde una persona apadrina la recuperación de un animal silvestre rescatado y verifica, paso a paso, en qué se usó su aporte y qué avances logró. El aporte va a un contrato en Soroban (Stellar testnet) que lo reparte entre las etapas del tratamiento; cada gasto le paga directamente al proveedor y guarda el hash de la factura, que se publica en la página. Los documentos y los datos personales quedan fuera de la red.

El MVP se presenta el 13 de noviembre de 2026. Contexto, requisitos y decisiones de diseño están en [`docs/arquitectura`](docs/arquitectura).

## Tecnologías

| Parte | Tecnología |
|---|---|
| Aplicación | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4 |
| Datos | PostgreSQL 16 con Drizzle ORM (migraciones versionadas) |
| Contrato | Rust y `soroban-sdk` 27 en [`contracts/proof-of-wild`](contracts/proof-of-wild) |
| Stellar | `@stellar/stellar-sdk` (RPC de Soroban y Horizon) |
| Cuentas | SRP-6a con `secure-remote-password`: la base de datos nunca ve la contraseña |
| Otros | zod, sharp (borra el EXIF de las fotos), Vitest |

## Requisitos

- Node 22.12 o superior (con nvm: `nvm use 22`)
- Docker, para PostgreSQL local
- Rust 1.91.1 con el destino `wasm32v1-none`, para compilar el contrato. En Windows sin Visual Studio Build Tools sirve la cadena GNU: `rustup toolchain install 1.91.1-x86_64-pc-windows-gnu --target wasm32v1-none` y luego `cargo +1.91.1-x86_64-pc-windows-gnu …`
- Una billetera de Stellar en testnet (por ejemplo, Freighter) para aportar desde la página

## Puesta en marcha

```bash
npm install
cp .env.example .env      # completa SESSION_SECRET, CRON_SECRET y DEMO_PASSWORD
npm run db:up             # PostgreSQL local (puerto POW_DB_PORT, por defecto 55432)
npm run db:migrate        # crea las tablas
npm run contrato:build    # compila el WASM del contrato
npm run red:preparar      # cuentas, USDC de prueba, contrato, casos y actividad en testnet
npm run dev               # http://localhost:3000
```

`red:preparar` deja la demo lista en unos minutos y se puede repetir cuando algo falle o después de un reinicio de testnet (el próximo anunciado es el 16 de diciembre de 2026). Crea y fondea con Friendbot las cuentas del administrador, el emisor del USDC, las 2 ONG, los 5 proveedores y los 8 donantes; emite el USDC de prueba y despliega su Stellar Asset Contract; despliega el contrato, crea los 5 casos y hace en la red los 13 aportes del documento de datos de prueba, en su orden, con los gastos (pago al proveedor y factura PDF de ejemplo) y los hitos. Reinicia la base de datos con esos datos y escribe `CONTRACT_ID`, `ASSET_ISSUER` y `ASSET_CONTRACT_ID` en `.env`. Las llaves de testnet quedan en `.data/cuentas-demo.json`, que git ignora.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run typecheck` | Verificación de tipos |
| `npm test` | Pruebas de dominio y adaptadores; con `TEST_DATABASE_URL`, también las de integración |
| `npm run contrato:test` | Pruebas del contrato (`cargo test`) |
| `npm run contrato:build` | WASM de release del contrato |
| `npm run red:preparar` | Prepara toda la demo en testnet (ver arriba) |
| `npm run red:probar` | Prueba de punta a punta en testnet con un contrato y una base desechables (no toca la demo) |
| `npm run db:migrate` | Aplica las migraciones |
| `npm run db:seed` | Carga ONG, proveedores, casos con etapas, donantes y voluntariados (sin actividad en la red) |
| `npm run db:seed:activity` | Igual, con aportes, gastos e hitos de ejemplo con **hashes inventados**: solo para trabajar la interfaz sin red |

Las pruebas de integración **vacían** la base de `TEST_DATABASE_URL`: usa una base distinta de la de la demo (`proofofwild_test`, ver `.env.example`). Se niegan a correr si apunta a la misma de `DATABASE_URL`.

`red:probar` recorre el camino real del servidor en testnet sin tocar la demo: crea cuentas, un USDC de prueba y un contrato nuevos, usa la base de `TEST_DATABASE_URL`, y hace un aporte, un gasto con factura y un hito con foto firmando con llaves de prueba, como lo haría la billetera. Comprueba que el reparto previsto, el del contrato y el guardado coincidan, que el proveedor reciba el pago, que la factura y la foto publicadas tengan el hash del contrato, los rechazos (meta, etapa sin fondos, firma ajena, transacción cambiada) y que el catálogo, el comprobante y el perfil muestren lo mismo que `consultar_caso`. Tarda unos dos minutos.

## Contrato Proof of Wild

Amplía el contrato `RaizSilvestre` de la semana 3 (que sigue en el historial) con lo que pide el brief:

| Función | Quién la llama | Qué hace |
|---|---|---|
| `inicializar(admin, token)` | Administrador, una vez | Guarda la cuenta administradora y el contrato del USDC de prueba |
| `crear_caso(caso, ong, costos_etapas)` | Administrador | Registra el caso (`POW_001`, como Symbol), la cuenta de su ONG y el costo de cada etapa |
| `aportar(donante, caso, monto)` | Donante | Transfiere el USDC al contrato y lo reparte en orden entre las etapas; rechaza lo que supere la meta. Evento `aporte` con el reparto |
| `registrar_gasto(ong, caso, etapa, proveedor, monto, hash_factura)` | La ONG del caso | Le paga al proveedor desde lo cubierto y sin gastar de esa etapa y guarda el hash de la factura. Evento `gasto` |
| `registrar_hito(ong, caso, etapa, hash_evidencia)` | La ONG del caso | Deja en la red el hash de la foto o documento. Evento `hito` |
| `consultar_caso(caso)` | Cualquiera | Costo, cubierto y gastado de cada etapa, y saldo del caso |
| `consultar_hito(caso, indice)` | Cualquiera | Etapa y hash de la evidencia de un hito |

Toda función que mueve dinero o escribe datos exige la firma de quien la llama. La firma doble (ONG y validador) para los gastos queda para la etapa 2.

## Cuentas de la demo

`red:preparar` (o `db:seed`) crea el administrador (`admin@proofofwild.example`) y las cuentas de las 2 ONG (`contacto@alaslibres.example`, `hola@bosquevivo.example`) con la contraseña `DEMO_PASSWORD`. Ana y Fundación Huellitas crean su cuenta en vivo. El inicio de sesión usa SRP-6a: el navegador demuestra que conoce la contraseña sin enviarla y el servidor solo guarda la sal y el verificador.

## Estado del MVP

| Parte | Estado |
|---|---|
| Contrato con etapas, reparto, gasto al proveedor e hitos | Construido, 11 pruebas |
| Script de preparación en testnet | Construido |
| Inicio, lista de casos y detalle con línea de tiempo, transparencia y aportes | Construido con el diseño |
| Cómo funciona | Construido |
| Crear cuenta, ingresar (SRP-6a) y terminar perfil de persona | Construido y probado en el navegador |
| Registro de ONG como solicitud en revisión | Construido y probado en el navegador |
| Perfil público de la ONG | Construido |
| Voluntariados con su inscripción | Construido y probado en el navegador |
| Ventana de apadrinar con la billetera y comprobante; «Tu aporte» por etapa | Construido; preparar y su vista previa probados con el contrato real |
| Perfil del donante con su insignia «Huella verificada» y página pública | Construido y probado en el navegador |
| Portal de la ONG con registrar gasto e hito | Construido; ventanas probadas en el navegador |
| Aporte, gasto e hito de punta a punta en testnet (`red:probar`) | 27 comprobaciones pasan |

## Estructura

```text
contracts/proof-of-wild/  Contrato Soroban (Rust) y sus pruebas
scripts/                  Preparación de la red y de las imágenes, y prueba de punta a punta
src/
  app/            Presentación (Next.js): páginas, layouts, acciones y rutas API
  components/     Componentes de interfaz
  modules/        Dominio y aplicación por capacidad (cases, catalog, contributions, records, shared)
  ports/          Puertos que el dominio necesita del exterior
  platform/       Adaptadores: db, stellar (contrato y plan B clásico), storage, auth, config
  lib/            Utilidades sin lógica de negocio
public/           Fotos de la demo (sin EXIF) y logo
drizzle/          Migraciones SQL
docs/arquitectura/  Contexto, drivers y arquitectura
tests/            Pruebas de dominio, adaptadores e integración
```

## Seguridad

- No subas `.env`, `.data/` ni llaves secretas. Lo que se escribe en Stellar es público y no se puede borrar.
- El servidor no guarda llaves de las personas: cada una firma con su billetera. Las llaves de `.data/cuentas-demo.json` son solo de testnet y solo para el script.
- Las fotos se re-codifican sin metadatos (EXIF con GPS) y las facturas se publican sin datos personales de terceros.
