---
name: Proof of Wild — Mapa de liberación
description: Apadrina a un animal rescatado y sigue su recuperación como una ruta en un mapa, comprobable en Stellar.
colors:
  profundo: "#2c4f33"
  bosque: "#386641"
  salvia: "#a7b894"
  arena: "#d8c299"
  arena-hover: "#cfb684"
  crema: "#f2e8cf"
  gris: "#f5f5f5"
  texto: "#1f2a22"
  secundario: "#4a5a4e"
  error: "#b23a2e"
  blanco: "#ffffff"
typography:
  display:
    fontFamily: "Zilla Slab, Rockwell, Georgia, serif"
    fontSize: "4.5rem"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.015em"
  heading:
    fontFamily: "Zilla Slab, Rockwell, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.015em"
  scientific:
    fontFamily: "Zilla Slab, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Archivo (wdth 75), system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  chip: "6px"
  button: "12px"
  tile: "22px"
  card: "24px"
  sheet: "28px"
  frame: "32px"
  pill: "9999px"
spacing:
  gutter-mobile: "16px"
  gutter: "32px"
  section-y: "80px"
  card-padding: "24px"
  sheet-padding: "32px"
components:
  button-primary:
    backgroundColor: "{colors.bosque}"
    textColor: "{colors.blanco}"
    rounded: "{rounded.button}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.profundo}"
  button-secondary:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.bosque}"
    rounded: "{rounded.button}"
    padding: "12px 24px"
  button-secondary-hover:
    backgroundColor: "{colors.bosque}"
    textColor: "{colors.blanco}"
  button-arena:
    backgroundColor: "{colors.arena}"
    textColor: "{colors.texto}"
    rounded: "{rounded.button}"
    padding: "12px 24px"
  button-arena-hover:
    backgroundColor: "{colors.arena-hover}"
  chip-etapa:
    backgroundColor: "{colors.arena}"
    textColor: "{colors.texto}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
  chip-logro:
    backgroundColor: "{colors.bosque}"
    textColor: "{colors.blanco}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
  case-sheet:
    backgroundColor: "{colors.blanco}"
    rounded: "{rounded.sheet}"
    padding: "{spacing.sheet-padding}"
  stage-card:
    backgroundColor: "{colors.blanco}"
    rounded: "{rounded.card}"
    padding: "20px"
  plate-total:
    backgroundColor: "{colors.bosque}"
    textColor: "{colors.blanco}"
    rounded: "{rounded.tile}"
    padding: "24px"
---

## Overview

Proof of Wild se ve como una hoja topográfica de un parque nacional. Cada caso es una ruta: el animal entra, recorre sus etapas de tratamiento y sale a la liberación. La ruta es el centro de la información: un punto por etapa, unidos por un sendero punteado; el tramo recorrido se dibuja continuo, el relleno de cada punto crece con lo cubierto y el marcador «Aquí va» late en la etapa en curso. La cadena de bloques no se decora: aparece como prueba, en cada monto que lleva a su transacción en Stellar Expert.

Modo: Persuade en la página principal (el jurado de la demo debe entender en segundos qué se apadrina y cómo se comprueba); Operate en el portal y el perfil.

## Colors

La paleta es fija por decisión del usuario. Estrategia: color comprometido por regiones, no acentos sueltos.

- **profundo** y **bosque** son los campos oscuros del mapa: portada, voluntariados, pie, bloque de apoyo del caso. Sobre ellos el texto es blanco o crema y los rótulos van en salvia.
- **crema** es el papel: el fondo general. **blanco** solo en hojas, tarjetas, ventanas y campos.
- **arena** y **salvia** son las capas medias del relieve, los chips de etapa y las placas de totales.
- **error** solo para avisos, con texto blanco.

Contraste mínimo 4,5:1 en texto normal y 3:1 en texto grande. Nunca gris sobre color: el texto secundario se tiñe del fondo (`text-white/80`, `text-texto/75`).

## Typography

