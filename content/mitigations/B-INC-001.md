---
title: Propuesta de mitigación — Registro de incidentes
breach: B-INC-001
control: KPC-INC-002
---

# Registro de incidentes de seguridad

**Empresa:** {{companyName}} · **RUT:** {{rut}}
**Preparado por:** KPC — Kromi Privacy Center · **Fecha:** {{date}}

Esta propuesta detalla cómo cerrar la brecha detectada en su diagnóstico, en
qué orden y con qué evidencia respaldar cada avance. Es una guía de trabajo:
los plazos y responsables se ajustan a la realidad de la empresa junto a su
consultor asignado.

## 1. El hallazgo, en concreto

El diagnóstico detectó que {{companyName}} **no lleva un registro de los
incidentes de seguridad** que ha tenido. Correos enviados al destinatario
equivocado, un notebook extraviado, un acceso indebido a una carpeta: si
ocurrieron, no quedaron documentados, y por lo tanto tampoco se evaluó si
alguno debía notificarse.

La Ley 21.719 (Art. 14 sexies) exige **llevar un registro de las
vulneraciones de seguridad** y, ante aquellas con riesgo razonable para las
personas, **notificar a la Agencia sin dilaciones indebidas**; si el incidente
afecta **datos sensibles, de menores de 14 años o financieros**, también a los
titulares. Sin registro, la empresa no puede acreditar que evaluó cada caso ni
demostrar diligencia, y un incidente antiguo mal manejado puede reaparecer más
tarde ya sin defensa posible.

> El registro no es burocracia: es la memoria de la empresa frente a la
> autoridad. Un incidente documentado y evaluado —aunque se haya decidido no
> notificar— demuestra que la empresa actuó con criterio; uno sin rastro deja
> a la organización sin nada que mostrar.

## 2. Meta de la mitigación

Al cerrar esta brecha, {{companyName}} tiene un **registro de incidentes vivo**
—con los casos históricos documentados y evaluados— y un procedimiento que
instruye registrar todo incidente futuro apenas se detecte, aunque parezca
menor.

## 3. Plan de acción

### Acción 1 — Abrir el registro de incidentes

Habilitar el **registro tipo** (parte del Plan de Respuesta a Incidentes en su
portal) y documentar los incidentes conocidos de los últimos años. El soporte
puede ser el que a la empresa le resulte sostenible: por ejemplo la **plantilla
del portal** en una planilla (Excel o Google Sheets) o en una herramienta de
gestión que ya usen (Notion, Trello). Lo importante es que sea único, con fecha
y de acceso restringido. Para cada incidente, dejar registrado:

- Qué pasó y cuándo se detectó.
- Qué **datos** y qué **titulares** se vieron afectados.
- Qué se hizo para contenerlo.
- Si se notificó o no, y por qué.

*Respaldo a conservar:* registro de incidentes con los casos históricos
documentados.

### Acción 2 — Regularizar incidentes pendientes

Evaluar, con apoyo de su consultor, si algún incidente pasado **exigía
notificar** a la Agencia o a los titulares —por su gravedad o por afectar
datos sensibles, de menores o financieros— y no se hizo. De ser así, notificar
a la Agencia **sin dilaciones indebidas** por el canal oficial que disponga y
dejar constancia de la **regularización** (la notificación tardía y su
justificación).

*Respaldo a conservar:* registro de la evaluación de cada incidente y, si
aplica, constancia de la notificación tardía.

### Acción 3 — Instaurar el registro continuo

Fijar por procedimiento que **todo incidente futuro se registra apenas se
detecta**, aunque parezca menor, a través de un **canal de aviso interno**
definido —por ejemplo un correo tipo `incidentes@{{companyName}}.cl` o un grupo
acordado del equipo— que alimenta el registro. Ese registro sostiene la
evaluación de riesgo y la decisión de notificar, y conecta con el Plan de
Respuesta a Incidentes.

*Respaldo a conservar:* procedimiento que instruye registrar cada incidente,
con el responsable del registro identificado.

## 4. Documentos tipo disponibles en su portal

- **Plan de Respuesta a Incidentes** — incluye la plantilla de registro de
  incidentes lista para usar.

## 5. Cómo dar por abordada esta brecha

Cuando su equipo haya ejecutado las tres acciones, marque la brecha como
**abordada** en el portal. Es un registro para su propio seguimiento: KPC
entrega el análisis y esta propuesta; la ejecución y el resguardo de la
evidencia quedan a cargo de su empresa. Conserve los respaldos indicados en
cada acción para su propio archivo y ante una eventual fiscalización.

---

*Documento preparado por KPC — Kromi Privacy Center como base estándar.
Su contenido es referencial y debe ajustarse a la operación real de la empresa
junto al consultor asignado.*
