# Proof of Wild

Plataforma web donde una persona apadrina la recuperación de un animal silvestre rescatado y verifica, paso a paso, en qué se usó su aporte y qué avances logró. El aporte va a un contrato en Soroban (Stellar testnet) que lo reparte entre las etapas del tratamiento; cada gasto le paga directamente al proveedor y guarda el hash de la factura, que se publica en la página. Los documentos y los datos personales quedan fuera de la red.

- **Demo en vivo:** https://proof-of-wild.vercel.app (red de pruebas: no se usa dinero real)
- **Contrato en testnet:** [`CCRRYW6APIVCRMPHCCKQXDACHYWO2VGLRPA7OASLVU3SPOVTWQBEOIFP`](https://stellar.expert/explorer/testnet/contract/CCRRYW6APIVCRMPHCCKQXDACHYWO2VGLRPA7OASLVU3SPOVTWQBEOIFP)
- **Documentos:** [arquitectura y ADR](docs/arquitectura/arquitectura.md), [contexto y drivers](docs/arquitectura/contexto-y-drivers.md), [pitch](docs/PITCH.md), [bitácora de depuración](DEBUG_LOG.md), [diseño](DESIGN.md) y [producto](PRODUCT.md)

El MVP se presenta el 13 de noviembre de 2026.

## El problema y la solución

Quien dona a un centro de rescate de fauna casi nunca sabe en qué se usó su dinero, y los centros pequeños no tienen cómo demostrarlo ni cómo hacerse visibles. Proof of Wild convierte cada caso en una ruta de etapas con su costo (valoración, tratamiento, rehabilitación, liberación):

1. La persona apadrina un caso y firma el aporte con su billetera. El contrato reparte el dinero en orden entre las etapas.
2. La ONG registra cada gasto con su factura: el contrato le paga **directo al proveedor**, solo con lo cubierto en esa etapa, y guarda el hash de la factura.
3. La ONG registra los avances (hitos) con su foto; el hash queda en el contrato.
4. Cualquiera puede comprobar en Stellar Expert el aporte, el pago al proveedor y que la factura publicada no cambió.

## Cómo usa Stellar

| Pieza | Para qué |
|---|---|
| Contrato Soroban `ProofOfWild` | Custodia el dinero de cada caso, lo reparte por etapas, paga a los proveedores y guarda los hashes de facturas y evidencias |
| USDC de prueba con su Stellar Asset Contract | El activo de los aportes (testnet, sin valor) |
| Billeteras (Freighter, Albedo, xBull…) vía Stellar Wallets Kit | Donantes y ONG firman sus propias transacciones; el servidor nunca guarda llaves |
| RPC de Soroban y Horizon | El servidor arma las transacciones sin firmar, las envía y confirma cada aporte, gasto o hito **leyéndolo en la red** |
| Stellar Expert | Cada aporte, gasto e hito de la página enlaza a su transacción |

## Contrato en testnet

| Dato | Valor |
|---|---|
| Contract ID | `CCRRYW6APIVCRMPHCCKQXDACHYWO2VGLRPA7OASLVU3SPOVTWQBEOIFP` |
| Hash del WASM desplegado | `446db659a46658667cff899615343087f322426b616d4371303da9e46d57bd6d` |
| Red | Testnet (`Test SDF Network ; September 2015`) |
| USDC de prueba (Stellar Asset Contract) | `CD2FB3H4RXEWWKJK2HNIPVATVXY4DOS673HGYM6SNZRGRNWYLDJCFYHS` |
| Emisor del USDC de prueba | `GBE4HMOIS4C7BXKREWXT4JAWIOTT5UJQT7OD7U4S3XXDMBY4HKQGZ52I` |
| Administrador del contrato | `GCVZTMZCRIMNA53WIY57PNXRYOMKWEGJBEECLO27GUWUUYJ2PKJMHLOK` |

### Consultarlo con `stellar contract invoke`

Las consultas no necesitan firma: `--send=no` solo simula y cualquier cuenta sirve como origen.

```bash
stellar contract invoke \
  --id CCRRYW6APIVCRMPHCCKQXDACHYWO2VGLRPA7OASLVU3SPOVTWQBEOIFP \
  --source-account GCVZTMZCRIMNA53WIY57PNXRYOMKWEGJBEECLO27GUWUUYJ2PKJMHLOK \
  --network testnet --send=no \
  -- consultar_caso --caso POW_002
```

Respuesta real del 12 de noviembre de 2026 (montos en unidades de 7 decimales: `250000000` = 25 USDC). Es la tortuga hicotea: la etapa 1 está cubierta y gastada, y la 2 lleva 11 de 35 USDC:

```json
{"etapas":[{"costo":"250000000","cubierto":"250000000","gastado":"250000000"},{"costo":"350000000","cubierto":"110000000","gastado":"0"},{"costo":"200000000","cubierto":"0","gastado":"0"},{"costo":"100000000","cubierto":"0","gastado":"0"}],"gastado":"250000000","hitos":1,"meta":"900000000","ong":"GBDJ2DRDWUC6LXI2OIXFYA5NVLIHUCYJJDZZ3IHI54RI5KGKSDNYIIHJ","recaudado":"360000000","saldo":"110000000"}
```

El hash de la evidencia de su primer hito:

```bash
stellar contract invoke \
  --id CCRRYW6APIVCRMPHCCKQXDACHYWO2VGLRPA7OASLVU3SPOVTWQBEOIFP \
  --source-account GCVZTMZCRIMNA53WIY57PNXRYOMKWEGJBEECLO27GUWUUYJ2PKJMHLOK \
  --network testnet --send=no \
  -- consultar_hito --caso POW_002 --indice 0
# {"etapa":1,"hash_evidencia":"edecc2599088f759f7bfe07b9ff3106810e50cf7146f34f69a1864e2a1b0663b"}
```

Un aporte sí exige la firma del donante y USDC de prueba en su cuenta (`npm run red:usdc` lo envía). Por ejemplo, 5 USDC a la tortuga desde una identidad del CLI llamada `mi-cuenta`:

```bash
stellar contract invoke \
  --id CCRRYW6APIVCRMPHCCKQXDACHYWO2VGLRPA7OASLVU3SPOVTWQBEOIFP \
  --source-account mi-cuenta --network testnet \
  -- aportar --donante mi-cuenta --caso POW_002 --monto 50000000
```

## Transacciones verificables (hashes)

Transacciones reales del contrato de la demo, todas del caso `POW_002` (tortuga hicotea, Fundación Bosque Vivo):

| Qué pasó | Hash de la transacción |
|---|---|
| `crear_caso`: el administrador registra el caso, su ONG y el costo de sus 4 etapas | [`8fefaa10deaf279572515315eb21d2530318d5d0266bd912cd6769a052b6032e`](https://stellar.expert/explorer/testnet/tx/8fefaa10deaf279572515315eb21d2530318d5d0266bd912cd6769a052b6032e) |
| `aportar`: un donante aporta 20 USDC, que van a la etapa 1 (cuesta 25) | [`6915cd5714baff2cf4c454de4ebbce47754f0c1bff8ee8124903d5d15d91d33f`](https://stellar.expert/explorer/testnet/tx/6915cd5714baff2cf4c454de4ebbce47754f0c1bff8ee8124903d5d15d91d33f) |
| `registrar_gasto`: la ONG paga 25 USDC al proveedor desde la etapa 1 y guarda el hash de la factura | [`7c800f31a82879f60ae35467a239f3715a9e5dabb98e940caa2b0464ea43bb2f`](https://stellar.expert/explorer/testnet/tx/7c800f31a82879f60ae35467a239f3715a9e5dabb98e940caa2b0464ea43bb2f) |
| `registrar_hito`: la ONG deja el hash de la evidencia del avance de la etapa 1 | [`2ae9af25acd39e7d1eaf076d864222cbe61e152c25ce6e3f9cc12e0410032753`](https://stellar.expert/explorer/testnet/tx/2ae9af25acd39e7d1eaf076d864222cbe61e152c25ce6e3f9cc12e0410032753) |

**Doble comprobación de la factura.** La factura de ese gasto está publicada. Su SHA-256 es el mismo que el último argumento (`hash_factura`) de la transacción `registrar_gasto` de arriba:

```bash
curl -s https://proof-of-wild.vercel.app/api/evidencias/e49faf45-c165-4784-a13e-fa96adadf23d.pdf | sha256sum
# a7149de98dacab80148c2f8adacd8de7680b50e71dada63d61c45637d2fc774d
```

## Funciones del contrato

Amplía el contrato `RaizSilvestre` de la semana 3 (que sigue en el historial) con lo que pide el brief. Código en [`contracts/proof-of-wild`](contracts/proof-of-wild).

| Función | Quién la firma | Qué hace |
|---|---|---|
| `inicializar(admin, token)` | Administrador, una vez | Guarda la cuenta administradora y el contrato del USDC de prueba |
| `crear_caso(caso, ong, costos_etapas)` | Administrador | Registra el caso (`POW_001`, como Symbol), la cuenta de su ONG y el costo de cada etapa |
| `aportar(donante, caso, monto)` | Donante | Transfiere el USDC al contrato y lo reparte en orden entre las etapas; rechaza lo que supere la meta. Evento `aporte` con el reparto |
| `registrar_gasto(ong, caso, etapa, proveedor, monto, hash_factura)` | La ONG del caso | Le paga al proveedor desde lo cubierto y sin gastar de esa etapa y guarda el hash de la factura. Evento `gasto` |
| `registrar_hito(ong, caso, etapa, hash_evidencia)` | La ONG del caso | Deja en la red el hash de la foto o documento. Evento `hito` |
| `consultar_caso(caso)` | Nadie (lectura) | Costo, cubierto y gastado de cada etapa, y saldo del caso |
| `consultar_hito(caso, indice)` | Nadie (lectura) | Etapa y hash de la evidencia de un hito |

## Qué hace hoy

| Parte | Estado |
|---|---|
| Contrato con etapas, reparto, pago al proveedor e hitos | Desplegado en testnet; 14 pruebas, 3 de ellas de autorización con `mock_auths` |
| Página principal única (Inicio, Cómo funciona, Casos y Voluntariados) y detalle del caso con su ruta, línea de tiempo, transparencia y aportes | En producción, con el diseño «Mapa de liberación» y estados de carga, vacíos y de hover |
| Cuentas de persona y de ONG con SRP-6a (la contraseña nunca sale del navegador) | En producción |
| Apadrinar con la billetera, con reparto previsto, comprobante y «Tu aporte» por etapa | En producción; apadrinar exige una cuenta de persona |
| Verificación de identidad por niveles: documento, prueba de vida y comparación del rostro para aportes de más de 50 USDC | En producción; la consulta al registro es simulada |
| Perfil del donante con la insignia «Huella verificada» y su página pública | En producción |
| Portal de la ONG: sus casos, saldos y registrar gastos (con factura) e hitos (con foto) | En producción |
| Registro de ONG como solicitud en revisión y perfil público de la ONG | En producción |
| Voluntariados con inscripción | En producción |
| Script que prepara la demo en testnet y prueba de punta a punta | `red:preparar` y `red:probar` (27 comprobaciones) |

## Qué NO hace todavía

- **No hay firma doble ni validador.** Un gasto lo firma solo la ONG; la firma de un validador independiente (veterinario o biólogo) queda para la etapa 2. Los niveles de validación de la página los fija la ONG.
- **No se crean ni se cierran casos desde la interfaz.** Los 5 casos de la demo los crea el script; tampoco hay manejo del saldo al cerrar un caso.
- **No hay panel de administración.** Las ONG de la demo vienen aprobadas; una ONG nueva queda «en revisión» sin que nadie la apruebe desde la página.
- **El KYC no es real.** La biometría corre en el navegador y alguien con conocimientos técnicos podría falsear sus puntajes; la consulta a la Registraduría y la verificación de las ONG son simuladas. En producción las haría un proveedor (Truora, Didit, MetaMap) con el mismo puerto `IdentityProvider`.
- **El límite de 50 USDC lo aplica la aplicación, no el contrato.** Quien llame al contrato directamente puede aportar sin verificarse.
- **Solo testnet.** El USDC no tiene valor; no hay rampa de pesos a USDC, aportes mensuales ni cuentas corporativas.
- **No hay recuperación de contraseña** ni correos.
- **Un hash no prueba que una factura sea auténtica**, solo que no cambió. Eso depende de la validación humana.
- Otros pendientes técnicos están en la [bitácora de depuración](DEBUG_LOG.md#abiertos) y en la [deuda reconocida](docs/arquitectura/arquitectura.md#deuda-reconocida).

## Pruebas

| Comando | Qué cubre |
|---|---|
| `npm test` | 103 pruebas (Vitest): reglas del dominio, adaptadores y, con `TEST_DATABASE_URL`, integración con PostgreSQL real |
| `npm run contrato:test` | 14 pruebas del contrato. Las de autorización usan `mock_auths` con firmas concretas: `aportar` solo con la firma del donante (ni la del administrador sirve) y comprueba la firma registrada con `env.auths()`; `registrar_gasto` solo con la de la ONG del caso (el proveedor no puede cobrarse solo); `crear_caso` solo con la del administrador |
| `npm run red:probar` | Prueba de punta a punta en testnet con un contrato y una base desechables: 27 comprobaciones (reparto, pago al proveedor, hashes de factura y foto, rechazos por firma ajena o transacción cambiada) |

La integración continua (GitHub Actions) corre tipos, pruebas con PostgreSQL y compilación en cada cambio, y las pruebas y la compilación del contrato.

## Puesta en marcha

Requisitos:

- Node 22.12 o superior (con nvm: `nvm use 22`)
- Docker, para PostgreSQL local
- Rust 1.91.1 con el destino `wasm32v1-none`, para compilar el contrato. En Windows sin Visual Studio Build Tools sirve la cadena GNU: `rustup toolchain install 1.91.1-x86_64-pc-windows-gnu --target wasm32v1-none` y luego `cargo +1.91.1-x86_64-pc-windows-gnu …`
- Stellar CLI, para consultar el contrato desde la terminal
- Una billetera de Stellar en testnet (por ejemplo, Freighter) para aportar desde la página

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

### Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run typecheck` | Verificación de tipos |
| `npm test` | Pruebas de dominio y adaptadores; con `TEST_DATABASE_URL`, también las de integración |
| `npm run test:integration` | Solo las pruebas de integración contra `TEST_DATABASE_URL` |
| `npm run contrato:test` | Pruebas del contrato (`cargo test`) |
| `npm run contrato:build` | WASM de release del contrato |
| `npm run red:preparar` | Prepara toda la demo en testnet (ver arriba) |
| `npm run red:probar` | Prueba de punta a punta en testnet con un contrato y una base desechables (no toca la demo) |
| `npm run red:usdc -- <cuenta G…> [monto] [--esperar]` | Envía USDC de prueba de la demo a una billetera propia para apadrinar con ella. Si la billetera no acepta aún ese USDC, imprime la línea de confianza sin firmar |
| `npm run db:migrate` | Aplica las migraciones |
| `npm run db:seed` | Carga ONG, proveedores, casos con etapas, donantes y voluntariados (sin actividad en la red) |
| `npm run db:seed:activity` | Igual, con aportes, gastos e hitos de ejemplo con **hashes inventados**: solo para trabajar la interfaz sin red |
| `npm run db:fotos` | Pone las fotos de los casos y de cada etapa en una base ya sembrada, sin tocar cuentas ni aportes |
| `node scripts/preparar-imagenes.mjs [--drive] "<carpeta>"` | Re-codifica en WebP sin EXIF las fotos que entrega el equipo |
| `npx tsx --env-file=.env scripts/evidencias-a-bd.ts` | Pasa a la base las evidencias que estaban en disco, con la misma clave |

Las evidencias (facturas y fotos de los hitos) se guardan en la base de datos (`EVIDENCE_STORAGE=db`), así la aplicación no necesita disco en Vercel. Las pruebas de integración **vacían** la base de `TEST_DATABASE_URL`: usa una base distinta de la de la demo (`proofofwild_test`, ver `.env.example`); se niegan a correr si apunta a la misma de `DATABASE_URL`.

## Cuentas, apadrinar e identidad

- `red:preparar` (o `db:seed`) crea el administrador (`admin@proofofwild.example`) y las cuentas de las 2 ONG (`contacto@alaslibres.example`, `hola@bosquevivo.example`) con la contraseña `DEMO_PASSWORD`. Ana y Fundación Huellitas crean su cuenta en vivo.
- **Apadrinar exige una cuenta de persona** con la sesión iniciada: el servidor rechaza preparar o enviar un aporte sin ella (401) o con una cuenta de ONG o de administrador (403). Sin cuenta, «Apadrinar» abre una invitación y al crear la cuenta o ingresar se vuelve al caso con la ventana abierta.
- **Verificación de identidad por niveles (KYC basado en riesgo):** hasta 50 USDC basta la cuenta; para aportes mayores el servidor exige identidad verificada (403 `verification_required`). La verificación en `/cuenta/verificar` tiene cuatro pasos: foto del documento (cédula o pasaporte), prueba de vida (mirar de frente, parpadear y girar la cabeza), comparación del rostro con el del documento (desde 50 % de coincidencia) y consulta al registro, **simulada** (un documento que termina en `0000` «no aparece»). La biometría corre en el navegador con `@vladmandic/human` y las imágenes nunca salen del equipo; se guarda solo el resultado (HMAC y últimos 4 dígitos del documento, método, coincidencia y autorización de datos sensibles). Se puede borrar desde «Mi perfil». Si la cámara falla, «Simular la verificación (demo)» la completa y queda marcada como simulada.

## Tecnologías

| Parte | Tecnología |
|---|---|
| Aplicación | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4 |
| Datos | PostgreSQL 16 con Drizzle ORM (migraciones versionadas) |
| Contrato | Rust y `soroban-sdk` 27 |
| Stellar | `@stellar/stellar-sdk` (RPC de Soroban y Horizon) y Stellar Wallets Kit |
| Cuentas | SRP-6a con `secure-remote-password`: la base de datos nunca ve la contraseña |
| Biometría | `@vladmandic/human` en el navegador |
| Otros | zod, sharp (borra el EXIF de las fotos), Vitest |
| Despliegue | Vercel (aplicación) y Neon (PostgreSQL con las evidencias); `main` es producción |

## Estructura

```text
contracts/proof-of-wild/  Contrato Soroban (Rust) y sus pruebas
scripts/                  Preparación de la red y de las imágenes, y prueba de punta a punta
src/
  app/            Presentación (Next.js): páginas, layouts, acciones y rutas API
  components/     Interfaz: inicio, casos, huella (perfil e insignia), identidad (verificación con cámara),
                  mapa (ruta y curvas de nivel), movimiento, estados, sitio y billetera
  modules/        Dominio y aplicación por capacidad (cases, catalog, contributions, identity, records, shared)
  ports/          Puertos que el dominio necesita del exterior
  platform/       Adaptadores: db, stellar (contrato y plan B clásico), storage, auth, identity, config y container.ts
  lib/            Utilidades sin lógica de negocio
public/           Fotos de la demo (sin EXIF), fotos por etapa, logo y modelos de la biometría
drizzle/          Migraciones SQL
docs/             Arquitectura (ADR-01 a ADR-21) y pitch
tests/            Pruebas de dominio, adaptadores e integración
```

## Seguridad

- No subas `.env`, `.data/` ni llaves secretas. Lo que se escribe en Stellar es público y no se puede borrar.
- El servidor no guarda llaves de las personas: cada una firma con su billetera. Las llaves de `.data/cuentas-demo.json` son solo de testnet y solo para los scripts.
- Las fotos se re-codifican sin metadatos (EXIF con GPS) y las facturas se publican sin datos personales de terceros.

## Equipo y roles

| Integrante | Rol |
|---|---|
| Diana Duran | Producto y diseño |
| André Landinez ([@andreMD287](https://github.com/andreMD287)) | Desarrollo fullstack y del contrato inteligente (Soroban) |

## Declaración de uso de IA

Usamos **Claude Code** (asistente de programación de Anthropic, con modelos Claude) durante todo el desarrollo. Lo declaramos así:

- **Commits con IA.** Cada commit hecho con Claude lleva la línea `Co-Authored-By: Claude …`. Hasta el 12 de noviembre de 2026 eran 64 de los 78 commits del repositorio. Se listan con:

  ```bash
  git log --grep="Co-Authored-By: Claude" --oneline
  ```

- **Qué hizo la IA:** escribió la mayor parte del código (contrato, pruebas, servidor, interfaz y scripts de testnet) y de la documentación técnica (arquitectura, ADR, este README y la bitácora de depuración), propuso diseños de interfaz y ayudó a depurar errores. Para el diseño usó skills de diseño (impeccable, taste-skill, ui-ux-pro-max) y componentes de 21st.dev como referencia.
- **Qué hizo el equipo:** definió el problema, el brief técnico, los datos de prueba, las pantallas y las fotos; decidió el alcance y cada cambio de producto (por ejemplo, exigir cuenta para apadrinar y el KYC por niveles); revisó y probó las funcionalidades en el navegador, con su propia billetera de testnet y en el celular, y aprobó cada publicación a producción.
- **Cómo verificamos lo que hizo la IA:** nada se fusionó sin pasar las pruebas (103 de la aplicación, 14 del contrato y la prueba de punta a punta en testnet) y la integración continua. Los errores que encontramos en el camino, incluidos los de código generado, están en [DEBUG_LOG.md](DEBUG_LOG.md).
- **Responsabilidad:** el equipo responde por todo el código y el contenido del repositorio.

## Licencia

[MIT](LICENSE).
