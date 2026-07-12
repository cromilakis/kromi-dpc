# Acceso al portal post-pago (embudo público del diagnóstico) — Diseño

Fecha: 2026-07-12
Estado: aprobado (pendiente de plan de implementación)

## Contexto

Hoy el prospecto público hace el autodiagnóstico gratuito en `/self-assessment`,
llega a la confirmación y **paga** con Stripe Checkout (ver
`lib/actions/self-assessment.ts#startDiagnosisCheckout` y el webhook
`app/api/stripe/webhook/route.ts#reconcileDiagnosisLead`). El pago solo marca
`self_assessments.payment_status='paid'` en una tabla **desconectada** de
`companies`. El diagnóstico completo, la empresa, el `assessment` y la propuesta
son entregables **posteriores** del equipo consultor (creados a mano en `/app`).

El portal del cliente (`/portal`) ya existe como panel de solo lectura (avance de
cumplimiento, certificado, `ProposalCard`, evidencias), protegido por
`app/portal/layout.tsx` + RLS. La identidad de cliente es una fila `active` en
`company_members`. Auth actual: **solo email + contraseña**
(`lib/actions/auth.ts`), sin auto-registro y sin flujo de activación de cuenta
(la activación quedó pendiente desde la Fase 0 de cuentas de cliente).

## Objetivo

Tras pagar, el prospecto obtiene **acceso inmediato a un portal** donde ve su
información y puede **volver cuando quiera** con su login. El acceso NO debe
depender del redirect de retorno de Stripe.

## Decisiones tomadas (con el usuario)

1. **Registro ANTES de pagar.** La cuenta se crea en el formulario de datos,
   antes de ir a Stripe. Así el acceso no depende del callback de Stripe: si el
   redirect falla o el usuario cierra el navegador, la cuenta ya existe.
2. **Cuenta con contraseña, auto-confirmada.** El usuario define email +
   contraseña; la cuenta se crea ya confirmada (sin verificación por correo) y
   queda con sesión iniciada al instante. Se acepta no probar propiedad del
   email (mitigado: paga con tarjeta y el correo es el del recibo).
3. **Auto-registro público** para el embudo de pago. Esto **revierte**
   explícitamente la decisión previa "el consultor invita, sin auto-registro"
   (`2026-07-05-company-accounts-portal-design.md`), acotado a este embudo.
4. La **vista detallada del plan de mitigación** para el cliente queda **fuera
   de alcance** (spec aparte). Este spec entrega: registro → cuenta → empresa →
   portal + estados + panorama preliminar.

## Flujo de punta a punta

1. Diagnóstico → resultado → "Continuar" (igual que hoy).
2. Formulario de datos actual + **campo de contraseña** nuevo (el correo ya se
   pide). Tamaño, rubro y factores siguen derivándose del diagnóstico.
3. Al confirmar, la server action pública `registerAndStartCheckout`
   (service-role) ejecuta en orden:
   a. Valida con Zod (datos actuales + contraseña, mínimo 8 caracteres).
   b. Crea el usuario auth **confirmado** (`admin.auth.admin.createUser` con
      `email_confirm: true`). Si el email ya existe → corta con error
      `account_exists` (no duplica).
   c. Provisiona la empresa reutilizando el núcleo de `createCompany`
      (refactorizado para correr sin sesión de consultor): siembra `assessment`
      (ciclo 1) + `assessment_controls` en `pending`.
   d. Inserta `company_members` (status `active`) vinculando usuario ↔ empresa.
   e. Vincula el lead: `self_assessments.company_id = <company>`.
   f. Inicia sesión server-side (`signInWithPassword` con las credenciales recién
      creadas → setea cookies).
   g. Crea la Checkout Session (misma lógica que `startDiagnosisCheckout`) con
      `metadata.kind='diagnosis_lead'` + `lead_id`, y devuelve `url`.
4. Redirige a Stripe Checkout → paga.
5. El webhook (`reconcileDiagnosisLead`) marca `self_assessments.payment_status
   ='paid'` (fuente de verdad, verificada por firma), independiente del navegador.
6. `success_url` → `/portal` (ya logueado).
7. Vuelve cuando quiera con email + contraseña (`/login`).

## Estados del portal

El portal deriva su estado de: (membership active) + (payment_status del
`self_assessments` vinculado por `company_id`) + (`companies.client_ready_at`).

