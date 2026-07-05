# Estándar de Entrevista / Diagnóstico (Momento 1 del proceso)

**Fecha:** 2026-07-05 · **Estado:** en revisión · Sub-proyecto #1 de 4
(#2 evaluación de riesgo · #3 propuesta/plan · #4 certificación + documentación)

## Objetivo
Estandarizar el diagnóstico de cumplimiento de la Ley 21.719: un cuestionario único,
anclado a la guía oficial de implementación (wikiguías.digital.gob.cl) y a los 23 controles
existentes, que puede ejecutarse **asistido** (equipo kromi en la reunión) o como
**autodiagnóstico** (la empresa, por enlace con token), con **guardar y completar después**.
Produce (a) el **inventario RAT** y (b) la **evaluación por control**, que alimentan la
evaluación de riesgo (#2), el plan/propuesta (#3) y la certificación (#4).

## Principios de producto
- **La empresa no necesita cuenta.** Acceso al autodiagnóstico y entrega de resultados/
  certificados por **enlace con token** (caducable/revocable) + verificación pública por
  código ya existente. kromi es la fuente de verdad y **entrega bajo demanda**.
- **Anclado a lo oficial:** la sección de cumplimiento se deriva de `controls.verification_criteria`
  (ya trazables a la ley) y el RAT de los campos de la wikiguía. No se inventa un banco paralelo.
- **Reutiliza el modelo existente:** `assessments`/`assessment_controls` (estado por control y
  ciclo), `company_risks`, `remediation_items`, `evidences`, `certificates`.

## Fuente de las preguntas
- **Sección A — RAT (por área/actividad):** finalidad, base de licitud, categorías de datos,
  categorías de titulares, origen, destinatarios/terceros, encargados, transferencia
  internacional (+países), plazo de retención, medidas de seguridad, ¿datos sensibles?
- **Sección B — Cumplimiento (por control):** para cada uno de los 23 controles se muestran sus
  `verification_criteria` como ítems sí/parcial/no/no-sé, con nota y adjunto opcional.

## Modelo de datos (nuevo)
Migración nueva en `supabase/migrations/` (respeta el patrón catálogo/operación + RLS).

- **`processing_activities`** (operación, el RAT): `id`, `company_id`→companies, `area` (texto),
  `name` (actividad), `purpose`, `legal_basis`, `data_categories` text[], `data_subjects` text[],
  `source`, `recipients` text[], `processors` text[], `intl_transfer` bool, `intl_countries` text[],
  `retention`, `security_measures` text[], `is_sensitive` bool, `notes`, timestamps.
- **`interview_sessions`** (operación): `id`, `company_id`, `assessment_id`→assessments (ciclo),
  `mode` (`interview_mode`: `'assisted'`|`'self'`), `status` (`interview_status`:
  `'draft'`|`'in_progress'`|`'submitted'`|`'reviewed'`), `answers` jsonb (borrador flexible),
  `respondent` jsonb (`{name,email,role}`), `progress` int, `started_at`, `submitted_at`,
  `reviewed_at`. Unicidad práctica: una sesión "activa" por assessment.
- **`share_links`** (operación, pieza reutilizable): `id`, `company_id`, `kind`
  (`share_kind`: `'diagnosis'`|`'certificate'`|`'document'`), `target_id` (uuid del recurso),
  `token_hash` (sha256 del token; el token en claro solo se muestra al crear), `expires_at`,
  `revoked_at`, `created_by`→profiles. Sirve para el autodiagnóstico y la entrega on-demand.

Respuestas: se guardan como `interview_sessions.answers` (jsonb) mientras es borrador. Al
**materializar** (submit/review) se escriben: filas en `processing_activities` (sección A) y
estados en `assessment_controls` (sección B, auto-mapeados).

## Auto-mapeo (respuesta → estado de control) + override
Por control, según sus `verification_criteria` respondidos:
- todos "sí" → `compliant`; algunos "sí"/"parcial" → `partial`; ninguno o "no" → `non_compliant`;
  sin responder → `pending`.
El consultor puede **ajustar** el estado y editar `findings`/`notes` (ya soportado por
`assessment_controls`). El estado sugerido queda registrado; el override manda.

## Flujo
1. Consultor abre el diagnóstico de una empresa → crea `interview_session` (mode `assisted`),
   opcionalmente genera un `share_link` `diagnosis` (mode `self`) para la empresa.
2. Reunión: se llena lo conocido; **guardar borrador** (autosave).
3. La empresa completa el resto luego por el enlace con token; **enviar**.
4. Al enviar/revisar: **materializar** → RAT + estados de control (auto-mapeados).
5. Consultor **revisa/override** → diagnóstico listo → habilita #2 (riesgo).

## Convención de nomenclatura (regla del proyecto)
Prosa/UI en español; **todo lo técnico en inglés**: carpetas, archivos, rutas, tablas, enums,
funciones, variables, claves. Nada nuevo se crea en español. Migración a inglés YA REALIZADA
(2026-07-05): rutas internas y públicas renombradas (`companies`, `risks`, `evidence`,
`certification`, `solutions`, `controls/[code]`, `self-assessment`, `verify/[code]`) con
redirects 301 desde las antiguas. Queda pendiente (opcional) migrar los anchors del landing
(`#dominios`, `#ciclo`…) — no son rutas.

## Rutas y código (en inglés)
- Consultor: `app/app/companies/[id]/diagnosis/` (crear/gestionar sesión, generar enlace,
  revisar y materializar).
- Autodiagnóstico: `app/diagnosis/[token]/` (sin login; valida token vía RPC acotada).
- Lógica: `lib/interview/` — generación de preguntas desde `controls.verification_criteria`,
  esquema Zod del RAT (`ratSchema`), reglas de auto-mapeo (`mapAnswerToControlStatus`),
  materialización (`materializeSession`). Acciones en `lib/actions/interview.ts`.
- Migración: `processing_activities`, `interview_sessions`, `share_links` + enums + RLS.
  Toda columna/enum en inglés (p. ej. `intl_transfer`, `interview_mode`).

## Seguridad / RLS
- Tablas nuevas bajo RLS: consultores/admin acceso completo (helpers `is_consultant()`/`is_admin()`).
- Ruta self por token: RPC `SECURITY DEFINER` que valida `token_hash`+vigencia y expone SOLO la
  sesión objetivo (lectura/append de respuestas). El token en claro nunca se guarda.
- `share_links` caduca (`expires_at`) y se puede revocar (`revoked_at`). Auditar creación/uso.

## Guardrails
- Nada destructivo: materializar no borra respuestas; se puede re-materializar.
- El `complexity_score` sigue siendo interno; el autodiagnóstico no lo expone.
- i18n: todos los textos de UI en `messages/es.json`; el RAT y criterios en español.

## Fuera de alcance (otros sub-proyectos)
- #2 Evaluación de riesgo automática desde el diagnóstico (poblar `company_risks`).
- #3 Documento de propuesta/plan enviable.
- #4 Certificación + anexo documental (RAT + leyes + mecanismo por exigencia + fecha última revisión).
- Cuentas de empresa (no se hacen; entrega on-demand por token).

## Validación legal pendiente
Los `verification_criteria`, el mapeo de exigencias a la ley y el RAT deben validarse con el
abogado antes de usar el diagnóstico con clientes reales (misma disciplina que el resto).
