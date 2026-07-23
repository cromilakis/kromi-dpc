---
title: Propuesta de mitigación — Videovigilancia
breach: B-CCT-001
control: KPC-SEG-001
---

# Videovigilancia: cámaras, señalética y control de grabaciones

**Empresa:** {{companyName}} · **RUT:** {{rut}}
**Preparado por:** KPC — Kromi Privacy Center · **Fecha:** {{date}}

Esta propuesta detalla cómo cerrar la brecha detectada en el uso de cámaras de
videovigilancia, en qué orden y con qué evidencia respaldar cada avance. Es una
guía de trabajo: los plazos y responsables se ajustan a la realidad de la
empresa junto a su consultor asignado.

## 1. El hallazgo, en concreto

El diagnóstico detectó que la empresa opera **cámaras de videovigilancia** sin
señalética que advierta su existencia, o con cámaras que enfocan espacios
privados, o sin un límite definido para conservar las grabaciones ni control de
quién las mira.

Las imágenes captadas por una cámara son **datos personales**: identifican a
trabajadores y clientes. La Ley de Seguridad Privada (**DFL 3/2025**, texto
refundido) regula la videovigilancia privada y exige avisar su existencia,
perseguir una finalidad legítima y conservar las grabaciones por un tiempo
acotado. Además, grabar espacios privados puede constituir el delito del
**Art. 161-A del Código Penal** (captar imágenes en recintos particulares sin
consentimiento), y en el ámbito laboral los dictámenes de la Dirección del
Trabajo exigen que toda vigilancia sea general, proporcional e informada.

> Una cámara apuntando a un baño, vestidor o comedor no se corrige con un
> cartel: debe reorientarse o retirarse. No hay finalidad de seguridad que
> justifique vigilar esos espacios.

## 2. Meta de la mitigación

Al cerrar esta brecha, la videovigilancia de {{companyName}} queda
**señalizada, acotada a zonas legítimas** (nunca espacios privados) y con
**grabaciones conservadas por un plazo definido y accesibles solo a quien
corresponde**.

## 3. Plan de acción

### Acción 1 — Señalizar las zonas con cámaras

Instalar el cartel de aviso en cada acceso y en cada zona vigilada. El cartel
debe informar, de forma visible antes de entrar:

- Que el recinto cuenta con **cámaras de videovigilancia**.
- La **finalidad** (por ejemplo, seguridad de las personas y los bienes).
- Quién es el **responsable** y a quién dirigirse por consultas.

Concrételo con el medio a mano: por ejemplo mandar a imprimir la **señalética
adhesiva o de PVC** en una imprenta local con el texto del cartel tipo del
portal, imprimir en oficina el aviso en tamaño carta/A4 plastificado, o
encargar letreros en un proveedor de señalización. Ubíquelos en la entrada y en
cada área con cámara.

*Respaldo a conservar:* fotos de los carteles instalados en las zonas con cámaras.

### Acción 2 — Retirar cámaras de zonas privadas

Recorrer todas las cámaras y **reorientar o retirar** cualquiera que enfoque:

- Baños y vestidores.
- Comedores y salas de descanso.
- Zonas donde exista una expectativa razonable de privacidad.

Dejar registrado dónde queda cada cámara y qué enfoca. Puede hacerlo, por
ejemplo, con un **plano simple marcado a mano**, una **planilla-inventario**
(ubicación, qué enfoca, ángulo) o **capturas de la vista de cada cámara** desde
la app del grabador (*Hik-Connect* de Hikvision, *DMSS* de Dahua o la app de la
cámara cloud).

*Respaldo a conservar:* plano o inventario de cámaras confirmando que ninguna
enfoca zonas privadas.

### Acción 3 — Acotar retención y accesos

- Fijar un **plazo máximo de conservación** de las grabaciones. Como
  referencia operativa habitual: **30 días**, salvo que una grabación quede
  retenida por un incidente puntual. Se configura en el propio equipo: por
  ejemplo el **ciclo/sobrescritura del DVR o NVR** (*Hikvision*, *Dahua*), la
  retención en la nube de una **cámara cloud** (*Reolink*, *Nest*, *Ezviz*) o
  el plan de grabación contratado con la empresa de seguridad.
- Restringir quién puede **visualizar o descargar** las grabaciones a las
  personas estrictamente necesarias —por ejemplo con **usuarios y clave por
  persona** en el grabador o la app, evitando la clave compartida de fábrica.

| Parámetro | Configuración esperada |
| --- | --- |
| Retención de grabaciones | Máximo definido (referencia: 30 días) |
| Sobrescritura | Automática al cumplirse el plazo |
| Acceso a las imágenes | Solo personas designadas |

*Respaldo a conservar:* configuración de retención del equipo grabador y lista de
personas con acceso a las grabaciones.

## 4. Documentos tipo disponibles en su portal

- **Aviso de Videovigilancia y Protocolo de Cámaras** — cartel de señalética y
  protocolo de manejo de grabaciones, listos para personalizar.

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
