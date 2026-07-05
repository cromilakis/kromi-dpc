# Fase 3 — Portal del cliente: evidencias — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Pasos con checkbox (`- [ ]`).

**Goal:** El cliente sube, desde el portal, los documentos (evidencias) que pide su checklist; el consultor los valida en `/app` (flujo existente). Reduce el ida y vuelta por correo.

**Architecture:** La subida va por **server action gateada con service-role**: la action verifica con el cliente autenticado que la evidencia/empresa es suya (RLS `current_company_id()`), y luego sube el archivo al bucket privado `evidences` (ruta `evidences/<company_id>/…`) y hace el insert/update en `public.evidences` con service-role. El cliente **no** escribe directo en Storage ni en la tabla (mismo patrón que propuestas/pagos). El cliente LEE sus evidencias por la policy `evidences_client_select` (Fase 0) y descarga por **URL firmada** generada server-side. `uploaded_by` queda `null` en subidas del cliente (no está en `profiles`; la pertenencia la da `company_id`).

**Tech Stack:** Next.js 16 (server actions, FormData), Supabase (Storage privado + RLS + service-role), Zod, Vitest.

**Relacionado:** épica `2026-07-05-company-accounts-portal-design.md`; Fase 0 (RLS del cliente, `evidences_client_select`, `current_company_id()`); modelo `evidences` + bucket `evidences` (`supabase/migrations/20260702100100_operations.sql`, `20260702100300_storage.sql`).

## Global Constraints

- **Escritura gateada por service-role**: la action verifica pertenencia con el cliente AUTENTICADO antes de escribir con service-role. El cliente nunca tiene INSERT/UPDATE directo en `evidences` ni en el bucket. `uploaded_by = null` en subidas del cliente (FK apunta a `profiles`, donde el cliente no está).
- **Storage privado**: nada público; descargas por URL firmada de corta duración generada server-side.
- **Validación de archivo**: tipos permitidos (PDF/imágenes/office comunes) y tamaño máx (usar `file_size_limit`/`allowed_mime_types` ya definidos en el bucket; re-validar en la action con Zod/checks). Nombre de archivo saneado.
- **Estado**: `evidence_status` es `validated|partial|missing|rejected` (no hay "en revisión"). Convención v1: una fila con `storage_path` seteado y status `missing` = "enviada, pendiente de validación"; el consultor luego pone validated/partial/rejected (flujo `/app` existente). La UI del cliente muestra "En revisión" para ese caso.
- **Doctrina**: `"use server"` + Zod + auth + `audit_log`; secretos server-only; i18n (`portal`); prosa español, código inglés.
- **Tailwind spacing**: solo tokens definidos o px arbitrarios; nunca -6/-10/-14. Botones cursor-pointer.
- **No romper**: consultor (`/app`, incl. validación de evidencias) y `pnpm test`/`test:rls` verdes.

---

### Task 1: Actions de evidencias del cliente (subir / listar / descargar)

**Files:**
- Create: `lib/actions/evidences.ts`
- Create: `lib/portal/load-evidences.server.ts`
- Test: `test/evidences.test.ts`

**Interfaces (Produces):**
- `loadClientEvidences(): Promise<EvidenceSlot[]>` — server-only, con el cliente autenticado: arma la lista de "slots" de evidencia = por cada control APLICABLE de su empresa (usa el catálogo + `applies_when` × factores, reusa `controlApplies`; o más simple: por cada `evidences` row existente de su empresa + los `required_evidences` de sus controles aplicables) devuelve `{ controlCode, controlName, evidenceName, status, hasFile, evidenceId }`. Reusa el assessment/controles como en `load-dashboard.server.ts`.
- `uploadEvidence(formData: FormData): Promise<UploadResult>` — `"use server"`, `type UploadResult = { ok:true } | { ok:false; error:"validation"|"unauthorized"|"not_found"|"too_large"|"bad_type"|"unavailable" }`:
  - FormData: `controlId` (uuid), `evidenceName` (string), `file` (File).
  - getUser; con el cliente autenticado verifica que el control pertenece al catálogo y que la empresa del cliente existe (`current_company_id()` no null). Zod para los campos.
  - Valida `file`: tamaño (≤ límite del bucket) y mime (allowlist). Sanea el nombre.
  - Con **service-role**: sube a `evidences/<company_id>/<controlId>-<timestamp>-<safeName>` (usa un timestamp pasado como arg o `Date.now()` en runtime — es server action, ok). Upsert/insert en `evidences` (company_id, control_id, name=evidenceName, storage_path, status por default 'missing', uploaded_by=null; si ya existe fila para (company_id, control_id, name), incrementa `version` y actualiza storage_path). `audit_log` (`evidence.uploaded_by_client`).
