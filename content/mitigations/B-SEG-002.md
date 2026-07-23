---
title: Propuesta de mitigación — Datos en nube personal
breach: B-SEG-002
control: KPC-SEG-002
---

# Datos personales alojados en cuentas de nube personales

**Empresa:** {{companyName}} · **RUT:** {{rut}}
**Preparado por:** KPC — Kromi Privacy Center · **Fecha:** {{date}}

Esta propuesta detalla cómo cerrar la brecha detectada en su diagnóstico, en
qué orden y con qué evidencia respaldar cada avance. Es una guía de trabajo:
los plazos y responsables se ajustan a la realidad de la empresa junto a su
consultor asignado.

## 1. El hallazgo, en concreto

El diagnóstico detectó que datos personales de {{companyName}} —bases de
clientes, planillas de remuneraciones, documentos con RUT y contactos— se
almacenan en **cuentas personales de nube** (Gmail, Hotmail, Drive o Dropbox a
nombre de un trabajador), no en cuentas empresariales bajo control de la
organización.

La Ley 21.719 (Art. 14 quinquies) exige aplicar **medidas de seguridad
técnicas y organizativas apropiadas al riesgo**. Una cuenta personal rompe
esa exigencia por diseño: la empresa no puede administrar quién accede, no
puede revocar el acceso cuando la persona se va, no tiene bitácora de quién
vio o descargó qué, y si el trabajador deja la empresa —o hay un conflicto—
los datos de sus clientes quedan retenidos en un buzón que la organización no
controla.

> La cuenta personal mezcla lo laboral con lo privado del trabajador: un
> mismo inicio de sesión da acceso a los datos de la empresa y al correo
> personal de la persona. Ante un incidente, no hay forma de aislar ni
> auditar lo que ocurrió con los datos de la empresa.

## 2. Meta de la mitigación

Al cerrar esta brecha, ningún dato personal de {{companyName}} vive en una
cuenta personal. Todo pasa a una **cuenta empresarial con administración
central**, donde la empresa controla accesos, revoca usuarios y aplica
políticas comunes, respaldado por la prohibición expresa de la nube personal
en su política de seguridad.

## 3. Plan de acción

### Acción 1 — Migrar a cuentas empresariales

Contratar una cuenta empresarial y mover a ella todos los archivos con datos
personales que hoy viven en cuentas personales. Opciones concretas para una
pyme en Chile, según lo que ya usen: por ejemplo **Google Workspace** (Business
Starter/Standard) o **Microsoft 365 Business** —ambas dan dominio propio,
administración central y cuenta por persona—. Lo esencial es dejar atrás las
cuentas **Gmail, Hotmail o Outlook personales** y los Drive/Dropbox a nombre de
un trabajador.

- Crear el dominio corporativo (por ejemplo `nombre@{{companyName}}.cl`) y una
  cuenta por persona.
- Trasladar carpetas y correos con datos de clientes o trabajadores desde las
  cuentas personales al espacio compartido de la empresa.
- Confirmar que la administración de la cuenta empresarial permite **revocar
  accesos** y ver **quién accede** a cada carpeta.

*Respaldo a conservar:* confirmación de la cuenta empresarial activa (panel de
administración) y captura de la migración de los archivos al espacio
corporativo.

### Acción 2 — Endurecer el acceso

- Activar **verificación en dos pasos** en todas las cuentas empresariales,
  con una app de autenticación —por ejemplo *Google Authenticator*, *Microsoft
  Authenticator* o *Authy*— antes que el código por SMS.
- Habilitar el **cifrado** de los dispositivos (notebooks, teléfonos) que
  acceden a los datos, para que la pérdida o robo de un equipo no exponga la
  información: por ejemplo *BitLocker* (Windows Pro) o *FileVault* (Mac), ambos
  incluidos en el sistema operativo, y el cifrado nativo del teléfono.

*Respaldo a conservar:* captura de la verificación en dos pasos activa y del
cifrado del dispositivo (BitLocker en Windows, FileVault en Mac, o el
equivalente del teléfono).

### Acción 3 — Prohibir la nube personal por política

Dejar por escrito en la **Política de Seguridad de la Información y Control de
Accesos** (documento tipo en su portal) que está prohibido usar cuentas
personales de nube o correo para datos de la empresa. Luego, **retirar los
archivos** que aún queden en cuentas personales y confirmar su eliminación.

*Respaldo a conservar:* cláusula de la política que prohíbe la nube personal y
confirmación de que las cuentas personales quedaron sin datos de la empresa.

## 4. Documentos tipo disponibles en su portal

- **Política de Seguridad de la Información y Control de Accesos** — base
  lista para personalizar y firmar, con la cláusula de prohibición de nube
  personal incluida.

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
