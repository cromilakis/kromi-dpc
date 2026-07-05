# Autocompletado del diagnóstico desde transcripción (LLM) — Diseño

**Fecha:** 2026-07-05
**Estado:** propuesta (pendiente de revisión del usuario)

## Objetivo

Permitir que, en el diagnóstico asistido, el equipo pegue la **transcripción de
una reunión** con el cliente y un LLM (DeepSeek) **proponga** el llenado del RAT
y de las respuestas de cumplimiento, con **procedencia explícita** (qué se
autocompletó y por qué). El consultor revisa, edita o descarta cada sugerencia
antes de que entre al borrador. El LLM nunca escribe al expediente.

## Principio rector (NO NEGOCIABLE)

**Determinismo total y cero asunciones.** Cada valor sugerido debe estar
respaldado por una **cita textual** de la transcripción. Si un dato no está
dicho de forma explícita, **no se adivina**: el campo queda vacío y la
información que no pudo asociarse con certeza a un campo/control va a un
apartado **"Información sin asignar"** para ubicación manual. Nada se fuerza ni
se descarta en silencio.

Esto se garantiza en capas (defensa en profundidad):

1. **Llamada determinista**: `temperature: 0` + `response_format: json_object`.
2. **Contrato de salida validado con Zod**: si el JSON viene malformado o no
   calza el esquema, se rechaza y se reintenta una vez; si vuelve a fallar, se
   devuelve error y el diagnóstico manual sigue intacto. Nunca se procesa una
   salida no validada.
3. **Prompt restrictivo**: instrucción explícita de extraer SOLO lo literal;
   cada campo propuesto exige un `evidence` (cita textual). Sin cita → el campo
   no se propone y su ausencia se explica.
4. **Humano obligatorio en el bucle**: la salida del LLM es un conjunto de
   *sugerencias*, nunca respuestas. El consultor acepta/edita/descarta antes de
   que existan en `answers`. Esta es la garantía real de "cero asunciones".
5. **Auditabilidad**: se persiste la transcripción y la salida cruda del LLM en
   la sesión (RLS, solo consultores); toda ejecución deja rastro en `audit_log`.

## Alcance v1

- **Entrada**: transcripción en texto pegada en el diagnóstico **asistido**
  (no en el modo self por token). Se persiste con la sesión.
- **Salida**: propuestas de (a) actividades del **RAT** y (b) respuestas de
  **cumplimiento**. Cumplimiento SOLO cuando la transcripción aborde el criterio
  de forma literal; en caso contrario el criterio queda `unknown` (sin
  proponer). El mayor riesgo interpretativo está en cumplimiento, por eso la
  regla literal es más estricta ahí.
- **Persistencia**: transcripción + salida cruda del LLM guardadas en
  `interview_sessions`. Se avisa en la UI que el texto se envía a un tercero
  (DeepSeek).

Fuera de v1: audio→texto (se pega texto ya transcrito); re-ejecución automática;
badges de procedencia inline permanentes en cada campo del formulario (v1
muestra la procedencia en la **pantalla de revisión**; el dato aceptado se
integra al borrador estándar).

## Arquitectura y archivos

### Módulo LLM (server-only)
- **Crear `lib/llm/deepseek.ts`**: cliente mínimo sobre la API compatible con
  OpenAI de DeepSeek (`https://api.deepseek.com/chat/completions`). Lee
  `process.env.DEEPSEEK_API_KEY`. Exporta `chatJSON(messages, { signal })` que
  fuerza `temperature: 0` + `response_format: json_object`, con timeout
  (AbortController, ~30s) y un reintento ante 5xx/timeout. Si no hay API key,
  lanza un error tipado `LLM_DISABLED`.
- **Crear `lib/llm/extract-diagnosis.ts`**: orquesta la extracción.
  - `extractionResultSchema` (Zod): contrato de salida (abajo).
  - `buildExtractionPrompt({ transcript, controls })`: system + user prompt con
    las reglas de determinismo y el catálogo de controles (código + nombre +
    `verification_criteria`) para que el LLM pueda mapear cumplimiento.
  - `extractDiagnosis({ transcript, controls })`: llama a `chatJSON`, valida con
    Zod (1 reintento si falla la validación), devuelve `ExtractionResult`.

### Contrato de salida (Zod) — `ExtractionResult`
```ts
{
  rat: Array<{
    // subconjunto de RatActivity; cada campo presente trae su evidencia
    fields: Partial<Pick<RatActivity,
      "area"|"name"|"purpose"|"legalBasis"|"dataCategories"|"dataSubjects"|
      "source"|"recipients"|"processors"|"intlTransfer"|"intlCountries"|
      "retention"|"securityMeasures"|"isSensitive">>,
    evidence: Record<string, string>,   // campo -> cita textual
  }>,
  compliance: Array<{
    controlCode: string,
    criterionIndex: number,
    answer: "yes"|"partial"|"no",       // nunca "unknown" desde el LLM: si no
                                        // hay evidencia, no se emite la fila
    evidence: string,                   // cita textual obligatoria
  }>,
  unassigned: Array<{ text: string, reason: string }>,
}
```
Validaciones duras post-parse (descartan filas, no rompen todo):
- Toda fila de `rat` sin al menos un `evidence` válido se descarta.
- Toda fila de `compliance` sin `evidence`, con `controlCode` inexistente, o
  `criterionIndex` fuera de rango, se descarta.
- Lo descartado por falta de evidencia se agrega a `unassigned` con el motivo.

