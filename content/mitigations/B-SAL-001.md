---
title: Propuesta de mitigación — Datos de salud
breach: B-SAL-001
control: KPC-SEN-001
---

# Fichas y datos de salud

**Empresa:** {{companyName}} · **RUT:** {{rut}}
**Preparado por:** KPC — Kromi Privacy Center · **Fecha:** {{date}}

Esta propuesta detalla cómo cerrar la brecha detectada en su diagnóstico sobre
el tratamiento de fichas y datos de salud, en qué orden hacerlo y con qué
evidencia respaldar cada avance. Es una guía de trabajo: los plazos y
responsables se ajustan a la realidad de la empresa junto a su consultor
asignado.

## 1. El hallazgo, en concreto

El diagnóstico detectó que {{companyName}} maneja **fichas y datos de salud**
—historial clínico, diagnósticos, exámenes, tratamientos— **sin acceso
restringido al equipo tratante, sin registro de accesos o sin resguardo del
plazo de conservación**. Aplica a consultas, centros médicos, dentales,
kinesiología, psicología, ópticas y todo prestador de salud, por pequeño que
sea.

Los datos de salud son **sensibles** y reciben protección reforzada: su
tratamiento exige base de licitud calificada —consentimiento explícito u otra
causal específica— y medidas de seguridad acordes a su sensibilidad (Arts. 16 y
16 bis). Además, la **ficha clínica es información reservada**: solo accede el
equipo tratante y quienes la ley autoriza (Ley 20.584, Arts. 12 a 15), y debe
conservarse por un plazo mínimo legal.

> La confidencialidad de la ficha no es una buena práctica optativa: la Ley
> 20.584 la impone, y el Decreto 41 del MINSAL fija la conservación mínima en
> **15 años desde la última atención**, con acceso por perfiles y registro de
> quién la consulta.

El tratamiento indebido de datos de salud conlleva de las sanciones más altas y
un daño reputacional serio para un prestador.

## 2. Meta de la mitigación

Al cerrar esta brecha, las fichas y datos de salud de {{companyName}} se
tratarán con **acceso restringido al equipo tratante, registro de accesos y
conservación por el plazo legal**, con el consentimiento correspondiente donde
aplique.

## 3. Plan de acción

### Acción 1 — Restringir el acceso a la ficha clínica

Limitar el acceso a las fichas **solo al personal que atiende directamente al
paciente**. Retirar accesos generales, cuentas compartidas y planillas o
carpetas donde cualquiera del staff pueda ver el historial. Levantar una matriz
de accesos por rol:

| Rol | Acceso a fichas |
| --- | --- |
| Profesional tratante | Ficha completa de sus pacientes |
| Recepción / agenda | Datos de contacto y citación, sin historial clínico |
| Administración | Datos de facturación, sin historial clínico |

*Respaldo a conservar:* matriz de accesos a fichas por rol.

### Acción 2 — Migrar a un sistema con perfiles y trazabilidad

Llevar los registros clínicos a un sistema que **controle el acceso por perfil**
y **registre quién consulta cada ficha** (Ley 20.584, Arts. 12 a 15), dejando de
usar Excel, WhatsApp o cuadernos para el historial clínico. Opciones concretas
de **ficha clínica electrónica** usadas por prestadores en Chile, según el
tamaño y el rubro:

- **Sistemas clínicos con control por perfil y registro de accesos:** por
  ejemplo *Rayen*, *Medilink* o *Nubimed*, que gestionan la ficha con perfiles
  de acceso y bitácora de quién la consulta.
- **Para el ámbito clínico con agenda integrada:** *Agendapro* u otro sistema de
  gestión del rubro que sume ficha, agenda y control de acceso por usuario.

Elegir el sistema por el tamaño y la especialidad del prestador; lo esencial es
que tenga **perfiles de acceso y registro de accesos**.

*Respaldo a conservar:* captura del sistema con control por perfil y registro de
accesos.

### Acción 3 — Asegurar conservación y consentimiento

Dos frentes que cierran el ciclo del dato de salud:

- **Conservación:** guardar las fichas por el plazo legal —**15 años desde la
  última atención** (Dto. 41/2013 MINSAL)— y no eliminarlas antes. El propio
  sistema de ficha electrónica normalmente permite fijar esa retención; si aún
  hay fichas en papel, resguardarlas en archivo con acceso restringido por el
  mismo plazo.
- **Consentimiento:** recabar el consentimiento expreso para el tratamiento de
  datos de salud donde corresponda (Arts. 16 y 16 bis), con el formulario tipo
  —firmado a mano y digitalizado, o firmado en PDF/plataforma de firma
  electrónica— y asociado al paciente.

*Respaldo a conservar:* política de conservación de fichas y consentimientos de
datos de salud.

## 4. Documentos tipo disponibles en su portal

- **Política de Seguridad de la Información y Control de Accesos** — para
  formalizar el acceso restringido y la trazabilidad de las fichas.
- **Consentimiento Expreso para el Tratamiento de Datos Sensibles** — base del
  consentimiento para datos de salud.

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
