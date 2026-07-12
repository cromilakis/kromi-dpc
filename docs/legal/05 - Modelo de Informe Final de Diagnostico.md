# Modelo de Informe Final de Diagnóstico y Cumplimiento

> **Propósito:** Documento final que integra toda la información recopilada de la empresa, el diagnóstico de cumplimiento, las brechas identificadas, las mitigaciones implementadas (o propuestas), y el estado final de cumplimiento con la Ley 21.719 y normativa complementaria.

---

## INFORME DE DIAGNÓSTICO DE CUMPLIMIENTO EN PROTECCIÓN DE DATOS PERSONALES

**Fecha del informe:** [DD/MM/AAAA]
**Versión:** [1.0]
**Confidencialidad:** [Uso interno / Cliente-Abogado]

---

### 1. Resumen Ejecutivo

> **Síntesis para la alta dirección (máximo 1 página).**

[EMPRESA] ha sido evaluada conforme a los requerimientos de la Ley N° 21.719, que regula la protección y el tratamiento de los datos personales y crea la Agencia de Protección de Datos Personales, cuya entrada en vigencia está prevista para el 1 de diciembre de 2026. Adicionalmente, se ha considerado el ecosistema normativo aplicable según su rubro: [SALUD / FINANCIERO / LABORAL / OTRO].

**Resultado global:** [__ %] de cumplimiento. Categoría: [CRÍTICO / INSUFICIENTE / EN DESARROLLO / ADECUADO / ÓPTIMO].

**Principales hallazgos:**
1. [Hallazgo 1]
2. [Hallazgo 2]
3. [Hallazgo 3]

**Riesgo de sanción:** [BAJO / MEDIO / ALTO / CRÍTICO]. La empresa se expone a multas de hasta [__ UTM o __ % de ingresos] si no implementa las medidas correctivas.

**Recomendación principal:** [Resumen de la recomendación más urgente].

---

### 2. Información de la Empresa

| Campo | Información |
|---|---|
| Razón social | |
| Nombre de fantasía | |
| RUT | |
| Giro | |
| Rubro principal | |
| Rubro(s) secundario(s) | |
| Dirección comercial | |
| N° total de trabajadores | |
| N° de trabajadores que tratan datos personales | |
| Tamaño (Ley 20.416) | [Micro / Pequeña / Mediana / Grande] |
| Tiene presencia en el extranjero | [Sí / No] — [Países] |
| Estructura societaria | [Sociedad Anónima / Limitada / SpA / Otra] |
| Certificaciones vigentes | [ISO 27001 / ISO 27701 / Otras] |
| Sitio web | |
| Persona de contacto | |
| Cargo | |
| Correo electrónico | |
| Teléfono | |

---

### 3. Tratamiento de Datos Personales que Realiza la Empresa

#### 3.1 Descripción General

[Describir en 2–3 párrafos el contexto general de tratamiento de datos de la empresa: qué tipo de negocio realiza, a quiénes pertenecen los datos que trata (clientes, trabajadores, proveedores, pacientes, usuarios, etc.), volumen aproximado, y principales finalidades.]

#### 3.2 Mapa de Tratamientos

| ID | Actividad de Tratamiento | Categoría de Datos | Tipo (Personal / Sensible) | Universo de Titulares | Base de Legitimidad | Finalidad | Plazo de Conservación | Sistemas Asociados | Transferencias |
|---|---|---|---|---|---|---|---|---|---|
| T-01 | [Ej: Registro de clientes] | Identificación, contacto | Personal | Clientes | Relación contractual | Prestación del servicio | Duración del contrato + 5 años | CRM (Salesforce) | No |
| T-02 | [Ej: Registro de pacientes] | Identificación, contacto, salud | Sensible | Pacientes | Consentimiento explícito | Atención de salud | 15 años | Ficha clínica electrónica | No |
| T-03 | [...] | | | | | | | | |

#### 3.3 Diagrama de Flujo de Datos

> [Incluir un diagrama que muestre cómo fluyen los datos personales dentro y fuera de la organización: fuentes de recolección, sistemas de almacenamiento, procesamiento, destinatarios, transferencias internacionales. Puede ser un diagrama de bloques, UML, o BPMN.]

```
[RECOLECCIÓN] → [ALMACENAMIENTO] → [PROCESAMIENTO] → [COMUNICACIÓN] → [ELIMINACIÓN]
     │                  │                   │                 │                │
  Fuentes:         Sistemas:           Operaciones:      Destinatarios:    Plazos:
  - Web           - Servidor local      - Análisis        - Proveedores     - Contractual
  - Presencial    - Cloud AWS          - Perfilamiento    - Org. públicos   - Legal
  - Terceros      - CRM Salesforce     - Marketing        - Extranjero      - Política
```

