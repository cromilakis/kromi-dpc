# Guion de entrevista dinámico + cobertura del diagnóstico — Diseño

**Fecha:** 2026-07-05
**Estado:** propuesta (pendiente de aprobación)
**Relacionado:** entrevista dinámica (`applies_when`/aplicabilidad), autocompletado desde transcripción, checklist (14 dominios/23 controles/`verification_criteria`).

## Objetivo

Que el consultor tenga un **guion de preguntas** que garantice una reunión
**one-shot**: al terminar, la transcripción debe poder responder **todos los
tópicos de los dominios aplicables** a esa empresa — sin quedarse con temas en el
aire, sin reuniones adicionales (salvo que el cliente detecte que le faltó info,
en cuyo caso se sube una **transcripción complementaria**). Corto y preciso: solo
lo aplicable; la aplicabilidad + expertise recortan lo que no corresponde.

## Piezas (dos son nuevas; el resto ya existe)

1. **Contenido — preguntas por control (NUEVO, dato curado):** cada control tiene
   una o dos **preguntas conversacionales** que eliciten sus `verification_criteria`.
   Curadas (no técnicas), guardadas como dato → revisables por abogado/consultor.
2. **Guion consolidado (NUEVO, UI):** un panel "Guion de entrevista" en el
   diagnóstico, agrupado por dominio, que muestra **solo los controles aplicables**
   a esa empresa (reusa `controlApplies` × factores). Exportable/imprimible.
3. **Cobertura (NUEVO, UI):** tras analizar la transcripción, "Temas sin cubrir" =
   criterios de controles aplicables que siguen sin respuesta (`unknown`), para
   saber si la reunión quedó completa o hace falta una transcripción complementaria.
4. **Ya existe:** aplicabilidad (recorte por rubro/factores + override), extracción
   determinista desde transcripción, y que múltiples transcripciones acumulan
   sugerencias (iteración complementaria) sin duplicar (materialización idempotente).

## Modelo de datos

- **Migración:** `alter table public.controls add column interview_questions text[] not null default '{}';`
  Poblar por control (curado): 1-2 preguntas por control que cubran sus criterios.
  Reflejar en `supabase/seed.sql`. Regenerar types.
  - Contenido = deuda de revisión legal/consultor (igual que el resto del catálogo),
    marcado como tal; arranca con un draft nuestro.

## Guion (builder + panel)

- **Builder** (`lib/interview/guide.server.ts` o extensión del load del diagnóstico):
  para la empresa, toma los controles **aplicables** (mismo criterio que la
  entrevista: `assessment_controls.status != 'not_applicable'` o `controlApplies`
  con factores), agrupa por dominio, y adjunta `interview_questions` + los
  `verification_criteria` (los tópicos que cada pregunta debe dejar resueltos).
- **Panel** en `/app/companies/[id]/diagnosis` (consultor): sección "Guion de
  entrevista", colapsable, agrupada por dominio → por control → sus preguntas.
  Muestra un contador ("N dominios · M preguntas aplicables"). Solo consultor.

## Exportar / imprimir

- Una vista imprimible del guion (ruta `/app/companies/[id]/diagnosis/guide` con
  print CSS, o un botón "Imprimir" que use `@media print`). Contenido: empresa +
  guion agrupado por dominio (solo aplicable). Sin datos internos (no score).

## Cobertura post-transcripción

- Tras la extracción/borrador, computar por dominio/control aplicable si sus
  criterios tienen respuesta (en `answers.compliance[controlCode]`, no `unknown`).
  Mostrar "Temas sin cubrir" (los que siguen sin respuesta) cerca del guion o del
  panel de revisión. Es señal, no bloqueo: guía si la reunión quedó completa.
- **Transcripción complementaria:** el import ya permite subir otra transcripción;
  sus sugerencias se revisan y se suman al borrador. Documentar este flujo como el
  camino oficial para "completar lo que faltó".

## Adaptividad / expertise

- El recorte por aplicabilidad ya omite dominios/controles que no aplican al rubro
  (p. ej. sin datos sensibles → sin dominio KPC-SEN). Con el tiempo se afinan las
  reglas `applies_when` y el consultor puede override. (Ya construido; esta feature
  lo reutiliza para acotar el guion.)

## Seguridad / alcance

- El guion es del **consultor** (`/app`), no del cliente. No expone score ni datos
  internos. Solo lectura del catálogo + aplicabilidad de la empresa.

## Testing

- Unit: builder del guion (dada empresa/factores, arma dominios→controles→preguntas
  solo de lo aplicable; excluye lo no aplicable). Cobertura (criterios sin respuesta).
- E2E: consultor abre el guion en una micro (guion corto, sin dominios no aplicables)
  vs empresa compleja (guion completo); imprimir; tras transcripción, "Temas sin
  cubrir" refleja lo pendiente.

## Decisiones pendientes / a ajustar
1. Redacción de las `interview_questions` (draft nuestro → revisión consultor/abogado).
2. Exportar: ruta imprimible dedicada vs `@media print` sobre el panel.
3. Granularidad de cobertura: por control (v1) vs por criterio individual.
4. ¿El guion también visible/útil para el cliente en la re-certificación self-service (Fase 4b)? (posterior.)
