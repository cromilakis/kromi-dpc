# Cuentas de empresa y portal del cliente — Diseño (épica)

**Fecha:** 2026-07-05
**Estado:** propuesta (pendiente de revisión del usuario)
**Relacionado:** `2026-07-05-pricing-calculator-design.md` (el tramo del Complexity Score gobierna tanto el precio como el nivel de autonomía en la re-certificación).

## Objetivo

Dar a las empresas cliente una **cuenta propia** para acceder a un **portal**
donde puedan: ver su estado de cumplimiento y su certificado, subir evidencias,
ver y aceptar su propuesta/plan, **pagar (Stripe)** y **re-certificarse** de
forma asistida al vencer. Hoy el modelo es *consultor autenticado + anónimo por
token*; esto agrega un tercer actor (el cliente) con su propio acceso aislado.

## Decisiones tomadas (con el usuario)

- **Acceso**: el **consultor invita** a la empresa (provisiona la cuenta desde
  `/app`); no hay auto-registro abierto.
- **Alcance v1 del portal**: (1) ver estado de cumplimiento + certificado;
  (2) auto-recertificación asistida (con gate humano por tramo); (3) subir
  evidencias; (4) ver/aceptar propuesta y plan; (5) **pago vía Stripe**.
- **Pricing al cliente**: solo la **propuesta final** que definió el consultor.
  El Complexity Score y la fórmula quedan 100% internos (RFC §14.3).

## Principio rector (seguridad ejemplar)

Esta es una plataforma de **protección de datos**: el portal debe ser modélico.
Cada empresa ve SOLO lo suyo (aislamiento por RLS a nivel de fila), secretos
fuera del cliente, y el determinismo del diagnóstico se mantiene o refuerza
cuando desaparece el consultor como gate (ver "Gate humano por tramo").

## Es una épica → se decompone en sub-proyectos

Cada fase produce software funcional y testeable por sí sola, y tendrá su
**propio plan** (brainstorm→spec ya cubierto aquí a nivel épica; cada fase se
detalla en su plan de implementación). Orden por dependencia:

- **Fase 0 — Fundación: cuentas de empresa + auth + RLS del cliente.** (bloquea
  todo lo demás)
- **Fase 1 — Portal de solo lectura**: dashboard de cumplimiento + certificado.
- **Fase 2 — Propuesta + aceptación + pago (Stripe).**
- **Fase 3 — Evidencias del cliente** (subida + validación del consultor).
- **Fase 4 — Auto-recertificación asistida** (reusa entrevista dinámica + LLM,
  cara al cliente, con gate humano por tramo).

## Fase 0 — Cuentas de empresa, auth y RLS

Modelo actual: Supabase Auth + `profiles(user_id, role: consultant|admin)`;
RLS con `is_consultant()`/`is_admin()`. Lo nuevo:

- **Vínculo usuario→empresa**: nueva tabla `company_members (user_id → auth.users,
  company_id → companies, role, invited_by, status: invited|active, created_at)`.
  Un usuario cliente pertenece a UNA empresa en v1 (multi-empresa por usuario:
  fuera de alcance). Rol de cliente: valor nuevo `client` en `user_role`, o un
  rol propio en `company_members` (decidir en el plan; preferible NO mezclar el
  rol de plataforma con el de empresa).
- **Helper RLS** `current_company_id()` (SECURITY DEFINER): devuelve el
  `company_id` del usuario autenticado vía `company_members` (o null si es
  consultor/anónimo). Es la base de todas las policies del cliente.
- **Policies del cliente** (SELECT, y escritura acotada) sobre: `companies` (su
  fila), `assessments`/`assessment_controls` (de su empresa, solo lectura),
  `controls`/`domains` (catálogo, lectura), `evidences` (su empresa; insert en
  Fase 3), `certificates` (su empresa, lectura), y las tablas de propuesta/pago
  (Fase 2). El consultor conserva sus policies actuales; el cliente NUNCA ve
  `complexity_score`, `audit_log`, ni datos de otras empresas.
- **Exposición del score**: `companies.complexity_score` no debe viajar al
  cliente. Opciones (decidir en plan): policy a nivel columna, o una vista
  `company_client_view` que excluya columnas internas y sea lo único que el
  cliente puede leer. Preferible la vista (límite explícito y auditable).
- **Invitación**: server action del consultor que crea la fila `company_members`
  (status invited) y dispara el email de invitación (Supabase Auth invite /
  magic link de activación). Reusa el patrón de hashing/token de `share_links`
  si aplica.
- **Shell del cliente**: layout `/portal` separado de `/app` (que es del
  consultor). El proxy/route protection distingue rol: cliente → `/portal`,
  consultor → `/app`.

## Fase 1 — Portal de solo lectura

- `/portal` (dashboard del cliente): estado de su certificación
  (vigente/vencida/por vencer, reusa `certificate_status` + `expires_at`),
  avance de cumplimiento (sobre lo aplicable, como el checklist interno),
  y descarga de su certificado. Todo por RLS del cliente. Sin datos internos.

