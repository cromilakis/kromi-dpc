# Metodología de Identificación de Brechas y Propuestas de Mitigación

> **Objetivo:** A partir de los resultados de la [[03 - Encuesta de Diagnostico de Cumplimiento|Encuesta de Diagnóstico]], identificar las brechas de cumplimiento, clasificarlas por nivel de criticidad y proponer acciones de mitigación específicas.

---

## 1. Metodología General

### 1.1 Flujo de Trabajo

```
APLICAR ENCUESTA
      │
      ▼
IDENTIFICAR BRECHAS (preguntas con puntaje 0 o 1)
      │
      ▼
CLASIFICAR POR CRITICIDAD (Alta / Media / Baja)
      │
      ▼
PROPONER MITIGACIONES específicas para cada brecha
      │
      ▼
PRIORIZAR según matriz de riesgo-impacto
      │
      ▼
ASIGNAR responsables y plazos
      │
      ▼
CONSTRUIR PLAN DE ACCIÓN
      │
      ▼
MONITOREAR avance
```

### 1.2 Criterios de Clasificación de Criticidad

| Nivel | Criterio |
|---|---|
| **Crítico** | Brecha que expone directamente a sanciones de la ley (infracciones gravísimas), afecta derechos fundamentales de titulares, o impide el funcionamiento básico del sistema de protección de datos. Debe resolverse **inmediatamente o en un plazo máximo de 1 mes**. |
| **Alto** | Brecha que expone a infracciones graves, afecta a un número significativo de titulares, o compromete la seguridad de datos sensibles. Plazo: **1–3 meses**. |
| **Medio** | Brecha que afecta la calidad del cumplimiento (falta de documentación, procedimientos no formalizados) pero no expone directamente a sanciones máximas. Plazo: **3–6 meses**. |
| **Bajo** | Brecha de optimización o mejora continua. Plazo: **6–12 meses**. |

---

## 2. Catálogo de Brechas Frecuentes y Mitigaciones

### 2.1 Dimensión 1: Gobernanza y Estructura

| # | Brecha Típica | Criticidad | Mitigación Propuesta | Responsable | Plazo |
|---|---|---|---|---|---|
| 1.1 | No existe responsable de protección de datos designado | **Crítico** | Designar formalmente a un encargado de prevención/DPO o responsable mediante acto administrativo o acta de directorio. Si es PYME y no puede tener encargado de prevención/DPO dedicado, designar a un responsable con funciones adicionales pero con respaldo documentado. | Directorio / Gerencia General | 1 mes |
| 1.2 | No existe comité de gobernanza de datos | **Alto** | Constituir comité con representantes de Legal, TI, RRHH y Operaciones. Primera sesión: revisar resultados de esta encuesta y priorizar acciones. Reuniones quincenales. | encargado de prevención/DPO / Responsable designado | 2 meses |
| 1.3 | No hay proyecto formal de implementación | **Alto** | Crear plan de proyecto con carta Gantt, hitos, responsables y presupuesto. Usar herramienta de gestión (Asana, Trello, MS Project o planilla). | encargado de prevención/DPO + Gerencia General | 1 mes |
| 1.4 | No se ha comunicado el inicio del proyecto | **Medio** | Emitir comunicación formal de la Gerencia General a toda la empresa anunciando: inicio de implementación, designación de responsable, proyecto en curso, y próximas etapas. | Gerencia General | 1 mes |

### 2.2 Dimensión 2: Levantamiento y Catálogo

