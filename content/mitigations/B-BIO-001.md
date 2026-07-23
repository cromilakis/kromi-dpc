---
title: Propuesta de mitigación — Datos biométricos
breach: B-BIO-001
control: KPC-SEN-001
---

# Datos biométricos: huella, rostro o voz para asistencia y acceso

**Empresa:** {{companyName}} · **RUT:** {{rut}}
**Preparado por:** KPC — Kromi Privacy Center · **Fecha:** {{date}}

Esta propuesta detalla cómo cerrar la brecha detectada en el uso de datos
biométricos, en qué orden y con qué evidencia respaldar cada avance. Es una
guía de trabajo: los plazos y responsables se ajustan a la realidad de la
empresa junto a su consultor asignado.

## 1. El hallazgo, en concreto

El diagnóstico detectó que la empresa usa **datos biométricos** —huella
dactilar, reconocimiento facial o de voz— para controlar la asistencia o el
acceso, sin haber informado a los trabajadores por escrito el detalle del
tratamiento, sin ofrecer una alternativa a quien no quiera entregar su
biometría y, en muchos casos, guardando la imagen o la muestra en lugar de una
plantilla cifrada.

La Ley 21.719 (**Art. 16 ter**) trata los datos biométricos que identifican a
una persona como **datos sensibles**. Exige informar al titular el sistema
usado, la finalidad y el plazo de conservación, y que el consentimiento sea
**libre**. En una relación laboral, donde el trabajador está en posición de
subordinación, la Dirección del Trabajo (dictámenes DT) ha sido clara: para que
el consentimiento sea realmente libre, debe existir una alternativa sin
biometría, sin consecuencias para quien la elija.

> El riesgo propio de la biometría es que es irreemplazable: una contraseña
> filtrada se cambia; una huella o un rostro filtrados, no. Por eso el estándar
> de resguardo es más alto y la eliminación al término de la relación es
> obligatoria, no opcional.

## 2. Meta de la mitigación

Al cerrar esta brecha, el uso de biometría en {{companyName}} queda
**informado por escrito, es voluntario en los hechos** (con una vía
alternativa real) y el dato se guarda como **plantilla cifrada e irreversible**
que se elimina cuando la persona deja la empresa.

## 3. Plan de acción

### Acción 1 — Informar el tratamiento biométrico

Entregar a cada trabajador un **anexo de contrato firmado** que detalle, sin
tecnicismos:

- **Qué sistema** se usa (marca/tipo de lector de huella o cámara facial —por
  ejemplo un reloj de huella *Geovictoria* o *ZKTeco*, o el marcaje facial de
  una app de control horario como *Talana* o *BUK*).
- **Para qué** exactamente (control de asistencia, acceso a bodega, etc.).
- **Qué se guarda**: una plantilla matemática cifrada, no la imagen de la
  huella ni la fotografía del rostro.
- **Por cuánto tiempo** se conserva y cuándo se elimina.

Concrételo con el medio que ya use la empresa: por ejemplo un anexo firmado en
papel adjunto al contrato, la firma electrónica del propio módulo de RRHH
(*Talana*, *BUK*, *Rextie*) o un anexo digital firmado en *DocuSign* /
*FirmaVirtual*. No basta un aviso general en un mural.

*Respaldo a conservar:* anexos de tratamiento biométrico firmados por los
trabajadores.

### Acción 2 — Ofrecer una alternativa no biométrica

Habilitar una opción de marcaje o acceso **sin biometría** para quien no
consienta, sin que esa elección tenga consecuencias en su evaluación, turnos o
remuneración. Alternativas concretas según el sistema instalado —por ejemplo
**tarjeta de proximidad o llavero RFID**, **marcaje por PIN o clave** en el
mismo reloj, **marcaje web/app con clave personal** (disponible en *Geovictoria*,
*Talana* o *BUK*) o **libro/registro manual supervisado** para equipos chicos.

| Vía de marcaje | Uso |
| --- | --- |
| Biometría (huella / rostro) | Voluntaria, para quien consiente |
| Tarjeta, PIN o marcaje web | Alternativa equivalente, sin costo para el trabajador |

*Respaldo a conservar:* constancia de la alternativa disponible y de quiénes la
usan.

### Acción 3 — Cifrar y eliminar al término

- Configurar el sistema para almacenar solo **plantillas cifradas** (hash
  irreversible), nunca la imagen original. La mayoría de los relojes
  (*Geovictoria*, *ZKTeco*) y de las plataformas de RRHH (*Talana*, *BUK*)
  guardan una plantilla y no la imagen: verifíquelo en la configuración del
  equipo o pídalo por escrito al proveedor. Si el equipo actual guarda
  imágenes, cambiar el modo de operación o reemplazarlo.
- Definir un **procedimiento de eliminación al egreso**: cuando una persona
  deja la empresa, su plantilla biométrica se borra del sistema y de cualquier
  respaldo, dejando constancia —por ejemplo eliminando al trabajador en la
  consola del reloj/plataforma y registrándolo en el finiquito o en una
  planilla de bajas.

*Respaldo a conservar:* descripción del cifrado aplicado y del procedimiento de
eliminación al egreso, con la constancia de al menos una baja procesada.

## 4. Documentos tipo disponibles en su portal

- **Anexo de Tratamiento de Datos Biométricos (Trabajadores)** — texto listo
  para personalizar, entregar y firmar con cada persona.

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
