---
title: Propuesta de mitigación — Finalidad del tratamiento
breach: B-LEG-003
control: KPC-FIN-001
---

# Uso de los datos conforme a la finalidad informada

**Empresa:** {{companyName}} · **RUT:** {{rut}}
**Preparado por:** KPC — Kromi Privacy Center · **Fecha:** {{date}}

Esta propuesta detalla cómo cerrar la brecha detectada en su diagnóstico sobre
el uso de los datos para fines distintos de los informados, en qué orden
hacerlo y con qué evidencia respaldar cada avance. Es una guía de trabajo: los
plazos y responsables se ajustan a la realidad de la empresa junto a su
consultor asignado.

## 1. El hallazgo, en concreto

El diagnóstico detectó que {{companyName}} usa datos para **fines distintos de
los que informó al recolectarlos**. El caso típico en una pyme: teléfonos y
correos que el cliente entregó para emitir la boleta, coordinar un despacho o
dar soporte se reutilizan después para enviar publicidad, sin que esa finalidad
comercial se hubiera declarado ni consentido.

El **principio de finalidad** exige que los datos se recolecten para fines
determinados, explícitos y lícitos, y que no se traten luego para fines
incompatibles con los informados al titular (Art. 3° letra b). Un cambio de
finalidad —de "operar la venta" a "hacer marketing"— **requiere una base de
licitud propia**, normalmente un nuevo consentimiento. Es sancionable aunque los
datos se hayan obtenido lícitamente.

> El dato que el cliente dio para que le llegara su pedido no es, sin más, un
> dato para venderle otras cosas. La legitimidad de la recolección no arrastra
> automáticamente la legitimidad de todos los usos posteriores.

## 2. Meta de la mitigación

Al cerrar esta brecha, cada dato de {{companyName}} se usará **solo para la
finalidad que se informó al recolectarlo**; las bases operativas dejarán de
alimentar el marketing sin una base de licitud propia, y cada finalidad quedará
declarada al titular.

## 3. Plan de acción

### Acción 1 — Separar las bases por finalidad

Distinguir la **base operativa** (boletas, despacho, soporte, garantías) de la
**base de marketing**. Cómo materializar la separación, según el sistema que use
la empresa:

- **Con una marca de finalidad en el CRM/ERP:** un campo **"autoriza marketing:
  sí/no"** por registro —por ejemplo un campo personalizado en *HubSpot*,
  *Zoho CRM* o el módulo de clientes del ERP (Defontana, Nubox, Bsale)—, de
  modo que la base operativa siga completa pero solo se envíe a quien marca "sí".
- **Con dos bases físicamente separadas:** mantener la base operativa en el
  sistema de gestión y una **lista de marketing aparte** en la plataforma de
  envío (Mailchimp, Brevo, ActiveCampaign, Doppler), a la que solo entra quien
  consintió.
- **Con una planilla, si el volumen es bajo:** una columna de consentimiento de
  marketing (fecha y canal) que filtre a quién se puede escribir.

Lo esencial: no volcar automáticamente al marketing los contactos recolectados
para operar.

*Respaldo a conservar:* evidencia de la separación (dos bases o una marca de
finalidad por registro).

### Acción 2 — Usar en marketing solo lo consentido

Enviar comunicaciones comerciales **únicamente** a los contactos con
consentimiento específico para ese fin. Antes de cada campaña, cruzar la lista
de envío contra los consentimientos registrados y excluir a quien no lo tenga.
En la práctica, por ejemplo: sincronizar hacia la plataforma de envío solo los
contactos con la marca "autoriza marketing: sí", o filtrar la planilla por esa
columna antes de armar el envío (ver la mitigación de marketing, B-LEG-001).

*Respaldo a conservar:* cruce entre la base de marketing y los consentimientos.

### Acción 3 — Declarar cada finalidad

Dejar explícitas las finalidades **en dos lugares**:

1. En la **Política de Tratamiento** (qué datos se usan y para qué).
2. En el **punto de recolección** (formulario web, ficha de ingreso en papel,
   contrato), con un aviso breve al momento de pedir el dato (Art. 14 bis) —por
   ejemplo una línea bajo el formulario o una casilla separada para el uso de
   marketing.

Así el titular sabe, desde el primer contacto, a qué se destinan sus datos.

*Respaldo a conservar:* sección de finalidades de la política y del formulario.

## 4. Documentos tipo disponibles en su portal

- **Consentimiento para Comunicaciones Comerciales** — para habilitar el uso de
  marketing de forma separada.
- **Política de Tratamiento de Datos Personales** — donde se declaran todas las
  finalidades.

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