### Modelo de datos
- **Migración `supabase/migrations/<ts>_diagnosis_transcript.sql`**:
  `alter table interview_sessions add column transcript text,
   add column ai_extraction jsonb;` (ambas nullable). RLS existente ya cubre la
  tabla (is_consultant()); confirmar GRANT de UPDATE a `authenticated` (ya
  otorgado en la migración de entrevista). Regenerar `lib/supabase/types.ts`.

### Server action — `lib/actions/interview.ts`
- **Añadir `extractDiagnosisFromTranscript(sessionId, transcript)`**:
  1. `"use server"` + Zod (`sessionId` uuid, `transcript` string 1..~50k).
  2. Verificar sesión (auth + RLS).
  3. Cargar catálogo de `controls` aplicables (transversales + del sector de la
     empresa, mismo criterio que `createCompany`).
  4. `extractDiagnosis({ transcript, controls })`.
  5. Persistir `transcript` + `ai_extraction` (salida validada) en la sesión.
  6. `audit_log` (`interview.transcript_extracted`, con conteos + tokens).
  7. Devolver `ExtractionResult` para la revisión en cliente.
  - Errores tipados: `llm_disabled`, `llm_failed`, además de los existentes.
  - NO toca `answers`: eso lo hace el consultor al aceptar.

### UI — cliente
- **Crear `components/interview/transcript-import.tsx`**: botón "Importar desde
  transcripción" → panel con `<textarea>` (aviso: "el texto se envía a DeepSeek
  para su análisis"), botón "Analizar" (loading). Al volver la extracción, abre
  la **pantalla de revisión**.
- **Crear `components/interview/extraction-review.tsx`**: lista las sugerencias
  agrupadas (RAT / cumplimiento / "Información sin asignar"). Cada sugerencia
  muestra el **valor propuesto + la cita textual** y acciones
  Aceptar / Editar / Descartar. "Aceptar todo" por grupo. Lo aceptado se
  fusiona en `answers` vía callbacks del `DiagnosisManager` (crea actividades
  RAT nuevas; setea criterios de cumplimiento por `controlCode`/índice). La
  sección "Información sin asignar" es solo lectura (texto + motivo) para que el
  consultor lo ubique a mano.
- **Modificar `components/interview/diagnosis-manager.tsx`**: montar
  `TranscriptImport`; exponer helpers para fusionar sugerencias aceptadas en
  `answers` (reusa el `updateAnswers` existente → dispara el autosave con
  debounce ya presente).

## Renombrar "materializar" (deuda de claridad, incluida aquí)
El objetivo real de la acción es **volcar el borrador al expediente** (crea el
RAT en `processing_activities` y actualiza los controles del checklist). El
label actual es jerga.
- `messages/app/diagnosis.json`: `actions.materialize` → **"Aplicar
  diagnóstico"**; `actions.materializing` → "Aplicando…"; `actions.materialized`
  → texto que explique el efecto ("Se generó el RAT y se actualizó el checklist
  DPC."). `status.reviewed` → "Aplicado" (o similar). Sin cambios de lógica.

## Seguridad y privacidad
- `DEEPSEEK_API_KEY` **server-only** (sin `NEXT_PUBLIC`); la llamada ocurre solo
  en la server action. La clave nunca llega al cliente.
- La transcripción puede contener datos personales → aviso explícito en la UI de
  que se envía a DeepSeek (tercero). Se persiste bajo RLS (solo consultores).
- Rastro en `audit_log` en cada extracción.

## Manejo de errores / degradación
- Sin API key (`llm_disabled`): el botón de importar se muestra deshabilitado
  con nota; el diagnóstico manual funciona igual.
- LLM caído / timeout / JSON inválido tras reintento (`llm_failed`): mensaje de
  error en la UI; no se persiste extracción; el borrador queda intacto.
- El flujo manual (RAT + cumplimiento a mano) es siempre la ruta base y nunca
  depende del LLM.

## Costo / latencia
- ~1.5–3s por llamada en pruebas (transcripción corta). Se muestra spinner.
- Se registra `usage` (tokens) en `audit_log` para monitoreo de costo.
- Transcripciones largas: límite duro de tamaño (~50k chars) con mensaje si se
  excede; sin chunking en v1.

## Testing
- **Unit (Vitest)**: `extractionResultSchema` (acepta válido, descarta filas sin
  evidencia / con controlCode inexistente / criterionIndex fuera de rango, y las
  manda a `unassigned`); `buildExtractionPrompt` (incluye catálogo de controles
  y reglas). Mock del cliente DeepSeek (sin red en unit).
- **Integración**: `extractDiagnosisFromTranscript` con cliente LLM mockeado —
  persiste transcript+extraction, no toca `answers`, deja audit_log.
- **E2E manual (click-through)**: pegar transcripción real, revisar sugerencias,
  aceptar algunas, verificar que entran al borrador y que "Aplicar diagnóstico"
  las materializa. (El patrón de este repo: el click-through en vivo es la
  verificación que atrapa lo que el resto no.)
- La llamada real a DeepSeek NO se ejecuta en CI (requiere API key); se prueba
  manualmente en dev.

## Trazabilidad
- Ley 21.719 + wikiguía de implementación: el RAT (`processing_activities`) es el
  Registro de Actividades de Tratamiento; el cumplimiento alimenta el checklist
  de dominios. Esta feature solo acelera su llenado con revisión humana; no
  cambia el modelo de cumplimiento ni la certificación.
