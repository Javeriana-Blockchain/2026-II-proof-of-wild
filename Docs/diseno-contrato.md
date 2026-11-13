# Diseño del contrato · Proof of Wild (semana 3)

**Estado:** propuesta del equipo técnico, **pendiente de aprobación del mentor**.
**Código:** `contracts/raiz/` (contrato `RaizSilvestre`, nombre heredado del proyecto anterior). Las firmas y las pruebas están en `contracts/raiz/src/`.

## Problema que resuelve el contrato

Un donante quiere saber que su dinero llegó a un caso de rescate, en qué se gastó, con qué evidencia y quién lo validó. El contrato registra esas etapas en Stellar, sin guardar datos sensibles: los documentos viven fuera de la cadena y en la cadena solo se guarda su hash.

## Actores

| Actor | Qué puede hacer |
|---|---|
| Admin | Inicializa el contrato y autoriza organizaciones de rescate |
| Organización de rescate | Abre casos, propone desembolsos y registra hitos de recuperación |
| Donante | Aporta fondos a un caso |
| Aprobador (p. ej. veterinario) | Co-firma desembolsos y valida hitos. Se requieren `threshold` firmas |

## Funciones

| Función | Quién llama | Qué hace |
|---|---|---|
| `initialize(admin, token, approvers, threshold)` | Admin (una vez) | Configura el contrato. Falla si `threshold` es 0 o mayor que el número de aprobadores |
| `authorize_org(org)` | Admin | Permite que una organización abra casos |
| `register_case(org, goal, meta_hash) -> case_id` | Organización autorizada | Abre un caso con meta de financiación y hash del expediente |
| `donate(donor, case_id, amount)` | Donante | Transfiere el token SEP-41 al contrato y lo asigna al caso |
| `propose_disbursement(case_id, amount, evidence_hash) -> proposal_id` | Organización | Pide un pago con hash de la factura. El dinero queda en el contrato |
| `approve_disbursement(approver, proposal_id)` | Aprobador | Co-firma. Con `threshold` firmas distintas, el pago se ejecuta |
| `record_milestone(case_id, kind, evidence_hash) -> index` | Organización | Registra un hito (`vet_eval`, `rehab_start`, `release`) con su evidencia |
| `validate_milestone(validator, case_id, index)` | Aprobador | Valida un hito. Sin validadores, el hito queda solo como reportado por la organización |
| Consultas: `get_config`, `is_org_authorized`, `case_count`, `get_case`, `get_proposal`, `get_milestone`, `case_balance` | Cualquiera | Lectura del estado |

## Reglas que verifican las pruebas

Las 11 pruebas en `contracts/raiz/src/test.rs` pasan (`cargo test`):

- No se puede inicializar dos veces, y un umbral inválido se rechaza.
- Una organización no autorizada no puede abrir un caso.
- Montos no positivos se rechazan.
- No se puede proponer un desembolso mayor que el saldo del caso.
- Un no aprobador o una segunda firma del mismo aprobador se rechaza.
- Una propuesta ejecutada no se puede volver a aprobar.
- Dos propuestas en competencia no pueden sobregirar el caso.
- Un hito se reporta y luego se valida.
- Flujo completo: donación, propuesta, dos aprobaciones y pago.

## Decisiones de diseño

- **Hashes en vez de datos:** `meta_hash` y `evidence_hash` son `BytesN<32>`. Así la cadena prueba la existencia de un documento sin exponer su contenido.
- **Umbral de aprobación:** con `threshold = 2` y dos veterinarios, ningún pago sale con una sola persona.
- **Eventos:** cada acción importante publica un evento (`CaseRegistered`, `Donation`, `DisbursementExecuted`, `MilestoneValidated`, entre otros) para que el frontend y los donantes puedan seguirla.
- **Vigencia de datos:** las entradas se extienden con TTL para que no expiren mientras el caso está activo.

## Limitaciones conocidas

- No hay función para cerrar un caso ni para devolver fondos a donantes si el caso no se financia. Es el siguiente paso del diseño.
- `initialize` no tiene protección contra un atacante que lo ejecute antes que el admin. En producción debe llamarse en el mismo despliegue.
- Los aprobadores no se pueden cambiar después de `initialize`.