| # | Brecha Típica | Criticidad | Mitigación Propuesta | Responsable | Plazo |
|---|---|---|---|---|---|
| 2.1 | No se ha hecho levantamiento de datos personales | **Crítico** | Iniciar inmediatamente el levantamiento usando la matriz tipo de la SGD. Enviar a todas las áreas. Realizar reuniones de trabajo para completarla. Priorizar áreas que tratan datos sensibles o masivos. | encargado de prevención/DPO + Jefes de área | 2 meses |
| 2.2 | Falta identificar bases de legitimidad | **Crítico** | Para cada actividad de tratamiento identificada, verificar si existe base legal (consentimiento, contrato, obligación legal, interés legítimo, etc.). Si ninguna aplica, cesar el tratamiento o regularizarlo obteniendo consentimiento. | encargado de prevención/DPO + Legal | 2 meses |
| 2.3 | Falta documentar plazos de conservación | **Alto** | Definir plazos de conservación para cada categoría de dato basado en: finalidad del tratamiento, obligaciones legales, prescripción de acciones. Documentar en el catálogo. Implementar mecanismo de eliminación automática al vencimiento. | encargado de prevención/DPO + TI | 3 meses |
| 2.4 | No se han identificado decisiones automatizadas | **Alto** | Revisar todos los sistemas que usan algoritmos o reglas automáticas (scoring, perfilamiento, filtros). Documentar la lógica aplicada. Realizar EIPD si hay alto riesgo. | encargado de prevención/DPO + TI | 3 meses |
| 2.5 | No existe catálogo/registro formal de tratamientos | **Alto** | Construir el catálogo a partir de la matriz de levantamiento con los campos del Art. 14 ter. Publicarlo en web o ponerlo a disposición. Mantenerlo actualizado. | encargado de prevención/DPO | 4 meses |
| 2.6 | No se ha mapeado dónde se almacenan los datos (cloud, servidores locales, país) | **Alto** | Inventariar todos los sistemas, plataformas y proveedores cloud. Identificar ubicación física de servidores. Esto es esencial para determinar si hay transferencias internacionales. | TI | 2 meses |

### 2.3 Dimensión 3: Bases de Legitimidad y Consentimiento

| # | Brecha Típica | Criticidad | Mitigación Propuesta | Responsable | Plazo |
|---|---|---|---|---|---|
| 3.1 | Consentimientos no cumplen requisitos (genéricos, tácitos, no informados) | **Crítico** | Revisar todos los formularios de consentimiento. Deben ser: previos, libres, informados, específicos e inequívocos. Actualizar formularios. No usar casillas pre-marcadas. Separar consentimientos por finalidad. | encargado de prevención/DPO + Legal + Marketing | 2 meses |
| 3.2 | No hay procedimiento para revocación de consentimiento | **Alto** | Implementar mecanismo simple para que el titular pueda revocar consentimiento (botón en web, correo electrónico, formulario). El procedimiento debe ser tan fácil como fue dar el consentimiento. | encargado de prevención/DPO + TI | 2 meses |
| 3.3 | Tratamiento sin base de legitimidad clara | **Crítico** | Identificar todos los tratamientos sin base legal. Para cada uno: (a) si es posible, obtener consentimiento retroactivo, (b) verificar si aplica otra base (interés legítimo con ponderación documentada), (c) si no hay base, **cesar el tratamiento**. | encargado de prevención/DPO + Legal | 1 mes |
| 3.4 | Consentimientos no almacenados ni demostrables | **Alto** | Implementar repositorio seguro de consentimientos. Cada consentimiento debe ser trazable: quién, cuándo, para qué finalidad, qué se informó. | TI + encargado de prevención/DPO | 2 meses |
| 3.5 | Interés legítimo no documentado (sin ponderación) | **Medio** | Para cada tratamiento basado en interés legítimo, elaborar documento de ponderación (test de proporcionalidad): interés perseguido vs. derechos del titular. Si el balance es desfavorable, cambiar a consentimiento. | encargado de prevención/DPO + Legal | 3 meses |

### 2.4 Dimensión 4: Información y Transparencia

| # | Brecha Típica | Criticidad | Mitigación Propuesta | Responsable | Plazo |
|---|---|---|---|---|---|
| 4.1 | No existe política de privacidad publicada | **Crítico** | Redactar política de privacidad con el contenido mínimo del Art. 14 ter. Usar formato tipo de la SGD adaptado. Publicar en sitio web en lugar visible. Incluir fecha y versión. Lenguaje claro. | encargado de prevención/DPO + Legal | 2 meses |
| 4.2 | Política de privacidad no cubre todos los campos exigidos | **Alto** | Completar la política con los 11 literales del Art. 14 ter. Prestar especial atención a: medidas de seguridad, transferencias internacionales, decisiones automatizadas, derecho a retirar consentimiento. | encargado de prevención/DPO + Legal | 2 meses |
| 4.3 | No se informa al recolectar los datos (Art. 14 bis) | **Alto** | En cada punto de recolección (formulario web, contrato, encuesta, app) agregar aviso de privacidad corto con: identidad del responsable, finalidad, base legal, derechos, y link a política completa. | encargado de prevención/DPO + TI + Marketing | 2 meses |
| 4.4 | Lenguaje de la política es incomprensible (legalese) | **Medio** | Reescribir en lenguaje claro y ciudadano. Usar ejemplos. Evitar lenguaje excesivamente técnico. Validar con usuarios de prueba. | encargado de prevención/DPO + Comunicaciones | 2 meses |