## Fase 2 — Propuesta, aceptación y pago (Stripe)

- **Propuesta**: el consultor arma la propuesta (plan + precio, usando la
  calculadora interna del otro spec) y la publica al portal. Nueva tabla
  `proposals (company_id, plan, amount_clp, currency, status:
  draft|sent|accepted|paid|expired, created_by, ...)`. El cliente ve la
  propuesta final (nunca el score) y la **acepta**.
- **Pago (Stripe)**: al aceptar, se genera un pago. **La integración de Stripe
  se provisiona vía el flujo de integraciones/marketplace en implementación**
  (no se hardcodea el SDK en el spec). Elementos: Stripe Checkout (o Payment
  Element), `payments (proposal_id, company_id, stripe_session_id,
  stripe_payment_intent, amount, status, ...)`, y un **webhook** server-side que
  concilia el estado del pago (fuente de verdad = webhook, no el redirect del
  cliente). Claves de Stripe **server-only**. Manejar idempotencia del webhook.
- Al confirmarse el pago, la propuesta pasa a `paid` y se habilita la fase de
  servicio correspondiente. Rastro en `audit_log`.

## Fase 3 — Evidencias del cliente

- El cliente sube documentos/evidencias que pide su checklist (Supabase Storage,
  RLS por empresa; reusa el modelo `evidences` con `evidence_status`). El
  consultor las valida (validated/partial/rejected) como hoy. Reduce el ida y
  vuelta por correo. Límite de tipos/tamaño y escaneo básico a definir en plan.

## Fase 4 — Auto-recertificación asistida (gate humano por tramo)

Reusa la **entrevista dinámica** + el **autocompletado LLM desde transcripción**
(ya construidos), pero de cara al cliente. **El gate humano cambia según el
tramo del Complexity Score** (mismo eje que el pricing):

- **Tramo bajo**: re-certificación **self-service asistida por IA** (viable y
  rentable, producto masivo). La IA prepara el borrador; reglas duras de
  elegibilidad (ya existentes) más un checklist guiado.
- **Tramo alto/crítico** (clínica, supermercado): la re-certificación **siempre
  pasa por revisión del consultor** antes de emitir.
- **En todos los casos**: el asistente **nunca emite el certificado**; genera el
  borrador de re-evaluación y marca deltas/riesgos ("cambió esto desde tu última
  certificación", "revisa estas 3 actividades del RAT"). La emisión mantiene su
  control (humano o reglas duras).
- **Cadencia**: cron/schedule que, al acercarse `expires_at`, dispara la
  re-evaluación y notifica al cliente (y al consultor en tramos altos).
- **Determinismo reforzado**: sin filtro humano en el tramo bajo, las garantías
  del LLM (temp 0, evidencia obligatoria, "sin asignar", validación Zod) son
  aún más estrictas; nada se auto-acepta sin confirmación del cliente.

## Riesgos y constraints

- **Integridad de la certificación**: el gate humano por tramo y "la IA nunca
  emite" protegen el valor del sello. Documentar la regla de emisión por tramo.
- **Seguridad del portal**: RLS por empresa es la línea de defensa; auditar cada
  policy. El portal cliente y el `/app` del consultor son superficies separadas.
- **Legal/privacidad**: un cliente que se auto-declara conforme asume
  responsabilidad; el texto legal del flujo self-service debe revisarse con
  abogado (BLOQUEANTE antes de exponer emisión self-service).
- **Pricing interno**: el score jamás al cliente; solo la propuesta final.
- **Stripe**: montos/impuestos (IVA Chile) y conciliación por webhook; validar
  con el usuario los montos antes de cobrar de verdad (los CLP del spec de
  pricing son hipótesis sin validar).

## Testing (por fase)

- **Fase 0**: tests de RLS (cliente A no ve datos de empresa B; cliente no ve
  `complexity_score`/`audit_log`; consultor sigue viendo todo). Estos son los
  tests más críticos de toda la épica.
- **Fase 1–3**: unit de las server actions (Zod, auth, audit) + E2E
  click-through como cliente (login por invitación, ver dashboard, subir
  evidencia, aceptar propuesta, pagar en modo test de Stripe).
- **Fase 4**: reusa la verificación de la entrevista dinámica + LLM; añade el
  tiering del gate (bajo emite borrador self-service; alto exige consultor).

## Decisiones pendientes para el plan de cada fase

1. Rol del cliente: valor en `user_role` vs rol propio en `company_members`.
2. Exposición del score: policy a nivel columna vs vista `company_client_view`.
3. Un usuario ↔ una empresa (v1) vs multi-empresa (futuro).
4. Stripe: Checkout hospedado vs Payment Element embebido; manejo de IVA.
5. Montos CLP reales (bloqueante, del spec de pricing) antes de cobrar.
6. Texto legal del self-service (bloqueante, con abogado) antes de emisión
   self-service en Fase 4.
