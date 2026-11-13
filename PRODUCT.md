# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Jurado de la demo (prioridad del rediseño):** evalúa el MVP el viernes 13 de noviembre de 2026 en una presentación en vivo. Tiene que entender en segundos que cada dólar se ve por etapa y que se puede comprobar en Stellar.
- **Donantes (personas):** apadrinan un caso desde su billetera de Stellar y siguen en qué etapa se usó su aporte. Su perfil muestra la insignia «Huella verificada».
- **ONG de fauna silvestre:** publican casos, registran el gasto de cada etapa pagando al proveedor y suben los hitos con foto desde su portal.
- **Voluntarios:** se inscriben a jornadas en los refugios, sin contacto con los animales.

## Product Purpose

Proof of Wild deja apadrinar a un animal rescatado y seguir cada paso de su recuperación. El aporte se reparte entre las etapas del tratamiento en orden y la ONG paga al proveedor contra una factura. Todo queda registrado en Stellar y cualquiera lo puede verificar. Éxito: el donante ve en qué se usó su plata y la ONG gana credibilidad para recibir aportes.

## Positioning

Un contrato Soroban reparte cada aporte entre las etapas del caso y paga al proveedor con el hash de la factura. La trazabilidad no es una promesa de la ONG: es un registro público que se comprueba en Stellar Expert.

## Operating Context

- Demo en testnet con datos ficticios; no se usa dinero real. Casos POW_001 a POW_005, dos ONG aprobadas (Refugio Alas Libres, Fundación Bosque Vivo) y Fundación Huellitas que se registra en vivo.
- Guion de la demo: Ana crea su cuenta, apadrina la guacamaya (POW_001) con 50 USDC, la ONG registra el gasto del medicamento y Ana ve en qué se usó su aporte.
- Cuentas con correo y contraseña (SRP-6a); aportes con la billetera (Stellar Wallets Kit).

## Capabilities and Constraints

- Next.js 16 (App Router), React 19, Tailwind 4, PostgreSQL con Drizzle; desplegado en Vercel con Neon.
- La interfaz está en español de Colombia.
- El estado de cada etapa sale de lo recaudado (completada, en curso, pendiente).
- Los textos del sitio son los del documento «Pantallas de la página»; el rediseño cambia cómo se muestra la información, no lo que dice.

## Brand Commitments

- **Paleta fija (decisión del usuario):** profundo #2c4f33, bosque #386641, salvia #a7b894, arena #d8c299, crema #f2e8cf, gris #f5f5f5, texto #1f2a22, secundario #4a5a4e, error #b23a2e.
- Logo: la silueta del oso de anteojos (public/marca/logo-oso.png).
- La página principal reúne Inicio, Cómo funciona, Casos y Voluntariados; el menú baja a cada sección sin cambiar de página.
- Movimiento pedido por el usuario: los componentes aparecen con un «pop» al hacer scroll y los botones responden al pasar el mouse y al hacer clic (referencia: kiba.tools).

## Evidence on Hand

- Fotos reales de los cinco animales, de cada etapa y de los refugios en public/fotos (sin EXIF).
- Datos de prueba y guion en «Proof_of_Wild_Datos_de_prueba_1.pdf»; pantallas en «Proof_of_Wild_Pantallas_de_la_pagina_1.pdf» (carpeta POW, fuera del repo).
- No hay testimonios, cifras de impacto ni clientes reales: no se inventan.

## Product Principles

1. Probar, no prometer: cada cifra lleva a su transacción en Stellar Expert.
2. El animal primero: la historia y la foto abren cada caso; la cadena de bloques va detrás, como prueba.
3. Claridad para un donante que nunca ha usado una billetera.
4. Privacidad: nunca se muestran nombres, correos ni datos de contacto de donantes.

## Accessibility & Inclusion

Contraste mínimo 4,5:1 para texto normal y 3:1 para texto grande; foco visible; respetar `prefers-reduced-motion`.