### 2.5 Dimensión 5: Derechos ARCO y Portabilidad

| # | Brecha Típica | Criticidad | Mitigación Propuesta | Responsable | Plazo |
|---|---|---|---|---|---|
| 5.1 | No hay procedimiento para ejercicio de derechos ARCO | **Crítico** | Diseñar procedimiento documentado para cada derecho (acceso, rectificación, supresión, oposición, portabilidad, oposición a decisiones automatizadas) con: canal de recepción, formulario, plazos, responsable de respuesta, mecanismo de verificación de identidad. Plazo máximo de respuesta: 30 días corridos. | encargado de prevención/DPO + Legal + TI | 3 meses |
| 5.2 | Los sistemas no permiten ejercer derechos técnicamente | **Crítico** | Realizar prueba técnica: ¿puede TI extraer, modificar o eliminar datos de un titular específico? Si no, priorizar el desarrollo de estas funcionalidades. La portabilidad requiere exportación en formato estructurado (CSV, JSON, XML). | encargado de prevención/DPO + TI | 4 meses |
| 5.3 | No hay canal único y visible para recibir solicitudes | **Alto** | Implementar un canal centralizado: formulario web, correo electrónico dedicado, sección en el sitio web. Incluir en la política de privacidad. Registrar todas las solicitudes recibidas. | encargado de prevención/DPO + TI | 2 meses |
| 5.4 | No se informa al titular del derecho de recurrir a la Agencia | **Medio** | Incluir en todas las respuestas a solicitudes ARCO un párrafo informando del derecho de recurrir a la Agencia de Protección de Datos Personales si la respuesta es insatisfactoria. | encargado de prevención/DPO + Legal | 1 mes |
| 5.5 | No existen formularios tipo para cada derecho | **Medio** | Crear formularios descargables en el sitio web para cada derecho, con campos mínimos: identificación del titular, derecho que ejerce, datos de contacto, descripción de la solicitud. | encargado de prevención/DPO + TI | 2 meses |

### 2.6 Dimensión 6: Seguridad

| # | Brecha Típica | Criticidad | Mitigación Propuesta | Responsable | Plazo |
|---|---|---|---|---|---|
| 6.1 | No existe política de seguridad de la información | **Crítico** | Elaborar política de seguridad conforme al Decreto N° 7/2023 (NTSIC) como referencia. Incluir sección específica de datos personales. Aprobar por directorio. | encargado de prevención/DPO + Oficial de Seguridad | 3 meses |
| 6.2 | Falta cifrado de datos (en reposo o tránsito) | **Crítico** | Implementar cifrado AES-256 para datos en reposo (bases de datos, backups) y TLS 1.3 para datos en tránsito. Contraseñas: hashing con bcrypt/Argon2. Priorizar bases de datos con datos sensibles. | TI | 2 meses |
| 6.3 | No hay control de acceso con mínimo privilegio | **Alto** | Implementar control de acceso basado en roles (RBAC). Revisar todos los permisos. Nadie debe tener más acceso del necesario. Acceso a datos sensibles: restringir a roles específicos con 2FA. | TI | 3 meses |
| 6.4 | No hay registro de accesos (logs de auditoría) | **Alto** | Implementar logging de accesos a bases de datos con datos personales. Registrar: quién, cuándo, qué datos, desde dónde. Conservar logs por al menos 1 año. Revisar periódicamente. | TI | 2 meses |
| 6.5 | No hay protocolo de respuesta a brechas de seguridad | **Crítico** | Diseñar protocolo con: (1) detección, (2) contención, (3) evaluación de impacto, (4) notificación a Agencia sin dilación indebida (Art. 14 sexies), (5) notificación a titulares si hay alto riesgo, (6) remediación, (7) lecciones aprendidas. Realizar simulacro. | encargado de prevención/DPO + Oficial de Seguridad + TI | 2 meses |
| 6.6 | No se hacen pruebas de vulnerabilidad | **Medio** | Contratar pentesting anual en sistemas que tratan datos personales. Realizar escaneos de vulnerabilidades trimestrales. Priorizar sistemas expuestos a internet. | TI | 6 meses |
| 6.7 | No se aplica protección de datos desde el diseño | **Alto** | Incorporar evaluación de impacto de privacidad en el ciclo de desarrollo de nuevos sistemas y productos (SDLC). Checklist de privacidad antes de cualquier lanzamiento. | encargado de prevención/DPO + TI + Desarrollo | 3 meses |