#### 3.4 Datos Sensibles Tratados

| Categoría de Dato Sensible | Tratamiento Asociado | Base Legal Específica | Medidas de Seguridad Reforzadas |
|---|---|---|---|
| [Salud] | [Ficha clínica] | [Consentimiento explícito] | [Cifrado, acceso restringido, logs] |
| [Biométricos] | [Control de asistencia] | [Obligación legal] | [Cifrado, no replicación] |
| [Afiliación sindical] | [Descuentos cuota sindical] | [Obligación legal] | [Acceso restringido a RRHH] |
| [...] | | | |

#### 3.5 Decisiones Automatizadas y Perfilamiento

| Sistema | Tipo de Decisión | Lógica Aplicada | EIPD Realizada | Base de Legitimidad |
|---|---|---|---|---|
| [Scoring crediticio] | Concesión/denegación de crédito | [Describir algoritmo] | [Sí/No] | [Interés legítimo] |
| [Marketing automatizado] | Segmentación de ofertas | [Describir lógica] | [Sí/No] | [Consentimiento] |
| [...] | | | | |

---

### 4. Diagnóstico de Cumplimiento — Resultados por Dimensión

#### 4.1 Tabla de Resultados

| Dimensión | Puntaje Máx. | Puntaje Obtenido | % Cumplimiento | Categoría |
|---|---|---|---|---|
| 1. Gobernanza y Estructura | 28 | [__] | [__%] | [___] |
| 2. Levantamiento y Catálogo | 38 | [__] | [__%] | [___] |
| 3. Bases de Legitimidad | 26 | [__] | [__%] | [___] |
| 4. Información y Transparencia | 36 | [__] | [__%] | [___] |
| 5. Derechos de los Titulares | 34 | [__] | [__%] | [___] |
| 6. Seguridad de Datos | 46 | [__] | [__%] | [___] |
| 7. Terceros y Transferencias | 38 | [__] | [__%] | [___] |
| 8. Modelo de Prevención | 20 | [__] | [__%] | [___] |
| 9. Sectoriales | 20 | [__] | [__%] | [___] |
| 10. Capacitación y Cultura | 16 | [__] | [__%] | [___] |
| **TOTAL** | **[__]** | **[__]** | **[__%]** | **[___]** |

#### 4.2 Gráfico Radar de Cumplimiento

```
                  Gobernanza (__%)
                      /\
                     /  \
                    /    \
     Capacitación  /      \  Levantamiento
        (__%)     /        \    (__%)
                 /          \
                /    TOTAL   \
    Sectorial  /    (__%)    \  Legitimidad
      (__%)   |                |  (__%)
              |                |
    Modelo    |                |  Información
   Prevención |                |  (__%)
     (__%)    |                |
               \              /
     Terceros  \            /  Derechos
       (__%)    \          /   (__%)
                 \        /
                  \      /
                   \    /
                    \  /
                     \/
                 Seguridad (__%)
```

#### 4.3 Análisis por Dimensión

**Dimensión 1: Gobernanza y Estructura Organizacional ([__%])**
[Análisis detallado de los hallazgos: fortalezas, debilidades, riesgos principales.]

**Dimensión 2: Levantamiento de Información y Catálogo de Datos ([__%])**
[Análisis detallado...]

**Dimensión 3: Bases de Legitimidad y Consentimiento ([__%])**
[Análisis detallado...]

**Dimensión 4: Deber de Información y Transparencia ([__%])**
[Análisis detallado...]

**Dimensión 5: Derechos de los Titulares ([__%])**
[Análisis detallado...]

**Dimensión 6: Seguridad de los Datos Personales ([__%])**
[Análisis detallado...]

**Dimensión 7: Terceros, Proveedores y Transferencias ([__%])**
[Análisis detallado...]

**Dimensión 8: Modelo de Prevención de Infracciones ([__%])**
[Análisis detallado...]

**Dimensión 9: Obligaciones Sectoriales ([__%])**
[Análisis detallado...]

**Dimensión 10: Capacitación y Cultura Organizacional ([__%])**
[Análisis detallado...]

---

### 5. Brechas de Cumplimiento Identificadas

#### 5.1 Brechas Críticas (requieren acción inmediata)

