# CLAUDE.md — kromi-dpc

## Qué es este proyecto
**DPC — Data Protection Compliance**: plataforma de gestión de cumplimiento de la Ley 21.719
(protección de datos personales, Chile). Cara pública (landing + autoevaluación gratuita +
verificación de certificados) y plataforma interna multi-empresa para el equipo consultor
(checklist de 14 dominios, fichas de control, evidencias, riesgos, plan de adecuación,
certificación privada). Detalle en `.kromi/init.md` y `RFC.md`; diseño en `.kromi/design.md`
(Style Reference Attio) y `design/prototype.dc.html`.

## Stack (fijo)
Next.js (App Router) + Supabase (Auth/Postgres/Storage) + Zod + next-intl + Sentry + Vercel. Gestor de paquetes: **pnpm**.

## Estándar de idioma
Prosa en español; técnico (código, identificadores, claves, flags) en inglés.

## Documentos contrato
`.kromi/init.md` (funcional) y `.kromi/design.md` (diseño). La implementación debe ser trazable a estos documentos.

## Comandos
- `pnpm dev` — desarrollo
- `pnpm build` — build de producción
- `pnpm lint` — lint
- `pnpm test` — unit/integration (Vitest)
- `pnpm test:e2e` — E2E (Playwright)

## Disciplina (reglas)
- Validar entradas con Zod en servidor; no confiar en el cliente.
- RLS en datos de usuario; secretos fuera del cliente y del repo.
- Externalizar textos de UI (i18n); no hardcodear strings.
- Reproducir antes de arreglar; evidencia antes de afirmar éxito.

## Límites de autonomía
Bloqueos que requieren intervención humana: credenciales/secretos, borrado de datos,
cambios destructivos, deploy a producción, decisiones legales/privacidad, conflictos
entre `init.md` y `design.md`.