### 2.7 Dimensión 7: Terceros y Transferencias

| # | Brecha Típica | Criticidad | Mitigación Propuesta | Responsable | Plazo |
|---|---|---|---|---|---|
| 7.1 | No hay contratos de encargo de tratamiento con proveedores | **Crítico** | Identificar todos los proveedores que tratan datos (cloud, hosting, CRM, ERP, RRHH, marketing, call center). Firmar cláusulas de encargo de tratamiento con cada uno. Usar formato tipo SGD. | encargado de prevención/DPO + Legal + Compras | 3 meses |
| 7.2 | Transferencias internacionales no identificadas ni documentadas | **Alto** | Mapear todos los datos que salen de Chile: servidores cloud en el extranjero, proveedores con soporte remoto, matrices en el extranjero. Para cada caso, verificar nivel adecuado o implementar CCM. | encargado de prevención/DPO + Legal + TI | 3 meses |
| 7.3 | Proveedores subcontratan sin autorización | **Alto** | Agregar cláusula en contratos que prohíba la subcontratación sin autorización previa y por escrito del responsable. Auditoría periódica de proveedores críticos. | encargado de prevención/DPO + Legal | 3 meses |
| 7.4 | Cesión de datos a terceros sin base legal | **Alto** | Revisar todos los flujos de datos hacia terceros. Verificar que exista base legal para cada cesión (consentimiento, obligación legal, interés legítimo). Documentar cada cesión. | encargado de prevención/DPO + Legal | 2 meses |

### 2.8 Dimensión 8: Modelo de Prevención

| # | Brecha Típica | Criticidad | Mitigación Propuesta | Responsable | Plazo |
|---|---|---|---|---|---|
| 8.1 | No existen modelos certificados de prevención | **Alto** (voluntario pero atenuante) | Diseñar e implementar sistema conforme a: Art. 2° letra z), Art. 14 ter letra b), Art. 15 ter. Incluir: encargado de prevención/DPO, identificación de riesgos, protocolos, capacitación, monitoreo, auditoría, canal de denuncias. Aunque voluntario, su ausencia deja a la empresa sin atenuantes ante infracciones. | encargado de prevención/DPO + Directorio | 6 meses |
| 8.2 | No se han hecho evaluaciones de impacto (EIPD) | **Alto** | Realizar EIPD para tratamientos de alto riesgo: (1) datos sensibles a gran escala, (2) perfilamiento automático, (3) videovigilancia sistemática, (4) nuevas tecnologías con datos personales. | encargado de prevención/DPO + Áreas involucradas | 4 meses |
| 8.3 | No hay auditorías periódicas de cumplimiento | **Medio** | Establecer programa de auditoría anual de cumplimiento en protección de datos. Puede ser interna (auditoría interna) o externa (consultora especializada). | encargado de prevención/DPO + Auditoría Interna | 6 meses |
| 8.4 | Canal de denuncias no existe o no cubre datos personales | **Medio** | Implementar canal de denuncias que cubra incumplimientos de protección de datos. Garantizar confidencialidad y no represalias. | encargado de prevención/DPO + RRHH | 3 meses |

### 2.9 Dimensión 9: Sectoriales

#### 9.1 Salud 🏥💉

