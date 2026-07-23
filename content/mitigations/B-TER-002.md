---
title: Propuesta de mitigación — Transferencia internacional sin garantías
breach: B-TER-002
control: KPC-TER-002
---

# Transferencia internacional de datos sin garantías

**Empresa:** {{companyName}} · **RUT:** {{rut}}
**Preparado por:** KPC — Kromi Privacy Center · **Fecha:** {{date}}

Esta propuesta detalla cómo cerrar la brecha detectada en su diagnóstico, en
qué orden y con qué evidencia respaldar cada avance. Es una guía de trabajo:
los plazos y responsables se ajustan a la realidad de la empresa junto a su
consultor asignado.

## 1. El hallazgo, en concreto

El diagnóstico detectó que {{companyName}} tiene datos personales **alojados o
procesados fuera de Chile** —servicios de nube con servidores en el extranjero,
software de casa matriz, plataformas internacionales— **sin garantías
contractuales** que aseguren su protección y **sin informarlo** a los
titulares.

La Ley 21.719 regula esto en dos frentes. El Art. 15 exige que la
transferencia internacional se apoye en un **nivel adecuado de protección** en
el país de destino o en **garantías apropiadas** (cláusulas contractuales u
otros mecanismos que la ley reconozca). Y el Art. 14 ter letra h obliga a
**informar** en la política de tratamiento que hay datos que salen del país, a
qué país y con qué garantías. Casi toda pyme está en esta situación sin
saberlo: usar una nube de un proveedor extranjero ya es una transferencia
internacional.

> No se trata de dejar de usar servicios internacionales, sino de respaldarlos.
> Los grandes proveedores de nube ya ofrecen cláusulas de transferencia
> estándar; el problema es que casi nadie las incorpora ni las informa.

## 2. Meta de la mitigación

Al cerrar esta brecha, cada flujo de datos de {{companyName}} que sale de Chile
queda **respaldado por cláusulas de transferencia** y **declarado a los
titulares** en la política de tratamiento, con el país de destino y las
garantías adoptadas a la vista.

## 3. Plan de acción

### Acción 1 — Mapear los datos que salen del país

Identificar qué servicios almacenan o procesan datos **fuera de Chile** y en
qué país. Los sospechosos habituales en una pyme son los proveedores de nube:
por ejemplo **Amazon Web Services (AWS)**, **Google Cloud** o **Microsoft
Azure** —y las suites que corren sobre ellos, como Google Workspace o Microsoft
365—, cuya región de centro de datos hay que revisar en el panel de la cuenta.
Apoyarse en el Registro de Actividades de Tratamiento (RAT) y anotar el
hallazgo en una planilla simple:

- Nube de archivos y correo (revisar la región del centro de datos).
- Software de gestión o CRM con servidores en el extranjero.
- Reportes o respaldos enviados a una casa matriz fuera de Chile.

*Respaldo a conservar:* inventario de servicios con datos en el extranjero y su
país de destino.

### Acción 2 — Anexar cláusulas de transferencia internacional

Agregar a los contratos con esos proveedores las **cláusulas tipo de
transferencia internacional** de su portal, que garantizan un nivel de
protección adecuado y la colaboración del proveedor con los derechos del
titular. En la práctica hay varios caminos, según el proveedor: por ejemplo
**aceptar en línea** el adenda de protección de datos que ya publican los
grandes proveedores cloud (AWS, Google Cloud, Microsoft Azure), **firmar** el
anexo tipo del portal con firma electrónica (simple sobre el PDF o avanzada,
como DocuSign/HelloSign), o incorporarlo como cláusula al contrato de servicio.

*Respaldo a conservar:* cláusulas de transferencia firmadas o incorporadas al
contrato con cada proveedor extranjero.

### Acción 3 — Informar la transferencia

Declarar en la **política de tratamiento** que hay datos alojados en el
extranjero: el **país** de destino y las **garantías** adoptadas. Con esto se
cumple el deber de información del Art. 14 ter letra h y el titular sabe dónde
terminan sus datos.

*Respaldo a conservar:* sección de transferencias internacionales de la
política de tratamiento publicada.

## 4. Documentos tipo disponibles en su portal

- **Cláusulas de Transferencia Internacional** — base lista para anexar a los
  contratos con proveedores fuera de Chile.
- **Política de Privacidad / Tratamiento** — para incorporar la sección de
  transferencias internacionales.

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
