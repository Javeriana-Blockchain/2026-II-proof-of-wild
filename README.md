# Proof of Wild · Ruta JaveBlockchain 2026-II

> Equipo de la Ruta JaveBlockchain del Semillero de la Pontificia Universidad Javeriana.

## Qué es este proyecto

Quienes quieren financiar la recuperación de animales rescatados del tráfico ilegal de fauna no pueden verificar si su aporte se usó para lo anunciado, qué organización lo recibió, qué actividades se financiaron ni qué avances de recuperación se pueden demostrar. Esa falta de trazabilidad entre dinero, evidencia y resultados desanima a donantes que quieren actuar.

Proof of Wild es una plataforma sobre Stellar que permite financiar la recuperación de un caso de rescate y comprobar qué dinero se recibió, qué gastos se reportaron con qué evidencia y qué avances están documentados y quién los validó.

**Cliente principal:** donantes potenciales, personas (20 a 30 años, en Bogotá, según 3 entrevistas por validar) que rechazan el tráfico de fauna, sienten que no pueden hacer nada al respecto y donarían si supieran que el dinero llega directamente al animal. **Secundarios:** empresas y organizaciones que quieran apoyar, y los centros de rescate que necesitan recursos para la rehabilitación (aún sin entrevistar).

Datos del problema (fuentes en la síntesis de entrevistas del equipo): el 70 % de los animales traficados en Colombia muere antes de llegar a su destino (Osma Solano, 2026) y Bogotá es el principal punto de salida del tráfico (Casallas, 2026).

## Estructura

```
README.md                      ← esta página: presentación del proyecto
Docs/
└── Ruta JaveBlockchain/
    ├── team.md                ← integrantes, rol y wallet
    ├── gettingStarted.md      ← entorno, hello_world en testnet (mínimo) y frontend (reto)
    └── entrevistas.md         ← cinco entrevistas y su síntesis
```

| Archivo | Qué contiene | Quién lo llena |
|---|---|---|
| [`team.md`](<Docs/Ruta JaveBlockchain/team.md>) | Una fila por integrante: nombre, rol (Emprendimiento o Técnico) y wallet de testnet | Todo el equipo |
| [`gettingStarted.md`](<Docs/Ruta JaveBlockchain/gettingStarted.md>) | Mínimo, paso 2 del Getting Started: versiones de `rustc` y `stellar`, y el `hello_world` desplegado con Contract ID, enlace y hash del invoke. Reto, paso 5: el frontend de Hello World | Integrantes con rol Técnico |
| [`entrevistas.md`](<Docs/Ruta JaveBlockchain/entrevistas.md>) | Cinco entrevistas con perfil, citas textuales, qué hace hoy la persona y qué le cuesta, y la síntesis | Integrantes con rol Emprendimiento |

## Enlaces

- Sitio de la Ruta: https://javeblockchain.pages.dev
- Entregables técnicos: https://javeblockchain.pages.dev/tecnica#entregables
- Entregables de emprendimiento: https://javeblockchain.pages.dev/emprendimiento#entregables
- Getting Started oficial de contratos: https://developers.stellar.org/docs/build/smart-contracts/getting-started