| # | Brecha Típica | Criticidad | Mitigación Propuesta | Responsable | Plazo |
|---|---|---|---|---|---|
| S.1 | Ficha clínica sin control de acceso | **Crítico** | Implementar sistema de control de acceso con perfiles. Registro automático de todo acceso (quién, cuándo, qué vio). Restringir acceso solo al equipo de salud tratante. | Director Médico + TI | 2 meses |
| S.2 | No se cumple plazo de entrega de ficha clínica (5 días) | **Alto** | Establecer procedimiento claro para solicitudes de ficha clínica. Asignar responsable. Implementar sistema de tracking. | Director Médico | 2 meses |
| S.3 | Conservación de fichas clínicas menor a 15 años | **Alto** | Auditar antigüedad de fichas clínicas. Implementar sistema de archivo que garantice 15 años de conservación. Datos digitalizados: backups con retención adecuada. | Director Médico + TI | 3 meses |
| S.4 | Datos de VIH o salud mental sin confidencialidad reforzada | **Crítico** | Acceso a diagnósticos sensibles (VIH, salud mental): restringir al mínimo personal indispensable. No incluir en resúmenes visibles sin necesidad clínica. Capacitación específica al personal de salud. | Director Médico + encargado de prevención/DPO | 1 mes |
| S.5 | Investigación clínica sin consentimiento informado para datos | **Alto** | Revisar todos los protocolos de investigación. Cada proyecto debe contar con: consentimiento informado específico para uso de datos, aprobación de comité de ética, y medidas de anonimización cuando sea posible. | Comité de Ética + Investigador | 2 meses |

#### 9.2 Financiero 🏦💰

| # | Brecha Típica | Criticidad | Mitigación Propuesta | Responsable | Plazo |
|---|---|---|---|---|---|
| F.1 | Revelación de datos bancarios sin consentimiento ni orden judicial | **Crítico** | Reforzar controles de secreto bancario. Toda revelación de datos debe documentar la base legal (consentimiento expreso del cliente u orden judicial). Auditoría trimestral de revelaciones. | Oficial de Cumplimiento + Legal | 1 mes |
| F.2 | Scoring crediticio sin base de legitimidad documentada | **Alto** | Documentar la base legal del scoring (relación contractual, interés legítimo con ponderación). Realizar EIPD del sistema de scoring. Informar al cliente sobre el perfilamiento. | encargado de prevención/DPO + Riesgo + Legal | 3 meses |
| F.3 | Datos comerciales comunicados más allá del plazo legal | **Alto** | Implementar sistema automático de caducidad: deudas pagadas o extinguidas se eliminan del reporte en los plazos legales (5 años si fueron morosas). Auditoría mensual de datos comunicados. | TI + Cumplimiento | 2 meses |
| F.4 | Incumplimiento NCG 461 CMF (seguridad de información) | **Crítico** | Realizar gap analysis contra NCG 461. Implementar los controles exigidos. Designar oficial de seguridad de la información si no existe. | Oficial de Seguridad + TI | 4 meses |

#### 9.3 Laboral 👷

| # | Brecha Típica | Criticidad | Mitigación Propuesta | Responsable | Plazo |
|---|---|---|---|---|---|
| L.1 | Datos biométricos de trabajadores sin base legal | **Crítico** | Revisar el uso de huella dactilar, reconocimiento facial u otros biométricos. Verificar base legal (consentimiento libre — difícil en contexto laboral— u obligación legal). Si no hay base, reemplazar por métodos menos invasivos (tarjeta, PIN). | RRHH + encargado de prevención/DPO + Legal | 2 meses |
| L.2 | Videovigilancia no cumple estándares de la DT | **Alto** | Revisar ubicación de cámaras: no en baños, vestidores, comedores, lugares de descanso. Informar a trabajadores sobre existencia y finalidad de cámaras. No usar videovigilancia para control laboral (solo seguridad). | RRHH + Seguridad | 2 meses |
| L.3 | No se informa a trabajadores sobre tratamiento de sus datos | **Alto** | Redactar política de privacidad interna para trabajadores. Entregar al momento de la contratación. Incluir: qué datos se recolectan, para qué, base legal, quién accede, plazos de conservación, derechos. | RRHH + encargado de prevención/DPO | 2 meses |
| L.4 | Datos sindicales tratados sin resguardo | **Alto** | Afiliación sindical es dato sensible. No registrar afiliación sindical si no es necesario. Si se registra (ej. para descuentos de cuotas), acceso restringido a personal mínimo de RRHH. | RRHH + encargado de prevención/DPO | 2 meses |
| L.5 | Procesos de selección recopilan datos innecesarios | **Medio** | Revisar formularios de postulación y entrevistas. Eliminar preguntas sobre: estado civil, hijos, religión, afiliación política, orientación sexual, salud (salvo que sea requisito esencial del cargo y con base legal). | RRHH + encargado de prevención/DPO | 1 mes |

