# Inicialización del proyecto — kromi-dpc

## Estado

Wizard completado (Momento 1) con contrato funcional derivado de `RFC.md` (v0.4, julio 2026)
y del prototipo de Claude Design (`design/prototype.dc.html`). Servicios externos pendientes
de Connect (ver Pendientes).

Respuestas del wizard: `projectName: kromi-dpc` · `target: web` · `appType: personal-data` ·
`multiLocale: false`.

## Resumen del proyecto

**DPC — Data Protection Compliance** (*"Protección Certificada"*): plataforma de gestión de
cumplimiento de la Ley N° 21.719 de Protección de Datos Personales (Chile, vigencia plena
1 de diciembre de 2026). Dos caras:

- **Cara pública:** landing de posicionamiento (hero, contexto legal y sanciones, 14 dominios,
  ciclo de servicio, entregable, precios base en UF, CTA WhatsApp) + **autoevaluación en línea
  gratuita** que estima tramo y orientación de valor.
- **Plataforma interna (multi-empresa):** Sistema de Gestión del Cumplimiento para el equipo
  consultor — registro de empresas cliente, clasificación por rubro, Complexity Score,
  checklist parametrizado por los 14 dominios del Marco DPC, fichas de control con criterios y
  evidencias, gap analysis y matriz de riesgos, catálogo de soluciones, plan de adecuación,
  repositorio documental de evidencias, emisión y verificación de certificados privados DPC.
  El acceso es discreto (pie de página del sitio público), no un login destacado.

La fuente de detalle es `RFC.md` en la raíz del repo; este archivo es el contrato operativo.

## Problema a resolver

Las organizaciones chilenas llegan a la vigencia de la Ley 21.719 sin visibilidad de sus datos
(sin RAT), sin protocolos ni evidencia estructurada, y frente a una oferta fragmentada
(asesoría legal, ciberseguridad e ISO en silos) o de "adecuación exprés" sin trazabilidad.
DPC entrega una metodología objetiva, repetible, medible y basada en evidencia, con
acompañamiento humano real, y la plataforma es el núcleo operativo que la hace escalable.

## Público objetivo

- **Usuarios de la plataforma interna:** el equipo consultor DPC (fundador/líder de producto y
  abogado especialista; luego consultores adicionales).
- **Visitantes del sitio público:** empresas chilenas (micro a enterprise) que necesitan
  cumplir la Ley 21.719 — retail/e-commerce, fintech/financiero, salud, servicios B2B,
  startups.
- Los clientes finales **no** acceden a la plataforma (herramienta interna); reciben el
  expediente de cumplimiento y el certificado.

## Flujo principal

Registro de empresa → selección de rubro (activa leyes complementarias y régimen sectorial) →
clasificación DPC y Complexity Score → checklist multiregulatorio (14 dominios) →
levantamiento de hallazgos y riesgos (gap analysis) → plan de adecuación → implementación de
soluciones (cliente) → carga y validación de evidencias → reevaluación → certificación DPC →
revalidación periódica.

Embudo público: landing → autoevaluación gratuita → orientación de valor → contacto WhatsApp →
propuesta → servicio pagado.

## Usuarios y roles

- **Consultor (admin):** gestión completa de empresas, evaluaciones, controles, evidencias,
  certificados. Rol inicial único; la separación fina de roles (p. ej. consultor vs revisor
  legal) queda para más adelante.
- **Prospecto (anónimo, sitio público):** completa la autoevaluación; deja datos de contacto
  opcionales (lead).
- **Verificador de certificado (anónimo):** consulta pública de validez de un certificado por
  código, sin autenticación.

## Entidades principales

- **Empresa** (cliente): razón social, RUT, rubro/sector, tamaño (tramo Ley 20.416), factores
  de complejidad, estado del ciclo (diagnóstico → certificada → revalidación).
- **Dominio** (14, catálogo): 8 por principio (DPC-LIC, FIN, PRO, CAL, RES, SEG, TRA, CON) +
  6 complementarios (DPC-INV, DER, SEN, TER, INC, EIA).
- **Control** (catálogo, ficha normalizada): código único, dominio, nombre, objetivo, detalle,
  criterios de verificación, fundamento legal primario y conectado, riesgo mitigado,
  evidencias requeridas, aplicabilidad sectorial.
