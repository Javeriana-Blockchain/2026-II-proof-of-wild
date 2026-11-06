# Proof of Wild

Plataforma web donde una persona apadrina la recuperación de un animal silvestre rescatado y verifica, paso a paso, en qué se usó su aporte y qué avances logró. Los pagos y el hash de cada evidencia quedan en la red Stellar (testnet); los documentos y los datos personales quedan fuera de la red.

El MVP se presenta el 13 de noviembre de 2026. Contexto, requisitos y decisiones de diseño están en [`docs/arquitectura`](docs/arquitectura):

- [Contexto y drivers](docs/arquitectura/contexto-y-drivers.md): alcance, actores, requisitos, reglas de negocio y escenarios de calidad.
- [Arquitectura](docs/arquitectura/arquitectura.md): decisiones (ADR), vistas, trazabilidad y evaluación.

## Tecnologías

Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, PostgreSQL 16 con Drizzle ORM, `@stellar/stellar-sdk`, `@stellar/freighter-api`, zod, sharp y Vitest.

## Requisitos

- Node 22.12 o superior
- Docker (para PostgreSQL local)
- Extensión de billetera [Freighter](https://www.freighter.app) configurada en testnet

## Puesta en marcha

```bash
npm install
cp .env.example .env      # completa los valores
npm run db:up             # PostgreSQL local en el puerto 55432
npm run db:migrate        # crea las tablas
npm run db:seed           # carga los 3 casos ficticios
npm run dev               # http://localhost:3000
```

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run typecheck` | Verificación de tipos |
| `npm test` | Pruebas de reglas de dominio y adaptadores |
| `npm run db:generate` | Genera una migración a partir del esquema |
| `npm run db:migrate` | Aplica las migraciones |
| `npm run db:seed` | Carga datos de prueba |

## Estructura

```text
src/
  app/            Presentación (Next.js): páginas, layouts y rutas API
  components/     Componentes de interfaz reutilizables
  modules/        Dominio y aplicación, un directorio por capacidad
  ports/          Puertos que el dominio necesita del exterior
  platform/       Adaptadores (base de datos, Stellar, almacenamiento, sesión) y configuración
  lib/            Utilidades sin lógica de negocio
docs/arquitectura/  Contexto, drivers y arquitectura
tests/            Pruebas
```

Reglas de dependencia entre capas en [`docs/arquitectura/arquitectura.md`](docs/arquitectura/arquitectura.md#5-estructura-del-repositorio-y-reglas-de-dependencia).

## Seguridad

- No subas `.env` ni llaves secretas de Stellar al repositorio. Lo que se escribe en la red es público y no se puede borrar.
- El servidor no guarda llaves secretas de Stellar: cada persona firma con su billetera.
