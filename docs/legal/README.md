# Material de contexto legal — Protección de datos (Ley 21.719)

Esta carpeta contiene el **toolkit legal de referencia** sobre protección de datos personales en Chile (Ley 21.719, vigencia 1 dic 2026). Sirve como **contexto** para el trabajo sobre la aplicación de autodiagnóstico y cumplimiento de `kromi-dpc`: análisis de la ley, ecosistema normativo, encuesta de diagnóstico, catálogo de brechas y mitigaciones, modelo de informe y formatos tipo.

> **Origen:** este material provenía del vault de Obsidian (`kromi-obsidian/proteccion-datos-personales/`). Se consolidó dentro del repo para que la referencia legal viva junto al código que la implementa.
>
> **Alcance:** es material de contexto/referencia. No es contenido renderizado en la app ni código. La aplicación, la encuesta y el motor viven en `app/` y `lib/legal/`.

## Contenido

| Archivo | Descripción |
|---|---|
| `00 - Indice y Guia de Uso.md` | Índice general del toolkit y guía de uso |
| `01 - Analisis Ley 21.719.md` | Análisis jurídico integral (principios, derechos, obligaciones, sanciones) |
| `02 - Ecosistema Legal de Proteccion de Datos.md` | Mapa de leyes complementarias (9 sectores) |
| `03 - Encuesta de Diagnostico de Cumplimiento.md` | 107 preguntas en 10 dimensiones |
| `04 - Identificacion de Brechas y Mitigaciones.md` | Catálogo de brechas + plan de acción |
| `05 - Modelo de Informe Final de Diagnostico.md` | Plantilla de informe ejecutivo |
| `formatos/` | 6 formatos tipo (acta, catálogo, cláusula de encargo, formulario ARCO, matriz, planilla de brechas) |
| `anexos/` | Texto completo de la Ley 21.719 (BCN) + mapa de artículos corregido |

## Validación de referencias legales

Las referencias de artículos fueron verificadas contra el texto promulgado en la BCN (`idNorma=1209272`). El mapa completo de equivalencias entre las referencias originales del toolkit y los artículos reales está en:

- **`anexos/Mapa de Articulos - Corregido.md`**

Este mapa es la fuente autoritativa para cualquier cita de artículo usada en el motor de diagnóstico (`lib/legal/`).