- **Evaluación** (empresa × ciclo): instancia del checklist; por control: estado
  Cumple / Parcial / No cumple + hallazgos.
- **Evidencia**: documento adjunto por control/empresa con estado validada / parcial /
  faltante, versionado.
- **Riesgo** (catálogo R-XXX + asignación a empresa): clasificación transversal/sectorial,
  impacto × probabilidad.
- **Solución/Remedio** (catálogo): alternativas de mitigación por brecha.
- **Plan de adecuación** (empresa): ítems con solución elegida, responsable, estado.
- **Certificado**: emisión por empresa con código verificable públicamente, vigencia,
  revalidaciones.
- **Autoevaluación (lead)**: respuestas del cuestionario público, tramo estimado, contacto.
- **Usuario/Consultor** y **audit_log** (trazabilidad de acciones sobre datos).

## Datos y sensibilidad

`data_level: personal` con zonas `sensitive`. La plataforma trata datos de empresas cliente y
sus evidencias de cumplimiento (pueden contener datos personales e información confidencial de
negocio). Principios del propio RFC aplicados a la plataforma (dogfooding, sección 15):
confidencialidad por diseño, minimización, control de acceso, cifrado, retención acotada,
bitácora de auditoría. Riesgo por defecto: **high** — RLS con test de aislamiento, Zod en
servidor, storage privado con URLs firmadas, audit_log, Sentry sin PII.

## Archivos y adjuntos

Sí: evidencias documentales por control/empresa (PDF, imágenes, planillas) en Supabase Storage
**privado**, acceso por URL firmada, versionado y estado de validación. El logo y assets de
marca viven en `public/`.

## Páginas públicas

- `/` — landing (hero, banda Ley 21.719 y sanciones, 14 dominios, ciclo, entregable,
  acompañamiento, precios base UF, CTAs WhatsApp y autoevaluación, acceso discreto a la
  plataforma en el footer).
- `/autoevaluacion` — cuestionario multi-paso gratuito con estimación de tramo y riesgo de no
  certificarse.
- `/verificar/[codigo]` — verificación pública de certificados DPC.

## Pantallas privadas o administrativas

- `/app` — dashboard del consultor (cartera de empresas, estados, métricas).
- `/app/empresas` (+ `[id]`) — registro y ficha de empresa, rubro, Complexity Score.
- `/app/empresas/[id]/checklist` — evaluación por dominios, fichas de control, estados.
- `/app/empresas/[id]/riesgos` — matriz impacto × probabilidad, gap analysis.
- `/app/empresas/[id]/plan` — plan de adecuación con seguimiento.
- `/app/empresas/[id]/evidencias` — repositorio documental con validación.
- `/app/empresas/[id]/certificado` — emisión/revalidación.
- `/app/catalogo` — administración del Marco DPC (dominios, controles, riesgos, soluciones).

(El mapa fino de rutas se valida contra el análisis del prototipo en la implementación.)

## Restricciones funcionales

- Español único (`es`), UI externalizada con next-intl (sin hardcode).
- Tono público en tercera persona ("la organización"); no se comunican los principios
  metodológicos internos como argumento de venta.
- No se comprometen plazos en la cara pública (tiempos aún no medidos — RFC §18).
- Precios "desde" (5 UF micro / 15 UF pequeña / enterprise bajo cotización), sin precio único.
- CTA principal WhatsApp; autoevaluación como CTA secundario.
- La plataforma no emite certificaciones gubernamentales — disclaimers según RFC.
- Complexity Score es **interno** (no se muestra a clientes/prospectos).

## Restricciones de diseño

Style Reference **Attio** (`.kromi/design.md`): monocromo ink `#1c1d1f` sobre blanco, serif
(Newsreader como sustituto de Tiempos) solo en headlines ≥28px, Inter con `ss03` para toda la
UI, azul `#407ff2` solo en estados interactivos, radius 10px botones / 8px cards / 7px inputs,
bordes Slate `#d3d8df` como separador primario, sombras solo en UI frames. El prototipo
(`design/prototype.dc.html`) es la referencia de layout pantalla por pantalla.

## Criterios iniciales de éxito

- El equipo puede operar el ciclo completo de una empresa piloto (registro → checklist →
  evidencias → certificado) sin salir de la plataforma.
- La autoevaluación pública entrega una estimación coherente con las reglas del RFC §13-14 y
  captura leads.