- `getEvidenceDownloadUrl(evidenceId: string): Promise<{ ok:true; url } | { ok:false; error }>` — verifica que la evidencia es de la empresa del cliente (cliente autenticado + RLS), genera signed URL (service-role, `createSignedUrl`, ~60s).

- [ ] **Step 1: Test** (supabase + storage mockeados, patrón `test/proposals.test.ts`): uploadEvidence valida entrada/mime/tamaño; sin empresa → unauthorized; OK → sube + inserta con company_id correcto + uploaded_by null + audita. getEvidenceDownloadUrl de otra empresa → not_found.
- [ ] **Step 2: Correr y ver fallar.**
- [ ] **Step 3: Implementar** `evidences.ts` + `load-evidences.server.ts` (reusa `lib/supabase/admin.ts` para service-role; mira `load-dashboard.server.ts` para el patrón de carga con RLS).
- [ ] **Step 4: Correr** → PASS. typecheck OK.
- [ ] **Step 5: Commit** — `feat(portal): actions de evidencias del cliente (subir/listar/descargar)`

---

### Task 2: UI de evidencias en el portal

**Files:**
- Create: `components/portal/evidence-section.tsx` (client component)
- Modify: `app/portal/page.tsx` (montar la sección) + `messages/app/portal.json`

**Interfaces:** consume `loadClientEvidences()` + `uploadEvidence` + `getEvidenceDownloadUrl`.

- [ ] **Step 1: i18n** `portal.evidences.*` (título, "Subir", "En revisión", "Validada", "Rechazada", "Parcial", "Pendiente", "Descargar", errores de tipo/tamaño).
- [ ] **Step 2:** `evidence-section.tsx`: lista los slots (control + nombre de evidencia + badge de estado). Por slot sin archivo: input file + botón "Subir" (useTransition → `uploadEvidence` con FormData → refresca). Por slot con archivo: badge de estado (`missing+hasFile`→"En revisión"; validated/partial/rejected→su badge) + "Descargar" (llama `getEvidenceDownloadUrl` y abre la URL). Mapa estado→StatusBadge variant.
- [ ] **Step 3:** montar en `app/portal/page.tsx` bajo el dashboard. Spacing tokens válidos; cursor-pointer.
- [ ] **Step 4:** typecheck + build + `pnpm test`/`test:rls` verdes.
- [ ] **Step 5: E2E click-through (orquestador):** cliente sube un PDF de prueba → aparece "En revisión"; verificar el objeto en Storage + la fila `evidences` (company_id correcto, uploaded_by null); como consultor, verificar que la evidencia aparece en `/app` y se puede validar; descargar por signed URL. Screenshot.
- [ ] **Step 6: Commit** — `feat(portal): UI de evidencias del cliente`

---

### Task 3: Verificar lado consultor (validación) — sin cambios o mínimos

**Files:** (posible) `app/app/companies/[id]/certification` o donde viva la validación de evidencias.

- [ ] **Step 1:** Localizar la UI del consultor que lista/valida `evidences` (`grep -rn "evidence" app/app components/app`). Confirmar que las evidencias subidas por el cliente (uploaded_by null) aparecen y se pueden validar (validated/partial/rejected). El consultor ya tiene RLS full sobre `evidences`.
- [ ] **Step 2:** Si algo asume `uploaded_by` no-null y rompe con las del cliente, arreglarlo (mostrar "Cliente" cuando uploaded_by es null). Si no hay problema, no tocar.
- [ ] **Step 3:** typecheck + build verdes.
- [ ] **Step 4: Commit** (si hubo cambios) — `fix(checklist): mostrar evidencias subidas por el cliente`

---

## Self-review

- **Cobertura del spec (Fase 3):** subir/listar/descargar (T1), UI portal (T2), verificación lado consultor (T3). ✓
- **Seguridad:** escritura por service-role tras verificar pertenencia; cliente sin write directo; Storage privado + signed URLs; uploaded_by null documentado. ✓
- **Sin placeholders:** actions con su forma + validación de archivo; convención de estado "En revisión" explícita. ✓

## Handoff

Ejecutar con **subagent-driven-development**, T1→T3. Sin dependencias externas. Al terminar: gate + merge + deploy (sin migración nueva salvo que T1 la requiera; el bucket/tabla ya existen). Fase 4 (auto-recertificación) queda para después, bloqueada por lo legal/CLP.
