# Evidencia — Fase A (schema + seeds) y Fase B (cara pública)

**Fecha:** 2026-07-02 · **Riesgo:** high (data_level personal/sensitive) · **Specs cubiertas:**
`marco-dpc-schema`, `sitio-publico`, `autoevaluacion` (+ stub de `auth` en /login).

## Qué se pidió

Implementar la plataforma KPC desde los contratos `.kromi/init.md` (RFC v0.4) y
`.kromi/design.md` (Style Reference Attio), con el prototipo `design/prototype.dc.html`
como referencia de layout. Stack fijo kromi-foundry: Next.js App Router + Supabase
(Postgres/Auth/Storage) + Zod + next-intl + Vitest/Playwright.

## Qué se construyó

### Schema Postgres (4 migraciones + 2 seeds)
- `20260702100000_catalog.sql` — catálogos del Marco KPC: sectors (7 rubros con
  multiplicadores), domains (14), controls (23 fichas completas), risk_catalog (R-001…R-009),
  solution_catalog. RLS habilitada en la misma migración que crea cada tabla.
- `20260702100100_operations.sql` — operación: profiles, companies, assessments,
  assessment_controls, evidences, company_risks, remediation_items, certificates,
  self_assessments (leads), audit_log (append-only). RLS + revoke anon por tabla.
- `20260702100200_rls.sql` — políticas explícitas por operación con `(select is_consultant())`
  (InitPlan), grants DML explícitos a authenticated (el stack ya no los auto-otorga),
  revoke TRUNCATE, default privileges revocados a anon, RPC `verify_certificate` SECURITY
  DEFINER con search_path pinneado y columnas filtradas (único acceso anon).
- `20260702100300_storage.sql` — bucket privado `evidences` (50 MiB, MIME acotados) +
  4 políticas sobre storage.objects restringidas a consultores.
- `seed.sql` — catálogos canónicos idempotentes. `seeds/seed-demo.sql` — 6 empresas demo
  (RUTs ficticios verificados), separado del seed canónico; solo se aplica en local.
- Cada migración incluye sección `-- DOWN` documentada.

### Cara pública (Next.js)
- `/` — landing fiel al prototipo: nav sticky, hero serif, banda Ley 21.719 y sanciones,
  14 dominios, ciclo de 4 fases, expediente entregable, acompañamiento, precios "desde",
  footer Abyss con acceso discreto "Panel del consultor".
- `/autoevaluacion` — wizard multi-paso (tamaño → rubro → factores de riesgo → resultado)
  con lógica de estimación pública en `lib/self-assessment/estimate.ts` (TDD) y scoring
  interno en `scoring.server.ts` (`import "server-only"` — el Complexity Score nunca llega
  al navegador). Lead opcional con server action Zod + honeypot + dedupe 10 min.
- `/verificar/[codigo]` — verificación pública de certificados vía RPC.
- `/login` — placeholder visual (auth se implementa en Fase C).
- UI kit en `components/ui/` (Button, StatusBadge, Card, Field, Tabs, Table, etc.) con los
  tokens del Style Reference; i18n completa en `messages/es.json` (cero hardcode).
- Tipos generados: `lib/supabase/types.ts` (15 tablas + RPCs).

## Cómo se probó

- **Gate:** `pnpm typecheck` ✓ · `pnpm lint` ✓ · `pnpm test` 39/39 ✓ · `pnpm build` ✓
  (rutas /, /autoevaluacion, /login estáticas; /verificar dinámica).
- **DB empírico:** `supabase db reset` limpio (×4 corridas) contra Postgres local (Docker);
  `db lint` sin errores; sanity REST: anon bloqueado en tablas (401/42501), consultor con
  JWT ve las 6 empresas demo, authenticated sin perfil ve 0 filas, `verify_certificate`
  responde solo campos públicos y `[]` para códigos inexistentes; TRUNCATE como
  authenticated → permission denied; reasignación de `uploaded_by` → excepción de trigger.
- **Rutas:** las 4 públicas responden 200 con contenido renderizado.
- **Revisión adversarial (7 lentes):** RLS/doctrina N4, fidelidad de seed vs RFC, corrección
  SQL, fidelidad de diseño vs Style Reference/prototipo, calidad de código Next/TS,
  i18n + accesibilidad, y fixer con validación. ~40 hallazgos; todos los medium/high y los
  low valiosos aplicados (D1–D19: tono tercera persona, contraste WCAG carbon/metal,
  focus-visible forced-colors, prefers-reduced-motion, pt-56→224px, score server-only,
  anti-abuso del lead, skip-link, tintes semánticos consistentes, auditoría de certificates
  a nivel BD, bucket Storage, demo data separada, etc.).

## Riesgos restantes / pendientes

- Rate limiting real por IP en `verify_certificate` y el lead → Vercel Firewall (Connect).
- Los `-- DOWN` están documentados pero no son ejecutables mecánicamente (up→down→up sin
  probar en CI).
- Catálogo de controles = los 23 del prototipo; validación del abogado pendiente
  (R-007 "laboral", nomenclatura ARCOP, controles adicionales por dominio).
- `NEXT_PUBLIC_WHATSAPP_NUMBER` es placeholder (warn en build de producción).
- E2E Playwright y axe automatizado quedan para el CI de Fase C/Connect.
- Contraste: metal #6f7988 queda en 4.4:1 (borderline AA) en secundarios de 14px; se usó
  carbon en ≤13px. Decisión de oscurecer el token global → dueño del design system.