- Un tercero puede verificar un certificado por código.
- Los 14 dominios y los controles del RFC v0.4 están cargados como seed.

## Criterios de aceptación

- `typecheck`, `lint`, `build`, `test` y E2E de flujos críticos en verde.
- RLS activa con test negativo de aislamiento en toda tabla con datos de cliente.
- Validación Zod en todas las entradas de servidor.
- Sin strings de UI hardcodeados; catálogo en `messages/es.json`.
- Estados de carga/vacío/éxito/error en todas las vistas de datos.
- Accesibilidad básica (axe sin violaciones críticas en páginas públicas).
- Trazabilidad: cada pantalla implementada referencia su sección del RFC/prototipo.

## Specs candidatas

Orden por dependencias (fundaciones → datos → features → admin):

| # | spec | type | data_level | depends_on | Alcance |
|---|------|------|-----------|------------|---------|
| 1 | `marco-dpc-schema` | internal-crud | business | — | Schema Postgres + seeds: dominios, controles, riesgos, soluciones (catálogos del Marco DPC). |
| 2 | `sitio-publico` | public-site | none | — | Landing según prototipo. |
| 3 | `autoevaluacion` | public-site | personal | marco-dpc-schema | Cuestionario público multi-paso, estimación de tramo, captura de lead. |
| 4 | `auth` | auth | personal | — | Login consultores (@supabase/ssr), acceso discreto desde footer. |
| 5 | `empresas` | personal-data | personal | auth, marco-dpc-schema | CRUD empresas, rubro, tramo, Complexity Score. |
| 6 | `checklist-evaluacion` | personal-data | personal | empresas | Evaluación por dominios, fichas de control, estados, hallazgos. |
| 7 | `riesgos-gap` | internal-crud | business | checklist-evaluacion | Matriz impacto × probabilidad, gap analysis. |
| 8 | `evidencias` | personal-data | sensitive | checklist-evaluacion | Storage privado, URLs firmadas, versionado, validación. |
| 9 | `plan-adecuacion` | internal-crud | business | checklist-evaluacion | Soluciones elegidas, responsables, seguimiento. |
| 10 | `certificados` | personal-data | personal | evidencias | Emisión, vigencia, revalidación y verificación pública. |

Pisos de riesgo por `data_level` según doctrina foundry: specs 3, 5, 6, 10 ≥ medium;
spec 8 = high. `auth` = high por type.

## Decisiones tomadas

- **2026-07-02** — Stack kromi-foundry fijo: Next.js App Router + Supabase
  (Auth/Postgres/Storage) + Zod + next-intl + Sentry + Vitest/Playwright, deploy Vercel.
- **2026-07-02** — `appType: personal-data` (rigor por defecto high) — la plataforma custodia
  datos de cumplimiento de terceros.
- **2026-07-02** — Single-locale `es`; multi-idioma descartado por ahora.
- **2026-07-02** — Alcance: todo el prototipo por fases (A: fundaciones/schema,
  B: cara pública, C: plataforma interna).
- **2026-07-02** — Postgres local vía Docker + Supabase CLI (instalados hoy); proyecto
  Supabase cloud recién en Connect.
- **2026-07-02** — El Style Reference del usuario (Attio) se movió a `.kromi/design.md` como
  única fuente de verdad de diseño.
- **2026-07-02** — Scaffold ejecutado con driver estilo golden-test (bug del flujo `/kromi`
  con `.kromi/` preexistente reportado a kromi-foundry).

## Pendientes

- **Connect (Momento 4, manual):** proyecto Supabase cloud + `vercel link` + Sentry DSN +
  Resend (si aplica email). GitHub ya conectado (`cromilakis/kromi-dpc`). `/kromi-doctor`
  debe pasar de `pending` a `ok` en cada grupo.
- Primera corrida de `supabase init` + `supabase start` locales (requiere Docker Desktop
  iniciado y acuerdo aceptado).
- Contenido definitivo del catálogo de controles: el RFC define la ficha y ejemplos
  (DPC-INC-002 y los nuevos v0.4); el catálogo completo por dominio se carga como seed
  iterativo con el abogado especialista.
- Número de WhatsApp real para los CTAs y assets finales de marca.
- Decidir dominio/hosting del sitio (afecta verificación pública de certificados).