### 2.10 Dimensión 10: Capacitación y Cultura

| # | Brecha Típica | Criticidad | Mitigación Propuesta | Responsable | Plazo |
|---|---|---|---|---|---|
| 10.1 | No hay programa de capacitación en protección de datos | **Alto** | Diseñar programa de capacitación: módulo general para todos los empleados, módulo avanzado para quienes tratan datos sensibles, módulo específico por área. Frecuencia: anual para todos, semestral para roles críticos. | encargado de prevención/DPO + RRHH | 3 meses |
| 10.2 | Nuevos empleados no reciben inducción en datos | **Medio** | Incorporar módulo de protección de datos en la inducción de nuevos empleados. Firma de compromiso de confidencialidad. | RRHH + encargado de prevención/DPO | 2 meses |
| 10.3 | No hay consecuencias por incumplimiento | **Medio** | Incorporar en el Reglamento Interno de Orden, Higiene y Seguridad (RIOHS) las obligaciones de protección de datos y las sanciones por incumplimiento. | RRHH + Legal | 3 meses |

---

## 3. Plan de Acción — Plantilla

Una vez identificadas las brechas y sus mitigaciones, se debe construir un plan de acción priorizado.

### 3.1 Matriz de Priorización

Para cada brecha, asignar puntaje de 1–5 en:

| Factor | Peso |
|---|---|
| Impacto legal (riesgo de sanción) | 40 % |
| Número de titulares afectados | 25 % |
| Esfuerzo/costo de implementación (inverso) | 20 % |
| Impacto reputacional | 15 % |

Prioridad = (Impacto legal × 0.4) + (Titulares × 0.25) + (Facilidad × 0.2) + (Reputación × 0.15)

### 3.2 Plantilla de Plan de Acción

| # | Brecha | Criticidad | Prioridad (1–5) | Acción de Mitigación | Responsable | Fecha Inicio | Fecha Término | Recursos Necesarios | Indicador de Cumplimiento | Estado |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [Brecha] | [Crítico/Alto/Medio/Bajo] | [1–5] | [Acción concreta] | [Nombre/Cargo] | [Fecha] | [Fecha] | [$ / HH] | [KPI medible] | [Pendiente/En Progreso/Completado] |
| 2 | | | | | | | | | | |
| 3 | | | | | | | | | | |
| ... | | | | | | | | | | |

---

## 4. Seguimiento y Monitoreo

### 4.1 Indicadores Clave (KPIs)

| KPI | Fórmula | Meta |
|---|---|---|
| % de brechas críticas cerradas | Brechas críticas cerradas / Total brechas críticas | 100 % en 3 meses |
| % de brechas totales cerradas | Brechas cerradas / Total brechas | > 80 % en 12 meses |
| % de empleados capacitados | Empleados capacitados / Total empleados que tratan datos | 100 % anual |
| Tiempo promedio de respuesta ARCO | Suma de tiempos de respuesta / N° de solicitudes | < 10 días |
| N° de brechas de seguridad notificadas | Brechas notificadas sin dilación indebida / Total brechas | 100 % |
| % de contratos con cláusula de encargo | Contratos con cláusula / Contratos con proveedores que tratan datos | 100 % |
| % de sistemas con EIPD (si aplica) | Sistemas con EIPD / Sistemas de alto riesgo | 100 % |

### 4.2 Rituales de Gobernanza

| Actividad | Frecuencia | Participantes |
|---|---|---|
| Sesión del Comité de Protección de Datos | Quincenal | encargado de prevención/DPO + Legal + TI + RRHH + Operaciones |
| Revisión de plan de acción | Mensual | encargado de prevención/DPO + Responsables de acciones |
| Auditoría de cumplimiento | Anual | Auditoría Interna / Externa |
| Actualización del modelo de prevención | Anual | encargado de prevención/DPO + Comité |
| Capacitación general | Anual | Todos los empleados |
| Capacitación avanzada | Semestral | Equipos que tratan datos sensibles |
| Simulacro de brecha de seguridad | Anual | encargado de prevención/DPO + TI + Comunicaciones |

---

> **Próximo paso:** Con las brechas identificadas y mitigaciones propuestas, elaborar el [[04 - Modelo de Informe Final de Diagnostico|Informe Final de Diagnóstico y Cumplimiento]].
