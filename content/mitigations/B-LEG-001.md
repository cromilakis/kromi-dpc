---
title: Propuesta de mitigación — Marketing y consentimiento
breach: B-LEG-001
control: KPC-LIC-001
---

# Comunicaciones comerciales con consentimiento

**Empresa:** {{companyName}} · **RUT:** {{rut}}
**Preparado por:** KPC — Kromi Privacy Center · **Fecha:** {{date}}

Esta propuesta detalla cómo cerrar la brecha detectada en su diagnóstico sobre
el envío de comunicaciones comerciales, en qué orden hacerlo y con qué
evidencia respaldar cada avance. Es una guía de trabajo: los plazos y
responsables se ajustan a la realidad de la empresa junto a su consultor
asignado.

## 1. El hallazgo, en concreto

El diagnóstico detectó que {{companyName}} envía **comunicaciones comerciales**
—correos, WhatsApp, SMS— a una base de contactos que **no cuenta con
consentimiento acreditable** para ese fin. En una pyme esto suele originarse en
prácticas cotidianas: se guardan los correos de quienes compraron o cotizaron
y luego se les incorpora a campañas, o se compran/heredan listados de terceros.

Cuando la base de licitud es el consentimiento, este debe ser **libre,
informado, específico e inequívoco**, y la empresa debe poder demostrar que lo
obtuvo (Art. 12). Un consentimiento tácito, presunto o recolectado "para operar"
—no para marketing— no cumple ese estándar. Es una de las infracciones más
frecuentes y de las primeras que revisa un fiscalizador.

> No basta con que la persona no se haya quejado. Ante un reclamo, la carga de
> probar el consentimiento es de la empresa: sin registro de cuándo, cómo y
> para qué se autorizó, el tratamiento se tiene por no consentido.

A esto se suma el derecho de oposición: el titular puede exigir que se deje de
usar su dato para marketing directo, y la empresa debe cesar de inmediato
(Art. 8° letra b), en concordancia con el Art. 28 B de la Ley 19.496 sobre
publicidad no solicitada.

## 2. Meta de la mitigación

Al cerrar esta brecha, {{companyName}} enviará comunicaciones comerciales
**solo a quienes dieron un consentimiento libre, informado y específico**, ese
consentimiento quedará registrado y acreditable, y cada envío ofrecerá una
baja simple que se procesa sin demora.

## 3. Plan de acción

### Acción 1 — Depurar la base de marketing

Separar los contactos en dos grupos y detener los envíos al segundo hasta
regularizarlo:

| Grupo | Estado | Acción |
| --- | --- | --- |
| Con consentimiento acreditable | Habilitado | Se mantiene en campañas |
| Sin consentimiento o sin registro | Suspendido | No se le envía hasta recabar autorización |

Para el grupo suspendido puede enviarse **un único mensaje de re-permiso**
pidiendo que confirmen si desean seguir recibiendo comunicaciones; quien no
confirma, se retira de la base comercial.

*Respaldo a conservar:* base de marketing con la marca de origen del
consentimiento por contacto.

### Acción 2 — Implementar la captación de consentimiento

Adoptar el mecanismo de consentimiento en cada punto donde se captan datos.
Cómo hacerlo, con opciones reales para una pyme en Chile:

- **En el formulario web:** una **casilla de autorización NO pre-marcada**,
  separada de la aceptación de términos, con texto que indique la finalidad
  (envío de ofertas y novedades) y los canales. La casilla se agrega tanto en
  formularios propios (el gestor del sitio, un plugin de formularios) como en
  el formulario de suscripción que ofrece la propia plataforma de envío.
- **Con la plataforma de envío:** apoyarse en un servicio que gestione la
  suscripción y la **baja automática** de forma nativa —por ejemplo
  *Mailchimp*, *Brevo* (ex Sendinblue) o *ActiveCampaign*, o la chilena
  *Doppler*—, en lugar de enviar campañas masivas desde el correo común.
- **En puntos presenciales o telefónicos:** un texto de autorización que el
  titular aprueba explícitamente (por ejemplo una casilla en la ficha de
  ingreso en papel, o la confirmación verbal registrada en la llamada).
- **Registro del consentimiento:** dejar constancia de **fecha y canal** de
  cada autorización, por ejemplo en un campo del *CRM* (HubSpot, Zoho, el CRM
  del ERP que ya usen) o, si el volumen es bajo, en una **planilla de registro**
  con columna de fecha, canal y finalidad. Que el titular elija los canales
  (correo, WhatsApp, SMS).

*Respaldo a conservar:* formulario o texto de consentimiento en producción y
muestra del registro de un consentimiento capturado.

### Acción 3 — Habilitar la baja en cada envío

Incluir en **cada** correo o SMS un mecanismo de desuscripción visible y de un
solo paso, y procesarlo de inmediato retirando al contacto de futuras campañas.
Según el canal, por ejemplo: el **enlace "darse de baja"** que las plataformas
de envío (Mailchimp, Brevo, ActiveCampaign, Doppler) insertan y procesan
automáticamente; una **palabra clave de respuesta** ("responda BAJA") en SMS o
WhatsApp; o un correo de contacto para solicitar la baja cuando el volumen es
menor. Esto materializa el derecho de oposición (Art. 8° letra b).

*Respaldo a conservar:* captura de un envío mostrando la opción de baja.

## 4. Documentos tipo disponibles en su portal

- **Consentimiento para Comunicaciones Comerciales** — texto y casilla listos
  para incorporar a formularios y puntos de contacto.

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
