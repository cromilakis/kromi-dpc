---
title: Propuesta de mitigación — Sitio web, aviso de recolección y cookies
breach: B-WEB-001
control: KPC-TRA-001
---

# Sitio web, aviso de recolección y cookies

**Empresa:** {{companyName}} · **RUT:** {{rut}}
**Preparado por:** KPC — Kromi Privacy Center · **Fecha:** {{date}}

Esta propuesta detalla cómo cerrar la brecha de transparencia web detectada en
su diagnóstico, en qué orden y con qué evidencia respaldar cada avance. Es una
guía de trabajo: los plazos y responsables se ajustan a la realidad de la
empresa junto a su consultor asignado.

## 1. El hallazgo, en concreto

El diagnóstico detectó que el **sitio web de {{companyName}} recolecta datos**
—formularios de contacto, cotización o suscripción— **sin política de
privacidad accesible, sin informar la finalidad** en el punto de recolección y
sin gestionar el consentimiento de las cookies. Es un incumplimiento visible
desde el primer contacto con el titular y de los más fáciles de detectar: basta
con abrir la página.

La Ley 21.719 impone el **deber de información** (Art. 14 y Art. 14 ter):
informar de forma clara —típicamente en una política de tratamiento
accesible— quién trata los datos, para qué y cómo ejercer los derechos, al
momento de recolectarlos. En el entorno web esto se traduce en una política
enlazada, un aviso de finalidad junto a cada formulario y un manejo de cookies
que permita elegir.

> Las cookies estrictamente necesarias para que el sitio funcione no requieren
> consentimiento, pero las de **analítica y publicidad de terceros sí**: deben
> poder rechazarse antes de instalarse. Un banner que solo dice "aceptar" no
> cumple; debe ofrecer una opción real de rechazo.

## 2. Meta de la mitigación

Al cerrar esta brecha, el sitio de {{companyName}} tendrá su **política de
tratamiento publicada y enlazada**, un **aviso de finalidad** en cada
formulario que pide datos y un **banner de cookies** que permite aceptar o
rechazar las de terceros antes de instalarlas.

## 3. Plan de acción

### Acción 1 — Publicar y enlazar la política

Publicar la política de tratamiento como una página del sitio y enlazarla donde
el visitante la encuentre. La forma concreta depende de la plataforma en que
esté hecho el sitio:

- **WordPress:** crear una página "Política de privacidad" y agregarla al menú
  del pie mediante *Apariencia → Menús*.
- **Wix / Squarespace:** agregar una página nueva y enlazarla desde el footer
  del editor.
- **Shopify:** usar la sección *Tienda → Políticas* (o una página del tema) y
  enlazarla en el pie.

En todos los casos, dejar:

- Un enlace permanente en el **pie de página** de todo el sitio.
- Un enlace **junto a cada formulario** que pide datos (contacto, cotización,
  suscripción, postulación).

*Respaldo a conservar:* URL de la política y captura del enlace junto a un
formulario.

### Acción 2 — Informar en el punto de recolección

Agregar un **aviso breve de finalidad** justo antes de enviar cada formulario,
para cumplir el deber de informar al recolectar. Un texto simple es suficiente:

> "Usaremos sus datos para responder su consulta / gestionar su cotización.
> Puede conocer el detalle y ejercer sus derechos en nuestra Política de
> Tratamiento."

Se agrega como texto de ayuda del propio formulario —el nativo de la plataforma
(*WordPress*, *Wix*, *Shopify*) o el de un servicio como *Google Forms* /
*Microsoft Forms*— o como una casilla de aceptación con enlace a la política. El
aviso debe estar **visible antes del envío**, no en una página aparte que haya
que ir a buscar.

*Respaldo a conservar:* captura del formulario con el aviso de finalidad.

### Acción 3 — Gestionar cookies con consentimiento

Implementar un **banner de cookies** que distinga las categorías y permita
elegir:

| Tipo de cookie | Tratamiento |
| --- | --- |
| Estrictamente necesarias | Se instalan sin consentimiento (permiten que el sitio funcione) |
| Analítica | Requieren aceptación previa |
| Publicidad / terceros | Requieren aceptación previa; se pueden rechazar |

Salvo que el sitio solo cargue cookies propias necesarias, conviene apoyarse en
una herramienta de gestión de consentimiento que instale y bloquee las cookies
según la elección del visitante —por ejemplo, *Cookiebot*, *Osano* o, en
*WordPress*, el plugin *Complianz*—. El banner debe permitir **rechazar** las
cookies no necesarias antes de que se instalen, y guardar la preferencia del
visitante.

*Respaldo a conservar:* captura del banner de cookies con opción de rechazo.

## 4. Documentos tipo disponibles en su portal

- **Política de Tratamiento de Datos Personales** — la política que se publica
  y enlaza en el sitio, con los contenidos que la ley exige informar.

## 5. Cómo dar por abordada esta brecha

Cuando su equipo haya ejecutado las tres acciones, marque la brecha como
**abordada** en el portal. Es un registro para su propio seguimiento: KPC
entrega el análisis y esta propuesta; la ejecución y el resguardo de los
respaldos quedan a cargo de su empresa. No se suben evidencias al portal ni las
valida el consultor. Conserve los respaldos indicados en cada acción para su
propio archivo y ante una eventual fiscalización.

---

*Documento preparado por KPC — Kromi Privacy Center como base estándar.
Su contenido es referencial y debe ajustarse a la operación real de la empresa
junto al consultor asignado.*
