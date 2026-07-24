# Fase 1 SEO — Centro de Recursos (Hub & Spoke) · Diseño

**Fecha:** 2026-07-23
**Estado:** Aprobado (brainstorming) — pendiente de plan de implementación
**Depende de:** Fase 0 SEO (metadata, robots, sitemap, JSON-LD, OG) ya desplegada en `kpc.kromi.cl`.

## 1. Contexto y objetivo

La Fase 0 dejó el sitio técnicamente listo para SEO, pero solo existen la landing y la
autoevaluación. Sin páginas que respondan búsquedas informativas, no hay nada que
posicionar para términos como *"cómo cumplir la Ley 21.719"* o *"multas ley 21.719"*.

**Objetivo:** crear un **centro de recursos evergreen** (`/recursos`) que capture tráfico de
búsqueda informativa sobre la Ley 21.719 y lo canalice a la **autoevaluación gratuita**
(embudo existente: landing → autoevaluación → WhatsApp → servicio). La Ley 21.719 es estable,
así que el contenido es evergreen: se produce en oleadas acotadas y requiere poca mantención.

**Modelo de producción:** el asistente redacta los borradores (optimizados para SEO, AI
Overviews y E-E-A-T); el equipo (fundador + abogado especialista) **revisa y aprueba** la
exactitud legal antes de publicar. El esfuerzo del equipo es revisión, no redacción.

**No-objetivos (YAGNI):**
- No es un blog con publicación periódica perpetua.
- No hay comentarios, suscripción, ni CMS. El contenido vive en el repo (MDX).
- No se traduce a otros idiomas (sitio single-locale español).
- No se cubren normas ajenas a la Ley 21.719 y sus conexas ya presentes en el catálogo.

## 2. Público y verticales

Empresas chilenas (micro→enterprise) que deben cumplir la Ley 21.719. Rubros a cubrir en
oleadas: **Salud** (primero — mayor urgencia y multas), **Fintech/Financiero**,
**Retail/E-commerce**, **Servicios B2B/Startups**.

## 3. Arquitectura de contenido (Hub & Spoke)

Sección `/recursos` con un pilar central, satélites generales y páginas por rubro, todo
enlazado bidireccionalmente y con CTA a `/self-assessment`.

```
/recursos (índice, tarjetas)
   │
   └─► PILAR: /recursos/ley-21719  "Guía completa Ley 21.719"
         ▲  ▲  ▲
   ┌─────┘  │  └───────────────┐
 SATÉLITES generales      PÁGINAS de RUBRO
 · multas-ley-21719       · proteccion-datos-salud
 · que-es-el-rat          · proteccion-datos-fintech
 · consentimiento-...     · proteccion-datos-retail-ecommerce
 · derechos-arcop         · proteccion-datos-empresas-b2b
 · datos-sensibles
 · notificacion-brechas-seguridad
        │
        └──── todas enlazan al pilar, a 2-3 hermanas y a /self-assessment
```

**Regla de enlazado:** cada página enlaza (a) al pilar, (b) a 2-3 páginas hermanas
relevantes, (c) a la autoevaluación. El pilar enlaza a todos sus satélites y rubros.

## 4. Keyword map

| Slug (`/recursos/…`) | Tipo | Título (H1 de trabajo) | Keyword principal |
|---|---|---|---|
| `ley-21719` | Pilar | Ley 21.719 explicada: guía completa de cumplimiento | "ley 21.719", "ley protección de datos chile" |
| `multas-ley-21719` | Satélite | Multas de la Ley 21.719: cuánto arriesga tu empresa | "multas ley 21.719", "sanciones protección datos" |
| `que-es-el-rat` | Satélite | Qué es el RAT y cómo hacerlo (con plantilla) | "RAT", "registro de actividades de tratamiento" |
| `consentimiento-datos-personales` | Satélite | Consentimiento bajo la Ley 21.719 | "consentimiento datos personales chile" |
| `derechos-arcop` | Satélite | Derechos ARCOP: qué son y cómo responderlos en 30 días | "derechos ARCOP", "derechos del titular" |
| `datos-sensibles` | Satélite | Datos sensibles: reglas especiales de la Ley 21.719 | "datos sensibles ley 21.719" |
| `notificacion-brechas-seguridad` | Satélite | Brechas de seguridad: cómo y cuándo notificar a la Agencia | "notificación de brechas de datos" |
| `entrada-en-vigencia-ley-21719` | Satélite | Cuándo entra en vigencia la Ley 21.719 y qué hacer antes | "cuándo entra en vigencia ley 21.719" |
| `proteccion-datos-salud` | Rubro | Protección de datos en salud: Ley 21.719 para prestadores | "protección de datos pacientes", "ley 21719 salud" |
| `proteccion-datos-fintech` | Rubro | Protección de datos para fintech y servicios financieros | "protección de datos fintech / financiero" |
| `proteccion-datos-retail-ecommerce` | Rubro | Protección de datos en retail y e-commerce | "protección de datos e-commerce / retail" |
| `proteccion-datos-empresas-b2b` | Rubro | Protección de datos para empresas B2B y startups | "protección de datos empresas B2B" |

