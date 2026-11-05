# Informe técnico · Proof of Wild

Equipo de la Ruta JaveBlockchain 2026-II, nivel Builders. Este informe describe el problema que queremos resolver, la hipótesis, el diseño del contrato, cómo lo probamos y qué falta.

## 1. Antecedentes

El tráfico ilegal de fauna silvestre deja animales que llegan a centros de rescate. En Bogotá, esos animales pasan por cuarentena de 30 a 90 días según la especie y luego por rehabilitación; algunos deben quedarse bajo cuidado humano de forma permanente (Paz Cardona, 2019). Bogotá es el principal punto de salida del tráfico por El Dorado, y fuera de la capital hay menos recursos (Casallas, 2026).

Entre 2024 y agosto de 2026 se recuperaron 15.540 animales silvestres en Bogotá, de los cuales 1.527 eran víctimas del tráfico (Casallas, 2026). El 70 % de los animales traficados en Colombia muere antes de llegar a su destino, y solo el 8 % de los casos llega a condena (Osma Solano, 2026).

## 2. Planteamiento del problema

### 2.1 Justificación

Quienes quieren financiar la recuperación de estos animales no pueden verificar si su aporte se usó para lo anunciado, qué organización lo recibió, qué actividades financió ni qué avances de recuperación se pueden demostrar. Esa falta de trazabilidad entre dinero, evidencia y resultados puede desanimar a donantes que quieren actuar.

En las entrevistas, dos de tres donantes dijeron sentirse impotentes: "me frustra no poder hacer nada al respecto" (P1) y "me afecta bastante también no poder hacer nada al respecto" (P2). El tercero (P3) donaría "al saber que ese dinero se va directamente al animal".

### 2.2 Objetivos

- **General:** construir un contrato y una aplicación sobre Stellar que permitan financiar un caso de rescate y comprobar en cadena qué dinero se recibió, qué gastos se reportaron con qué evidencia y qué hitos de recuperación fueron validados.
- **Específicos:**
  1. Registrar casos de rescate abiertos por organizaciones autorizadas.
  2. Permitir donaciones en un token SEP-41 asociadas a un caso.
  3. Pagar desembolsos solo cuando dos aprobadores los firman.
  4. Registrar hitos de recuperación con su evidencia y validarlos.

### 2.3 Viabilidad

- **Técnica:** el contrato compila, pasa sus 11 pruebas y está desplegado en testnet, donde se ejecutó de punta a punta un caso con donaciones y un desembolso aprobado (ver sección 6).
- **Operativa:** requiere organizaciones de rescate que acepten reportar gastos y aprobadores que validen hitos. No está probado con ninguna organización real.
- **Legal y de confianza:** las donaciones en plataformas digitales tienen poca confianza en Colombia (SmartPR, 2023), y el diseño depende de que los hashes de evidencia se guarden fuera de la cadena de forma verificable.

### 2.4 Deficiencias en el conocimiento del problema

- Solo hay tres entrevistas a donantes. Faltan entrevistas con centros de rescate y con organizaciones, que son los que reciben los fondos.
- El perfil del cliente principal (20 a 30 años, en Bogotá, universitario o profesional) es un supuesto; las entrevistas no lo preguntaron.
- No sabemos cuánto dinero necesita un caso típico ni cuántos casos se financian al año.

## 3. Hipótesis

Si las personas que quieren ayudar a animales rescatados pueden ver, en cadena y con evidencia verificable, en qué se usó su dinero, sentirán que sí pueden hacer algo y donarán con más confianza. Esta hipótesis aún no se ha probado con donantes reales.

## 4. Marco teórico

- **Stellar y Soroban:** Stellar es una red pública de pagos; Soroban es su plataforma de contratos inteligentes en Rust. Usamos el SDK 27.0.6 y la red de pruebas (testnet).
- **Tokens SEP-41:** interfaz estándar de tokens en Soroban. Las donaciones usan un token SEP-41; en las pruebas usamos XLM mediante su contrato de token nativo.
- **Hashes de evidencia:** el contrato guarda solo `BytesN<32>` para el expediente del caso (`meta_hash`) y para cada factura o evidencia (`evidence_hash`). Así la cadena prueba la existencia de un documento sin exponer su contenido.
- **Aprobación múltiple:** un desembolso requiere `threshold` firmas de aprobadores distintos antes de ejecutarse. En la prueba end-to-end, el umbral es 2.

