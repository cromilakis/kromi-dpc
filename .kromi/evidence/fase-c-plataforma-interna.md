# Evidencia — Fase C: plataforma interna

**Fecha:** 2026-07-03 · **Riesgo:** high (data_level personal/sensitive) · **Specs cubiertas:**
`auth`, `empresas`, `checklist-evaluacion`, `riesgos-gap`, `plan-adecuacion`, `evidencias`,
`certificados` (specs 4-10 de `.kromi/init.md`).

## Qué se construyó

### Auth + shell (spec auth)
- `middleware.ts` (@supabase/ssr): refresh de sesión, `/app/*` protegido con redirect a
  `/login?next=…` (validación de next path), sesión activa en /login → /app.
- Login funcional (server action `signInWithPassword` + Zod, errores genéricos).
- Shell del prototipo: sidebar 236px dos modos (Consultoría / Empresa con bloque de
  contexto, tramo de score y "← Todas las empresas") + topbar 56px con menú de usuario
  accesible (Escape/clic fuera) y signOut.
- `scripts/create-consultant.mjs` (`pnpm seed:consultant`): bootstrap del consultor local,
  con guard duro contra ejecución accidental contra Supabase remoto.
- i18n por módulo: deep-merge de `messages/app/*.json` en `i18n/request.ts`.

### Módulos (4/4)
- **Dashboard + Empresas:** panel general con stats y cartera (7 columnas del prototipo:
  empresa, rubro, fase, cumplimiento, score por tramo, riesgos, tiempo); listado con
  búsqueda; wizard de alta en 4 pasos (identificación con validación de RUT chileno,
  clasificación por rubro, factores de complejidad, confirmación) que calcula el
  Complexity Score server-only, crea el assessment ciclo 1 con todos los controles
  aplicables al sector y audita; resumen de empresa con métricas, riesgos top y actividad.
- **Checklist:** vista por 14 dominios con rail persistente de navegación (done/total y
  mini-barra por dominio), filtros por estado/dominio, cambio de estado cicable accesible
  (aria-live) con audit_log old→new; ficha de control completa (criterios, fundamentos,
  evidencias requeridas con mapeo "sin fila = faltante", hallazgos editables, prev/next).
- **Riesgos + Soluciones + Plan:** matriz 5×5 impacto × probabilidad con tintes por
  severidad, asignación desde catálogo con foco gestionado, catálogo de soluciones →
  plan; plan de adecuación con estados cicables, responsable, vencimiento y progreso.
- **Evidencias + Certificación:** upload real a Storage privado (validación de MIME/tamaño
  server-side, path por empresa, versionado por nombre), descarga solo por URL firmada
  (60s) tras verificación de sesión, validación de estado con regla "sin archivo no se
  valida"; elegibilidad de certificación server-side (≥80% compliant y cero non_compliant
  en DPC-SEG/DPC-INC, parámetros documentados), emisión con código aleatorio
  (DPC-XXX-YYYY-######), sha256 y vigencia 12 meses; revalidación y revocación con
  confirmación accesible (alertdialog con foco gestionado) — todo auditado.

## Cómo se probó
- **Gate:** typecheck ✓ · lint 0 errores (1 warning conocido en el stub demo) ·
  **tests 91/91** ✓ · build ✓ (15 rutas: 11 dinámicas del área interna + middleware).
- **Runtime smoke** (Supabase local + dev server): `/` 200 · `/app` anon → 307 a
  `/login?next=/app` · `/app/empresas` anon → 307 · `/login` 200 ·
  `/verificar/DPC-CA-2026-X7K4QZ` (código del seed) 200. Consultor demo creado con
  `pnpm seed:consultant`.
- **Revisión adversarial (4 lentes + fixer):** seguridad/authz, calidad de código,
  diseño+a11y, runtime. 34 hallazgos → 11 accionables, todos corregidos (ninguno falso
  positivo); lows baratos aplicados (a11y de foco, aria-live, contraste carbon,
  getFormatter, claves huérfanas).

## Riesgos restantes / pendientes
- Sniffing de magic bytes en uploads (hoy se valida MIME/tamaño declarados) — mejora futura.
- Índice único parcial de certificados activos y unique de versionado → documentados,
  se agregan con la próxima migración.
- El listado de empresas muestra el Complexity Score (como el prototipo, vista interna);
  si se prefiere restringirlo al resumen, quitar esa columna.
- Rate limiting por IP (verify + lead) → Vercel Firewall en Connect.
- E2E Playwright del flujo login → alta → checklist → certificado: pendiente para CI.
- Roles finos (consultor vs admin) definidos en BD; la UI trata a todo el equipo igual.