| ID | Brecha | Dimensión | Riesgo Asociado | Sanción Potencial | Prioridad |
|---|---|---|---|---|---|
| B-01 | [Descripción] | [D__] | [Infracción gravísima / Riesgo a titulares] | [20.000 UTM] | 1 |
| B-02 | [...] | | | | |
| B-03 | [...] | | | | |

#### 5.2 Brechas Altas

| ID | Brecha | Dimensión | Riesgo Asociado | Sanción Potencial | Prioridad |
|---|---|---|---|---|---|
| B-04 | [Descripción] | [D__] | [Infracción grave] | [10.000 UTM] | 2 |
| B-05 | [...] | | | | |

#### 5.3 Brechas Medias

| ID | Brecha | Dimensión | Riesgo Asociado | Prioridad |
|---|---|---|---|---|
| B-06 | [Descripción] | [D__] | [Incumplimiento formal] | 3 |
| B-07 | [...] | | | |

#### 5.4 Brechas Bajas

| ID | Brecha | Dimensión | Riesgo Asociado | Prioridad |
|---|---|---|---|---|
| B-08 | [Descripción] | [D__] | [Oportunidad de mejora] | 4 |

---

### 6. Plan de Mitigación

#### 6.1 Plan de Acción Priorizado

| # | Brecha ID | Acción de Mitigación | Responsable | Fecha Inicio | Fecha Término | Recursos | KPI de Cumplimiento | Estado |
|---|---|---|---|---|---|---|---|---|
| 1 | B-01 | [Acción concreta] | [Nombre/Cargo] | [DD/MM] | [DD/MM] | [$ / HH] | [Indicador medible] | [Pendiente] |
| 2 | B-02 | [...] | | | | | | |
| 3 | [...] | | | | | | | |

#### 6.2 Cronograma (Carta Gantt)

```
Acción / Mes          | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 | M10 | M11 | M12 |
----------------------|----|----|----|----|----|----|----|----|----|-----|-----|-----|
Designar encargado de prevención/DPO          | ██ |    |    |    |    |    |    |    |    |     |     |     |
Constituir Comité     | ██ | ██ |    |    |    |    |    |    |    |     |     |     |
Levantamiento de datos| ██ | ██ | ██ |    |    |    |    |    |    |     |     |     |
Política de Privacidad|    | ██ | ██ | ██ |    |    |    |    |    |     |     |     |
Procedimientos ARCO   |    |    | ██ | ██ | ██ |    |    |    |    |     |     |     |
Medidas de Seguridad  |    | ██ | ██ | ██ | ██ | ██ |    |    |    |     |     |     |
Contratos encargo     |    |    | ██ | ██ | ██ |    |    |    |    |     |     |     |
Capacitación          |    |    |    |    | ██ | ██ | ██ |    |    |     |     |     |
Modelo de Prevención  |    |    |    |    |    | ██ | ██ | ██ | ██ |     |     |     |
EIPD                  |    |    |    |    |    |    | ██ | ██ | ██ |     |     |     |
Auditoría              |    |    |    |    |    |    |    |    |    |  ██ |  ██ |     |
Cierre y difusión     |    |    |    |    |    |    |    |    |    |     |     |  ██ |
```

#### 6.3 Presupuesto Estimado

| Rubro | Descripción | Costo Estimado |
|---|---|---|
| Honorarios profesionales | Asesoría legal especializada, encargado de prevención/DPO externo | $ |
| Tecnología | Herramientas de cifrado, control de acceso, logging | $ |
| Capacitación | Cursos, talleres, material | $ |
| Auditoría externa | Certificación, pentesting | $ |
| Costos administrativos | Horas internas del equipo | $ |
| **TOTAL ESTIMADO** | | **$** |

---

### 7. Estado Final: Cómo la Empresa Cumple con la Protección de Datos Personales

> **Nota:** Esta sección se completa después de implementar las mitigaciones. Describe el estado de cumplimiento alcanzado.

#### 7.1 Gobernanza de Datos Personales

[Describir la estructura de gobernanza implementada: encargado de prevención/DPO designado, Comité funcionando, proyecto con seguimiento periódico.]

#### 7.2 Transparencia y Políticas

[Describir la política de tratamiento de datos personales publicada, los avisos de privacidad implementados, el catálogo de tratamientos disponible.]

**Políticas adoptadas:**
- Política de Tratamiento de Datos Personales (v. [X.X], [fecha])
- Política de Seguridad de la Información (v. [X.X], [fecha])
- Política de Conservación de Datos (v. [X.X], [fecha])

#### 7.3 Ejercicio de Derechos de los Titulares