## 5. Diseño del contrato

El contrato `RaizSilvestre` (código en `contracts/raiz/`) define estos actores y funciones. El detalle está en `Docs/diseno-contrato.md`.

| Actor | Funciones principales |
|---|---|
| Admin | `initialize`, `authorize_org` |
| Organización de rescate | `register_case`, `propose_disbursement`, `record_milestone` |
| Donante | `donate` |
| Aprobador | `approve_disbursement`, `validate_milestone` |

Las consultas (`get_case`, `get_proposal`, `get_milestone`, `case_balance`, entre otras) son de solo lectura.

## 6. Metodología y resultados

### 6.1 Entrevistas

Se entrevistó a tres donantes potenciales (P1, P2 y P3). Con la síntesis se construyeron el mapa de empatía, el canvas de declaración del problema y el arquetipo de cliente (documento de la semana 1). Los resultados se usan para formular la hipótesis de la sección 3.

### 6.2 Pruebas del contrato

Se ejecutan 11 pruebas con `cargo test`:

- Inicialización única y umbral válido.
- Una organización no autorizada no puede abrir casos.
- Montos no positivos se rechazan.
- No se puede proponer un desembolso mayor que el saldo del caso.
- Un no aprobador o una segunda firma del mismo aprobador se rechaza.
- Una propuesta ejecutada no se puede volver a aprobar.
- Dos propuestas en competencia no pueden sobregirar el caso.
- Un hito se reporta y después se valida.
- Flujo completo: donación, propuesta, dos aprobaciones y pago.

Las pruebas se ejecutan en cada PR con el workflow `.github/workflows/ci.yml`.

### 6.3 Prueba en testnet

El contrato está desplegado en testnet con Contract ID `CCX4PHUBWI4RU47II5YNTB7DOEOK4EOC4BFMHYLNV5K366YLNQTJRJNK`. Se inicializó con dos aprobadores y umbral 2, y se probó el flujo completo con cuentas de testnet:

- Caso 1: meta de 1000 XLM.
- Donaciones por 80 XLM.
- Propuesta de desembolso por 35 XLM, aprobada por dos firmas. Estado final: `Executed`.

Las cuentas de prueba son de testnet y no tienen valor real.

## 7. Limitaciones y trabajo pendiente

- **Cierre de casos:** no hay función para cerrar un caso ni para devolver fondos a donantes si el caso no alcanza la meta. Es el siguiente paso del diseño.
- **Inicialización:** `initialize` no está protegido contra un atacante que lo ejecute antes que el admin. En producción debe llamarse en el mismo despliegue.
- **Aprobadores fijos:** los aprobadores no se pueden cambiar después de `initialize`.
- **Aplicación:** la aplicación de usuario no está terminada. El frontend del reto de la semana 2 solo muestra la llamada a `hello_world`.
- **Validación con usuarios:** no hemos probado la propuesta de valor con donantes reales ni con organizaciones de rescate.
- **Fuentes:** las cifras de esta sección vienen de la investigación secundaria citada en la síntesis de la semana 1 y no se han verificado de forma independiente.

## 8. Referencias

- Casallas, J. J. (2026, 17 de septiembre). *Bogotá se ha consolidado como epicentro exportador del tráfico de fauna silvestre*. Agronegocios.
- Osma Solano, E. A. (2026, 22 de mayo). *Crean ruta contra tráfico de fauna silvestre*. Diario Occidente.
- Paz Cardona, A. J. (2019, 11 de abril). *En Bogotá existe un lugar donde salvan miles de animales silvestres al año*. Mongabay Latam.
- SmartPR. (2023, 19 de enero). *Cinco consejos que debes tener en cuenta al momento de donar para causas sociales en Colombia*. Impacto TIC.