- **A — Pago pendiente** (registró, `payment_status != 'paid'`): aviso dominante
  "Completa tu pago para iniciar tu diagnóstico" + botón que reabre el Checkout.
  El resto del panel queda bloqueado. Cubre abandono/fallo de pago. El botón crea
  una Checkout Session **para el lead/empresa YA existentes** (no inserta un lead
  nuevo): una acción de re-pago que ubica el `self_assessments` por `company_id`
  del cliente autenticado y le crea una nueva sesión de Stripe. `registerAndStart
  Checkout` inserta el lead una sola vez, en el registro.
- **B — Pagado, en preparación** (`paid` y `client_ready_at is null`): "Pago
  recibido ✓. Tu diagnóstico completo y propuesta de mitigación están en
  preparación." + se muestra **su panorama preliminar** (nivel de exposición,
  N.º de hallazgos, áreas). Es el estado al volver de Stripe.
- **C — Listo** (`client_ready_at is not null`): el dashboard actual (avance de
  cumplimiento, `ProposalCard`, evidencias, certificado).

El flag `companies.client_ready_at` lo activa el consultor desde `/app` cuando el
trabajo está publicado (más explícito que inferirlo del % de avance).

## Cambios de datos

Migración nueva:
- `self_assessments.company_id uuid null references public.companies(id)`.
- `companies.client_ready_at timestamptz null`.
- Índice en `self_assessments.company_id`.
- Tipos en `lib/supabase/types.ts` actualizados a mano (Row/Insert/Update).

Sin cambio de esquema: al enviar el formulario se persiste también el **detalle
del panorama** (áreas + severidades) dentro de `self_assessments.answers` (jsonb),
para poder re-mostrarlo en el estado B (hoy solo se guarda `risk_level` y
`total_breaches`).

## Componentes / archivos afectados

- `lib/actions/self-assessment.ts` — nueva `registerAndStartCheckout` (reusa el
  armado de la Checkout Session ya existente).
- `lib/actions/companies.ts` — extraer el núcleo de `createCompany` a una función
  reutilizable sin sesión de consultor (provisión service-role).
- `components/self-assessment/lead-form.tsx` — campo de contraseña + llamada a la
  nueva action; el CTA de pago sigue igual para micro/pequeña.
- `lib/self-assessment/lead-schema.ts` — contraseña en el schema.
- `app/portal/page.tsx` + `lib/portal/load-dashboard.server.ts` — estados A/B/C y
  render del panorama preliminar.
- Migración `*_self_assessment_company_link.sql` + `lib/supabase/types.ts`.
- `app/api/stripe/webhook/route.ts` — sin cambios de lógica (ya marca `paid`);
  verificar que el portal derive el estado correctamente.

## Casos borde y seguridad

- **Email ya registrado:** no se crea nada; error `account_exists` → se le pide
  iniciar sesión (respeta `unique(user_id)` un-usuario-una-empresa).
- **Abandono/fallo de pago:** cuenta y empresa existen → portal en estado A con
  botón de pago (reusa el mecanismo de Checkout).
- **Abuso de auto-registro** (crear cuentas/empresas para correos ajenos):
  mitigado por honeypot (ya existe), validación server-side, y rate-limiting vía
  Vercel Firewall (pendiente en init.md). La cuenta solo es útil tras pagar.
- **Auto-confirmación:** no prueba propiedad del email — aceptado; el pago con
  tarjeta da señal de identidad.
- **Provisión parcial:** si un paso posterior a crear el usuario auth falla, la
  action debe loggear y devolver error; el usuario auth huérfano se tolera (el
  reintento con el mismo email dará `account_exists` → login). Documentar.
- **Contraseña:** validada en cliente (UX) y servidor (mismo Zod, mínimo 8).

## Pruebas

- **Unit (Vitest):** schema del lead con contraseña; derivación de estado A/B/C;
  `registerAndStartCheckout` con mocks de admin/Stripe (asserta usuario + empresa
  + `company_members` active + `self_assessments.company_id` + `url`); email
  existente → `account_exists`.
- **E2E (Playwright):** registro (con contraseña) → pago con tarjeta de prueba →
  `/portal` en estado B ("pagado / en preparación") con panorama; abandono de
  pago → estado A; cierre de sesión y regreso con login → mismo portal.

## Fuera de alcance (spec posterior)

- Vista detallada del plan de mitigación (paso a paso por brecha) para el cliente.
- Generación automática del diagnóstico completo/propuesta sin equipo.
- Migrar el auth existente a magic link/OTP.