[Describir el procedimiento implementado para cada derecho ARCO, el canal de recepción de solicitudes, los tiempos de respuesta y la trazabilidad.]

**Derechos implementados:**
- [x] Acceso — Canal: [___], Plazo de respuesta: [___] días
- [x] Rectificación — Canal: [___], Plazo de respuesta: [___] días
- [x] Supresión — Canal: [___], Plazo de respuesta: [___] días
- [x] Oposición — Canal: [___], Plazo de respuesta: [___] días
- [x] Portabilidad — Formato: [CSV/JSON/XML], Plazo de respuesta: [___] días
- [x] Oposición a decisiones automatizadas — Canal: [___]

#### 7.4 Seguridad de los Datos

[Describir las medidas técnicas y organizativas implementadas: cifrado, control de acceso, logging, respaldo, protocolo de brechas.]

**Medidas técnicas implementadas:**
- Cifrado en reposo: [AES-256] en [sistemas]
- Cifrado en tránsito: [TLS 1.3] en [comunicaciones]
- Control de acceso: [RBAC] con [2FA] para accesos críticos
- Logging de accesos: [sistema] conservando por [período]
- Protocolo de brechas: [documento], notificación sin dilación indebida (Art. 14 sexies)

#### 7.5 Gestión de Terceros

[Describir cómo se gestionan los proveedores y encargados de tratamiento, y las transferencias internacionales.]

**Proveedores con cláusula de encargo de tratamiento:**
- [N] de [N] proveedores críticos con contrato vigente
- Cláusulas contractuales modelo para transferencias internacionales con [N] proveedores

#### 7.6 Cumplimiento Sectorial

[Describir el cumplimiento de las obligaciones específicas del rubro: secreto bancario, ficha clínica, datos laborales, etc.]

#### 7.7 Modelo de Prevención de Infracciones

[Describir el modelo implementado: encargado de prevención/DPO, identificación de riesgos, protocolos, capacitación, monitoreo, auditorías, canal de denuncias.]

#### 7.8 Cultura de Protección de Datos

[Describir las capacitaciones realizadas, cobertura, frecuencia, evaluaciones, y nivel de compromiso de la alta dirección.]

---

### 8. Conclusiones y Recomendaciones Finales

#### 8.1 Cumplimiento Alcanzado

[Resumen final: la empresa ha pasado de un [__%] de cumplimiento a un [__%] de cumplimiento, categoría [___]. Se han cerrado [N] de [N] brechas críticas, [N] de [N] altas, etc.]

#### 8.2 Riesgos Residuales

[Identificar los riesgos que persisten después de las mitigaciones, su probabilidad e impacto, y cómo se monitorean.]

#### 8.3 Recomendaciones para la Mejora Continua

1. Mantener actualizado el catálogo de tratamientos (revisión semestral)
2. Realizar auditoría externa anual
3. Monitorear las resoluciones y normativa de la Agencia de Protección de Datos Personales una vez que entre en funciones
4. Evaluar la certificación ISO 27701 como evidencia robusta del modelo de prevención
5. Planificar la adecuación a futuras normas sectoriales o modificaciones legales

#### 8.4 Próximos Hitos

| Hito | Responsable | Fecha Prevista |
|---|---|---|
| | | |
| | | |
| | | |

---

### 9. Anexos

1. Encuesta de diagnóstico diligenciada (con evidencia documental)
2. Matriz de levantamiento de datos personales
3. Catálogo de actividades de tratamiento
4. Política de tratamiento de datos personales
5. Política de seguridad de la información
6. Procedimientos ARCO
7. Protocolo de respuesta a brechas de seguridad
8. Contratos tipo de encargo de tratamiento
9. Evaluaciones de impacto en protección de datos (EIPD)
10. Registro de capacitaciones realizadas
11. Actas del Comité de Protección de Datos

---

> **Documento elaborado por:** [Nombre del consultor / firma]
> **Fecha:** [DD/MM/AAAA]
> **Firma:**
>
> __________________________
> [Nombre]
> [Título profesional]
>
> **Este informe es confidencial y ha sido preparado exclusivamente para [EMPRESA]. Su reproducción o distribución sin autorización está prohibida.**

---

> **Documentos relacionados:**
> - [[01 - Analisis Ley 21.719]]
> - [[02 - Ecosistema Legal de Proteccion de Datos]]
> - [[03 - Encuesta de Diagnostico de Cumplimiento]]
> - [[04 - Identificacion de Brechas y Mitigaciones]]