- **Zilla Slab** (títulos): la slab de un letrero de parque. h1 700, h2/h3 600, interlineado 1,02–1,05, `text-wrap: balance`.
- **Zilla Slab itálica** (`.cientifico`): nombres científicos, como la hidrografía de un mapa.
- **Archivo** (texto e interfaz), con su eje de ancho: los rótulos de leyenda (`.rotulo`) usan ancho 75, 700, versalitas con 0,08em de espaciado.
- Cifras que se comparan (montos, cupos, códigos) en `.cifras` (números tabulares). Monoespaciada solo para direcciones y hashes de Stellar.

## Layout

- Contenedor de 80rem con márgenes de 16px en celular y 32px desde `sm`.
- La página principal tiene cuatro secciones ancladas (`#inicio`, `#como-funciona`, `#casos`, `#voluntariados`); el menú fijo baja a cada una y marca la visible. `scroll-padding-top` deja cada sección debajo del menú.
- Cada sección abre con su título a la izquierda y la bajada a la derecha en escritorio; 80px de aire vertical.
- La ruta es horizontal desde `sm` y vertical (sendero punteado a la izquierda) en celular.
- No hay filas de tarjetas iguales como estructura: los casos en tratamiento son hojas anchas (foto + ruta), los recuperados un trío corto.

## Elevation & Depth

La profundidad viene solo de capas planas superpuestas, como papel recortado: no hay sombras, degradados ni vidrio. Las fotos de la portada y del caso descansan sobre un paspartú de curvas de nivel (`ContourField` papel) que asoma alrededor del marco. Al pasar el mouse, una hoja sube 2–4px y su borde pasa de arena a bosque; el menú fijo se separa del contenido solo con su borde.

## Shapes

Esquinas de letrero, no píldoras: botones 12px, chips 6px, placas 22px, tarjetas 24px, hojas 28px, marcos de foto 32px. Los puntos de la ruta y los íconos de paso son círculos.

## Components

- **Botones** (`buttonClass`): primario bosque, secundario con borde bosque, arena (los tres caminos de la portada), contorno sobre fondos oscuros. Suben 2px al pasar, se hunden y encogen a 0,97 al hacer clic, con curva de resorte.
- **RouteMap**: la ruta del tratamiento (grande o compacta, clara u oscura), con pictogramas por tipo de etapa (examen, medicina, alimento, recinto, entrenamiento, liberación).
- **ContourField**: curvas de nivel en capas planas generadas con semilla fija (variantes noche, papel y bosque).
- **CaseRow / RecoveredCard**: hoja de caso y caso recuperado; foto con zoom de 1,04 al pasar.
- **StageTimeline**: el detalle de las etapas como sendero vertical; las etapas empezadas con foto, cifras, factura y pago; las pendientes en una sola línea. El número y el nombre van en el título y el estado después, nunca encima.
- **Chip**: rótulo de leyenda (etapa, logro, salvia, borde, oscuro).
- **EmptyState**: esquina de mapa sin ruta, mensaje y acción para seguir.
- **CargandoPagina / CargandoCaso**: bloques que respiran en el lugar del contenido, con aviso para lectores de pantalla.
- **Reveal**: aparición al hacer scroll (pop, sube, capa) con entrada escalonada de 85ms por paso.

## Do's and Don'ts

- Haz que cada cifra lleve a su prueba en Stellar Expert.
- Usa la ruta para hablar de etapas; no la reemplaces por barras sueltas.
- Usa pop con rebote para lo que aparece al hacer scroll y para los botones (pedido explícito del usuario, referencia kiba.tools); respeta `prefers-reduced-motion`.
- No pongas rótulos pequeños encima de un título.
- No uses sombras (ni suaves ni duras) para dar profundidad, ni franjas de color a un lado de las tarjetas.
- No armes filas de tarjetas iguales: las etapas son un sendero, los indicadores una franja de leyenda con líneas.
- No inventes testimonios, cifras de impacto ni clientes.
- No cambies los textos del documento de pantallas sin pedirlo.
