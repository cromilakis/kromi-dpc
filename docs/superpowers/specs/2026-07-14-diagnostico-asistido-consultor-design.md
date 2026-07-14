# Diagnóstico asistido del consultor — Diseño (sub-proyecto #2)

Fecha: 2026-07-14
Estado: aprobado (pendiente de plan de implementación)

## Contexto

Segundo sub-proyecto del programa "construcción de documentos" (ver
`2026-07-12-diagnostico-persistido-design.md`). El diagnóstico (`lib/legal`) es la
**fuente única de verdad**; el autodiagnóstico self-service y el consultor aplican
la **misma encuesta** y llegan al mismo lugar (brechas persistidas por empresa).

El sub-proyecto #1 (ya en `main`) dejó listas la persistencia y su función pura:
- `computeDiagnosisSnapshot(answers)` y `persistDiagnosis(companyId, answers, source, createdBy?)`
  (`lib/diagnosis/`), donde `source` acepta `'consultant_assisted'` y `createdBy` el id del consultor.
- Tablas `company_diagnoses` + `diagnosis_breaches`.
- `provisionCompany(client, params)` (`lib/companies/provision.server.ts`).

Hoy el alta del consultor (`/app/companies/new` → `createCompany`) pide
tamaño/rubro/factores por separado; en el modelo nuevo eso **se deriva de la
encuesta**, así que pedirlos aparte es redundante.

## Objetivo

Que el consultor cree una empresa con **identidad mínima** y aplique **la misma
encuesta** del autodiagnóstico (en reunión con el cliente), persistiendo el
diagnóstico vía `persistDiagnosis(..., 'consultant_assisted', createdBy)`. Ambos
caminos (self-service y consultor) producen el mismo registro.

## Decisiones tomadas (con el usuario)

1. **Flujo unificado**: identidad mínima → encuesta → clasificación derivada de las
   respuestas (no se pide clasificación manual).
2. **Reemplaza `/app/companies/new`**: el alta pasa a ser identidad + encuesta; se
   retira la clasificación manual (tamaño/rubro/factores) del alta.

## Flujo

`/app/companies/new` (reemplazado):
1. **Identidad mínima**: razón social, RUT, contacto (nombre + correo/teléfono).
2. **La misma encuesta** (motor `lib/legal`), respondida por el consultor.
3. Al completar: se derivan tamaño/rubro/factores de las respuestas → se crea la
   empresa (`provisionCompany`) → se persiste el diagnóstico
   (`persistDiagnosis(companyId, answers, 'consultant_assisted', createdBy=consultor)`)
   → redirige a `/app/companies/[id]`.

## Componentes

**Reuso del cuestionario (evitar duplicación):**
- Extraer el **núcleo del cuestionario** de `components/self-assessment/diagnosis-wizard.tsx`
  a un componente compartido `DiagnosisQuestionnaire`: los `steps` (screening +
  deep-dive intercalado), `screeningAnswers`/`ddAnswers`, el `result` y el
  `answersPayload`. Expone un callback `onComplete({ result, answers })`.
  - El flujo público lo usa y luego muestra resultado → lead-form/pago (comportamiento
    preservado).
  - El flujo consultor lo usa y luego muestra resultado → "Guardar diagnóstico".
- **`deriveClassification(answers)`** — función pura en `lib/diagnosis/derive.ts` que
  centraliza la derivación hoy embebida en el wizard (`SIZE_MAP`, `RUBRO_MAP`,
  `FACTOR_MAP` + `computeFullDiagnosis(...).riskFactors`): devuelve
  `{ sizeTier, sectorCode, factors }`. La usan el wizard (cliente, para mostrar) y la
  server action (servidor, autoritativo).

**Flujo consultor (nuevo, cliente):** un componente en `/app` que recoge la identidad,
monta `DiagnosisQuestionnaire`, y al completar llama la server action con
`{ identidad, answers }`.

## Server action y flujo de datos

**`createCompanyWithDiagnosis(input)`** (nuevo archivo
`lib/actions/assisted-diagnosis.ts`):
1. `"use server"` + **Zod**: identidad (name, rut, contactName, contactEmail?/contactPhone?)
   + `answers` ({screening, deepDive}).
2. **Verifica sesión + rol consultor/admin** (misma doctrina que `createCompany`:
   `getUser()` + `profiles.role in ('consultant','admin')`).
3. **Deriva la clasificación en el servidor** con `deriveClassification(answers)`
   (autoritativo; no se confía en el cliente).
4. `provisionCompany(clienteAutenticado, { name, rut, sectorCode, sizeTier, factors, contact })`
   — reusa la función del #1. El consultor está autenticado y la RLS ya le permite
   insertar (como el `createCompany` viejo). Errores: `rutTaken`/`validation`/`unavailable`.
   (Nota: `provisionCompany` aún siembra `assessment_controls` viejos — tolerado hasta #8.)
5. `persistDiagnosis(companyId, answers, 'consultant_assisted', user.id)` — reusa la
   función del #1 (recomputa las brechas en servidor).
6. `audit_log` de la mutación (empresa creada + diagnóstico persistido; detail con
   `source` y `total_breaches`).
7. Redirige a `/app/companies/[id]`.

**Frontera de confianza:** el servidor recomputa **clasificación** (`deriveClassification`)
y **brechas** (`persistDiagnosis`) desde `answers`; lo derivado en el cliente es solo UI.

## Alcance

**En #2:** reemplazar `/app/companies/new` por el flujo identidad + cuestionario;
extraer `DiagnosisQuestionnaire` + `deriveClassification` (sin cambiar el flujo
público); `createCompanyWithDiagnosis` (gated a consultor) reusando
`provisionCompany` + `persistDiagnosis`; i18n del flujo nuevo; actualizar el CTA
"Nueva empresa" para apuntar a él.

**Fuera de #2:** la entrevista vieja de `/app/companies/[id]/diagnosis` y la
maquinaria de `controls`/`interview_sessions` (se remueven en #8); ver/editar brechas
persistidas en `/app` (posterior); re-diagnóstico/recertificación de empresas
existentes; detalle cara al cliente (#3); remoción de lo viejo (#8).

## Casos borde

- **RUT duplicado:** `provisionCompany` devuelve `rutTaken` → "RUT ya registrado".
- **Abandono a mitad del cuestionario:** no se crea empresa (la creación ocurre recién
  al completar y llamar la action).
- **Sin rol consultor:** la action bloquea (`unauthorized`).
- **Falla parcial de `provisionCompany`** (siembra vieja): tolerada/logueada, consistente
  con el #1 (sin transacción en supabase-js).

## Pruebas

- **Unit (Vitest):** `deriveClassification(answers)` — respuestas conocidas →
  `sizeTier`/`sectorCode`/`factors` esperados (incluye caso multi-rubro y sin factores).
- **Flujo/action:** typecheck + lint; **E2E (Playwright)** con sesión de consultor:
  crear empresa vía el cuestionario y verificar fila en `company_diagnoses` con
  `source='consultant_assisted'` + filas en `diagnosis_breaches`.

## Riesgo de refactor

Extraer `DiagnosisQuestionnaire` de `diagnosis-wizard.tsx` toca el flujo público (ya en
`main`); su comportamiento debe preservarse (cubierto por los tests existentes y el
camino E2E público del post-pago).
