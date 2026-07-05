# Entrevista dinámica según la empresa (aplicabilidad) — Diseño

**Fecha:** 2026-07-05
**Estado:** propuesta (pendiente de revisión del usuario)

## Objetivo

Que la entrevista de diagnóstico se **acote automáticamente** a lo que puede
afectar a la empresa, según lo declarado en su alta (sector, tamaño, factores).
Lo que no aplica **no se pregunta**: se marca **"No aplica"** con el motivo y sale
de la entrevista activa. Así una tienda chica ve una entrevista corta, y una
empresa compleja ve el cuestionario completo — sin listas larguísimas de
preguntas que no corresponden. El consultor puede sobrescribir la aplicabilidad
a mano. Aplica tanto a los **controles de cumplimiento** como a los **campos del
RAT**.

Nota de objetivo (del usuario): la entrevista no solo produce el check
cumple/parcial/no, sino también el **listado de preguntas** (los
`verification_criteria` de cada control) que llevó a esa información. Ese listado
ya se renderiza hoy; esta feature lo **recorta** a lo aplicable.

## Principio rector

**Determinista, sin asunciones.** La aplicabilidad se calcula con **reglas
explícitas** guardadas en la base (por control), evaluadas contra los factores
declarados de la empresa. Nada se infiere: si no hay regla, el control **siempre
aplica** (baseline). El consultor tiene la última palabra vía override.

## Modelo de datos

1. **Persistir factores de la empresa** — hoy `createCompany` usa los factores
   solo para el score/audit y **no los guarda**. Migración:
   `alter table public.companies add column factors text[] not null default '{}';`
   y `createCompany` los inserta. (La aplicabilidad los necesita en tiempo de
   entrevista.)

2. **Regla de aplicabilidad por control** —
   `alter table public.controls add column applies_when jsonb;`
   Semántica v1:
   - `null` → **siempre aplica** (baseline transversal).
   - `{ "factors_any": ["international_transfers", ...] }` → aplica **solo si** la
     empresa declaró al menos uno de esos factores; si no → No aplica.
   (Extensible luego a `size_min`, etc. `sector_scope` sigue existiendo y se
   evalúa aparte, como hoy.)

3. **Estado "No aplica"** — `alter type public.control_result add value
   'not_applicable';` (queda: pending, compliant, partial, non_compliant,
   not_applicable). Nota: `alter type ... add value` no corre dentro de una
   transacción con otros DDL en algunos setups; va en su propia sentencia.

4. **Poblar `applies_when`** (dato, con revisión) para los controles ligados a
   factores. Mapa inicial por dominio/control:
   - `DPC-SEN` (Datos Sensibles) → `{factors_any:["sensitive_data"]}`
   - `DPC-TER` transferencias internacionales → `{factors_any:["international_transfers"]}`
   - `DPC-TER` encargados/proveedores → `{factors_any:["critical_providers"]}`
   - `DPC-EIA` (Decisiones Automatizadas / EIPD) → `{factors_any:["automated_decisions"]}`
   - resto → `null` (siempre aplica).
   La asignación exacta control-por-control se hace leyendo el catálogo (23
   controles) y se revisa; ante duda, `null` (aplica) — nunca ocultar de más.

## Evaluador (código, testeable)

- **Crear `lib/interview/applicability.ts`**:
  ```ts
  export type AppliesWhen = { factors_any?: string[] } | null;
  export function controlApplies(rule: AppliesWhen, companyFactors: string[]): boolean {
    if (!rule) return true;
    if (rule.factors_any?.length) return rule.factors_any.some((f) => companyFactors.includes(f));
    return true;
  }
  /** Motivo legible de por qué NO aplica (para la UI). */
  export function inapplicabilityReason(rule: AppliesWhen): string[] { /* factors_any */ }
  ```
  Reglas-como-dato (en la base) + evaluador puro (en código). El motivo se
  traduce en la UI (i18n de factores).

## Alcance de la aplicabilidad

- **Controles de cumplimiento** (principal): la entrevista muestra solo los
  aplicables como preguntas; los no aplicables van a una sección **colapsada
  "No aplica (N)"** con el motivo (factor que no se declaró) y un toggle
  **"incluir en la entrevista"** (override). También se puede sacar un aplicable
  marcándolo No aplica.
- **Campos del RAT** (consolida la decisión previa "ocultar + escape"): en el
  `RatForm`, los bloques atados a un factor no declarado van **ocultos** con un
  enlace "esta actividad es una excepción" para mostrarlos:
  - `intlTransfer` / `intlCountries` ← `international_transfers`
  - `processors` ← `critical_providers`
  - `isSensitive` ← `sensitive_data` (default acorde a lo declarado; visible)

## Persistencia del override

- Extender `diagnosisAnswersSchema` con un campo opcional
  `applicability?: Record<controlCode, boolean>` (true=forzar incluir,
  false=forzar excluir). Es opcional → retrocompatible con sesiones existentes,
  y viaja por el autosave ya presente. Solo se guardan **overrides**; el default
  se recalcula siempre desde los factores (fuente de verdad).

## Materialización

- `materializeDiagnosis`: los controles **No aplica** (computado sin override a
  incluir, u override a excluir) se upsertean en `assessment_controls` con
  `status='not_applicable'`. Los aplicables siguen el flujo actual
  (`selectControlUpdates`). Así el checklist refleja el alcance real.

## UI del checklist

- El checklist (`/app/companies/[id]/checklist`) muestra los `not_applicable`
  con un badge "No aplica" y **los excluye del cálculo de avance %** (el avance
  se mide sobre lo aplicable, no sobre el catálogo completo).

## Alta de empresa

- `createCompany` persiste `factors`. Hoy siembra `assessment_controls` para
  todos los controles del sector; se mantiene (el estado No-aplica se resuelve en
  la materialización del diagnóstico, no en el alta, para no congelar el alcance
  antes de la entrevista). Documentar esta decisión.

## Interacción con la feature de transcripción

La feature de autocompletado desde transcripción debe **respetar el alcance**:
solo propone respuestas de cumplimiento para controles **aplicables**. El
catálogo de controles que recibe el prompt se filtra por aplicabilidad. (Ajuste
menor al plan de transcripción; por eso esta feature va **primero**.)

## Errores / degradación

- Si una empresa no tiene factores (sesiones/empresas viejas): `factors = {}` →
  las reglas `factors_any` dan No aplica para los controles atados a factores. El
  consultor puede incluirlos vía override. (Documentar; no romper.)

## Testing

- **Unit (Vitest)**: `controlApplies` (null→true; factors_any con/sin match;
  vacío→true) y `inapplicabilityReason`.
- **Unit**: `selectControlUpdates`/materialize — controles No aplica → status
  `not_applicable`; aplicables sin tocar no se pisan (regla actual).
- **Integración**: `createCompany` persiste `factors`.
- **E2E click-through (manual)**: crear "Margarita" (micro, sin factores) →
  abrir diagnóstico → verificar entrevista corta (DPC-SEN/TER/EIA en "No aplica"
  con motivo) → incluir uno vía override → responder → Aplicar diagnóstico →
  verificar `assessment_controls` con `not_applicable` y checklist con avance
  sobre lo aplicable. Comparar con una empresa que sí declara factores
  (entrevista completa).

## Trazabilidad

- Ley 21.719 + wikiguía: el alcance por empresa es legítimo (una empresa sin
  transferencias internacionales no evidencia ese dominio). La aplicabilidad es
  explícita, auditable y reversible por el consultor — no oculta obligaciones,
  solo evita preguntar lo que no corresponde.
