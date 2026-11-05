# Proof of Wild · Ruta JaveBlockchain 2026-II

> Equipo de la Ruta JaveBlockchain del Semillero de la Pontificia Universidad Javeriana.
> Nivel: **Builders** (técnico) · integrantes en `Docs/Ruta JaveBlockchain/team.md`.

## Qué es este proyecto

Quienes quieren financiar la recuperación de animales rescatados del tráfico ilegal de fauna no pueden verificar si su aporte se usó para lo anunciado, qué organización lo recibió, qué actividades se financiaron ni qué avances de recuperación se pueden demostrar. Esa falta de trazabilidad entre dinero, evidencia y resultados desanima a donantes que quieren actuar.

Proof of Wild es una plataforma sobre Stellar que permite financiar la recuperación de un caso de rescate y comprobar qué dinero se recibió, qué gastos se reportaron con qué evidencia y qué avances están documentados y quién los validó.

**Cliente principal:** donantes potenciales, personas (20 a 30 años, en Bogotá, según 3 entrevistas por validar) que rechazan el tráfico de fauna, sienten que no pueden hacer nada al respecto y donarían si supieran que el dinero llega directamente al animal. **Secundarios:** empresas y organizaciones que quieran apoyar, y los centros de rescate que necesitan recursos para la rehabilitación (aún sin entrevistar).

Datos del problema (fuentes en la síntesis de entrevistas del equipo): el 70 % de los animales traficados en Colombia muere antes de llegar a su destino (Osma Solano, 2026) y Bogotá es el principal punto de salida del tráfico (Casallas, 2026).

## Contratos en testnet

| Contrato | Contract ID (testnet) | Para qué |
|---|---|---|
| `hello_world` | `CDL36CHCVLCBVTJLLKVAXVZGWWLDFHCSIQLL7EZTHGS3GSVQYYQT3BJ4` | Getting Started, paso 2 (mínimo) |
| `increment` | `CCYA2WPUQZCZCU5SOMVY4ZVAHJIBM6P5SKYUV6P4JUH66PQ5ST5HO5I4` | Getting Started, paso 5 (reto) |
| `RaizSilvestre` (código en `contracts/raiz/`) | `CCX4PHUBWI4RU47II5YNTB7DOEOK4EOC4BFMHYLNV5K366YLNQTJRJNK` | Contrato del proyecto: casos, donaciones, desembolsos con aprobación y hitos |

El contrato `RaizSilvestre` ya está desplegado y probado de punta a punta en testnet: un caso con meta de 1000 XLM, donaciones de 80 XLM y un desembolso de 35 XLM aprobado por dos firmas (estado `Executed`).

Las llaves secretas no están en este repositorio.

## Cómo correrlo

Requisitos: Rust 1.91 o superior, `stellar-cli` 23.1.4 y Node 22.

```bash
# Pruebas del contrato
cargo test --manifest-path contracts/raiz/Cargo.toml
```

Las mismas pruebas corren en cada PR con el workflow `.github/workflows/ci.yml`.

El frontend del reto (paso 5) está descrito en `Docs/Ruta JaveBlockchain/gettingStarted.md`, con la captura `Docs/Ruta JaveBlockchain/frontend.png`.

## Estructura

```
README.md                      ← esta página: presentación, contratos y cómo correrlo
.github/workflows/ci.yml       ← CI: pruebas del contrato en cada PR
contracts/raiz/                ← contrato RaizSilvestre (Cargo.toml, src/lib.rs, types.rs, test.rs)
Docs/
├── diseno-contrato.md         ← diseño del contrato: actores, funciones y reglas
├── informe.md                 ← informe técnico: problema, hipótesis, diseño, pruebas y limitaciones
└── Ruta JaveBlockchain/
    ├── team.md                ← integrantes, rol y wallet
    ├── gettingStarted.md      ← entorno, hello_world en testnet (mínimo) y frontend (reto)
    └── entrevistas.md         ← enlace a las entrevistas (Google Drive)
```

## Declaración de uso de IA

- **Usamos IA para generar código:** el contrato `contracts/raiz/` (`lib.rs`, `types.rs`), sus pruebas (`test.rs`), el workflow de CI y borradores de documentación (`Docs/diseno-contrato.md`), con Claude Code.
- **Usamos IA para explicar conceptos y errores.**
- Las pruebas fueron ejecutadas por el equipo técnico y André Landinez puede explicar cada parte del contrato.

## Enlaces

- Sitio de la Ruta: https://javeblockchain.pages.dev
- Entregables técnicos: https://javeblockchain.pages.dev/tecnica#entregables
- Entregables de emprendimiento: https://javeblockchain.pages.dev/emprendimiento#entregables
- Getting Started oficial de contratos: https://developers.stellar.org/docs/build/smart-contracts/getting-started