Los títulos y keywords son de trabajo; se afinan al redactar con datos de Search Console.

## 5. Plantilla de artículo

Estructura común (optimizada para ranking, extracción por AI Overviews y E-E-A-T):

1. **H1** con la keyword principal.
2. **Resumen "En breve"** (2-3 líneas arriba del cuerpo): respuesta directa, extraíble por IA.
3. **Índice (TOC)** para artículos largos.
4. **Cuerpo** en pasajes autocontenidos: H2/H3, definiciones claras, pasos numerados,
   referencias a artículos concretos de la Ley 21.719 y normas conexas (entidades locales).
   Reutilizar cuando aplique el contenido ya existente en `lib/legal/` (citations,
   breach-content) como base factual — manteniendo trazabilidad.
5. **Caja "Cómo lo resuelve KPC"** + **CTA a `/self-assessment`**.
6. **FAQ** (3-5 preguntas) al final → alimenta JSON-LD FAQPage.
7. **Firma de autoría E-E-A-T**: nombre y credencial del abogado especialista + fecha de
   revisión. Marca la diferencia que la IA no puede fabricar.

## 6. Requisitos técnicos (implementación del asistente)

- **Rutas:** `app/recursos/page.tsx` (índice con tarjetas) y páginas de artículo bajo
  `app/recursos/`. Contenido en **MDX** para editar texto sin tocar lógica.
- **Metadata por página:** `generateMetadata` con title, description, canonical
  (`/recursos/<slug>`), Open Graph y Twitter. Reutiliza `lib/site.ts`.
- **JSON-LD por artículo:** `Article` (con `author` Person + credencial, `datePublished`,
  `dateModified`), `FAQPage` (desde el FAQ del artículo) y `BreadcrumbList`.
- **Sitemap:** `app/sitemap.ts` se actualiza para incluir automáticamente `/recursos` y todas
  las páginas de recursos (derivadas del registro de artículos, no hardcodeadas).
- **Navegación:** enlace "Recursos" en `LandingNav` y en el footer.
- **Diseño:** coherente con el sistema de marca (Style Reference Attio; tipografías Inter /
  Newsreader); layout de lectura legible, tipografía de artículo, y la caja CTA reutilizable.
- **i18n:** textos de UI (no el cuerpo del artículo) vía next-intl, según disciplina del repo.

## 7. Plan de oleadas

- **Oleada 1 (MVP):** índice `/recursos` + pilar `ley-21719` + 3 satélites core
  (`multas-ley-21719`, `que-es-el-rat`, `entrada-en-vigencia-ley-21719`) + rubro **Salud**
  + andamiaje técnico (rutas MDX, metadata, JSON-LD, sitemap, nav/footer). ~6 páginas.
  Esta oleada es el alcance del primer plan de implementación; las oleadas 2 y 3 son
  incrementos posteriores, cada uno con su propio plan.
- **Oleada 2:** satélites restantes (consentimiento, ARCOP, datos sensibles, brechas) +
  rubros **Fintech** y **Retail/E-commerce**.
- **Oleada 3:** rubro **B2B/Startups** + pulido de enlazado interno y revisión de métricas.

Cada oleada: el asistente redacta → el abogado revisa/aprueba → se publica (deploy vía Git).

## 8. Medición

- **Search Console:** impresiones y clics por página (Rendimiento); enviar/monitorear sitemap.
- **Conversión:** clics desde cada artículo hacia `/self-assessment` (evento simple).
- **Revisión a las 4-6 semanas:** identificar qué páginas despegan y priorizar refuerzos ahí.
- Expectativa: resultados tangibles en **6-12 meses** (SEO orgánico en nicho legal).

## 9. Riesgos y mitigaciones

- **Exactitud legal:** todo artículo pasa revisión del abogado antes de publicar (gate).
- **Contenido genérico:** diferenciación vía E-E-A-T (autoría, datos propios, casos), no volumen.
- **Mantención:** contenido evergreen; revisar solo si cambia la ley o su reglamento.
- **Alcance:** las oleadas evitan comprometer los 4 rubros de una vez y saturar la revisión.
