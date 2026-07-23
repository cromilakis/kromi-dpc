---
title: Propuesta de mitigación — Seguridad de la información
breach: B-SEG-001
control: KPC-SEG-001
---

# Seguridad de la información y control de accesos

**Empresa:** {{companyName}} · **RUT:** {{rut}}
**Preparado por:** KPC — Kromi Privacy Center · **Fecha:** {{date}}

Esta propuesta detalla cómo cerrar la brecha de seguridad detectada en su
diagnóstico, en qué orden y con qué evidencia respaldar cada avance. Es una
guía de trabajo: los plazos y responsables se ajustan a la realidad de la
empresa junto a su consultor asignado.

## 1. El hallazgo, en concreto

El diagnóstico detectó que datos personales de la empresa se almacenan en
**planillas y documentos sin control** —Excel en computadores locales,
carpetas compartidas sin permisos, o cuentas de nube personales—, sin cifrado,
sin respaldo confiable y sin registro de quién accede.

La Ley 21.719 (Art. 14 quinquies) exige aplicar **medidas de seguridad
técnicas y organizativas apropiadas al riesgo** del tratamiento. La ausencia
de estas medidas es, en sí misma, una infracción —no solo un problema
técnico— y agrava cualquier incidente que ocurra: una filtración desde una
planilla sin control es más probable, más difícil de contener y deja a la
empresa sin evidencia de haber actuado con diligencia.

> El nivel de seguridad exigido es mayor mientras más sensibles o más
> voluminosos sean los datos. Una base con datos de salud, financieros o de
> menores exige un estándar más alto que un listado de contactos comerciales.

## 2. Meta de la mitigación

Al cerrar esta brecha, los datos personales de {{companyName}} dejan de vivir
en archivos sueltos y pasan a un entorno con **acceso restringido por
función, respaldo probado y trazabilidad**, respaldado por una política de
seguridad que el equipo conoce y aplica.

## 3. Plan de acción

### Acción 1 — Consolidar los datos en un repositorio con acceso controlado

Migrar las planillas y documentos dispersos a un único repositorio con
permisos por rol. Opciones concretas para una pyme en Chile, según el caso:

- **Si ya usan una suite de correo/oficina:** unidad compartida corporativa
  con permisos por persona — *Google Workspace* (Unidades compartidas de
  Drive) o *Microsoft 365 Business* (SharePoint / OneDrive corporativo).
- **Si los datos son sobre todo de clientes/ventas:** el módulo de un
  *CRM/ERP* que centralice y controle el acceso — por ejemplo *Defontana*,
  *Nubox*, *Bsale* o *Softland* (gestión chilena), o *HubSpot* / *Zoho CRM*.
- **Si hay fichas clínicas u otro dato sensible:** un sistema especializado
  del rubro con control por perfil (evitar Excel/Drive para esos datos).

Una vez migrados, **eliminar las copias sueltas** de escritorios, correos y
pendrives.

*Respaldo a conservar:* captura del repositorio mostrando la estructura de
carpetas y la configuración de permisos.

### Acción 2 — Cuentas individuales con mínimo privilegio

Reemplazar los usuarios compartidos por **una cuenta por persona**. Cada
usuario accede solo a lo que su función necesita:

| Rol | Acceso típico |
| --- | --- |
| Administración / finanzas | Datos de facturación, remuneraciones |
| Ventas / atención | Datos de contacto de clientes |
| Gerencia | Vista general, sin edición operativa |

Activar **verificación en dos pasos** en todas las cuentas que lo permitan,
con una app de autenticación como *Google Authenticator*, *Microsoft
Authenticator* o *Authy*.

*Respaldo a conservar:* listado de usuarios con su nivel de acceso y captura
de la verificación en dos pasos activa.

### Acción 3 — Respaldo y trazabilidad

- Configurar **respaldos periódicos** (idealmente diarios) y probar al menos
  una vez que se puede restaurar. La propia nube corporativa ya lo ofrece
  (historial de versiones de Google Workspace o Microsoft 365); como respaldo
  adicional, un servicio como *Backblaze* o un disco cifrado externo.
- Cifrar los equipos que acceden a los datos: *BitLocker* (Windows Pro) o
  *FileVault* (Mac), ambos incluidos en el sistema operativo.
- Donde el sistema lo permita, activar el **registro de accesos** (quién
  consultó o modificó cada dato).

*Respaldo a conservar:* configuración del respaldo (frecuencia) y muestra de
la bitácora de accesos.

### Acción 4 — Política de seguridad y capacitación

Formalizar las reglas mínimas con la **Política de Seguridad de la Información
y Control de Accesos** (disponible como documento tipo en su portal):
contraseñas robustas, prohibición de cuentas de nube personales para datos de
la empresa, escritorio limpio y revocación de accesos al término de funciones.
Capacitar al equipo en su aplicación.

*Respaldo a conservar:* política firmada y registro de la capacitación.

## 4. Documentos tipo disponibles en su portal

- **Política de Seguridad de la Información y Control de Accesos** — base
  lista para personalizar y firmar.

## 5. Cómo dar por abordada esta brecha

Cuando su equipo haya ejecutado las cuatro acciones, marque la brecha como
**abordada** en el portal. Es un registro para su propio seguimiento: KPC
entrega el análisis y esta propuesta; la ejecución y el resguardo de la
evidencia quedan a cargo de su empresa. Conserve los respaldos indicados en
cada acción para su propio archivo y ante una eventual fiscalización.

---

*Documento preparado por KPC — Kromi Privacy Center como base estándar.
Su contenido es referencial y debe ajustarse a la operación real de la empresa
junto al consultor asignado.*
