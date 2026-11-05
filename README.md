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

Detalles del entorno, los hashes de las transacciones y el frontend en `Docs/Ruta JaveBlockchain/gettingStarted.md`.

## Declaración de uso de IA

- **Usamos IA para explicar conceptos y errores** durante el Getting Started.
- **Usamos IA para generar código:** el frontend del reto (`index.astro`, del proyecto de la sesión que no está en este repo) se escribió con Claude Code. Los contratos `hello_world` (plantilla de `stellar contract init`) e `increment` (tutorial del curso) no se generaron con IA; los ejecutamos y verificamos en testnet.

## Estructura

```
README.md                      ← esta página: presentación y contratos
Docs/
└── Ruta JaveBlockchain/
    ├── team.md                ← integrantes, rol y wallet
    ├── gettingStarted.md      ← entorno, hello_world en testnet (mínimo) y frontend (reto)
    └── entrevistas.md         ← enlace a las entrevistas (Google Drive)
```

## Enlaces

- Sitio de la Ruta: https://javeblockchain.pages.dev
- Entregables técnicos: https://javeblockchain.pages.dev/tecnica#entregables
- Entregables de emprendimiento: https://javeblockchain.pages.dev/emprendimiento#entregables
- Getting Started oficial de contratos: https://developers.stellar.org/docs/build/smart-contracts/getting-started
