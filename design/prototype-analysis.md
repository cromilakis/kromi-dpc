# Análisis exhaustivo del prototipo — Plataforma DPC (Data Protection Compliance)

**Fuente:** `C:/Kromi/kromi-dpc/design/prototype.dc.html` (161 KB, 1567 líneas, formato `.dc.html`)
**Contexto de negocio:** `C:/Kromi/kromi-dpc/RFC.md` (v0.4) · **Style Reference:** `C:/Kromi/kromi-dpc/DESIGN.md` (Attio)
**Fecha del análisis:** 2026-07-02

Este documento es el **contrato de implementación** para construir la app real en Next.js a partir del prototipo de Claude Design.

---

## 0. Arquitectura general del prototipo

El prototipo es una SPA de un solo componente (`class Component extends DCLogic`) con router por estado:

```js
this.state = {
  route: 'landing',            // vista activa
  authed: false,               // sesión del equipo
  loginUser: '', loginPass: '', loginErr: false,
  company: 0,                  // índice de la empresa seleccionada (COMPANIES)
  selectedDomain: 'DPC-INC',   // dominio activo del checklist
  selectedControl: 'DPC-INC-002', // control activo (ficha)
  regRubro: 'salud',           // rubro seleccionado en el alta de empresa
  controlStatus: {…},          // mapa código→estado (cumple|parcial|no), mutable
  cotSize: 'micro', cotRubro: 'ninguno',       // autoevaluador
  cotSensibles: false, cotIntl: false, cotAuto: false
}
```

Rutas del prototipo (valores de `state.route`): `landing`, `login`, `cotizador`, `dashboard`, `empresas`, `registro`, `resumen`, `checklist`, `control`, `riesgos`, `soluciones`, `plan`, `evidencias`, `certificacion`.

Props configurables del prototipo (panel `data-props`):
| Prop | Tipo | Default | Efecto |
|---|---|---|---|
| `accent` | color (`#407ff2`, `#075a39`, `#1c1d1f`) | `#1c1d1f` (fallback en código: `#407ff2`) | Color de los eyebrows/labels de sección (`--accent`) |
| `serifHeadlines` | boolean | `true` | Si es `false`, los headlines usan Inter en vez de Newsreader (`--serif`) |
| `showComplexityScore` | boolean | `true` | Muestra/oculta el Complexity Score en la topbar (`showScores`) |

---

## 1. Inventario de vistas / pantallas

Hay **4 macro-estados** mutuamente excluyentes a nivel raíz (`<sc-if>`): `isLanding`, `isLogin`, `isCotizador`, `isApp`. Dentro de `isApp` hay **10 sub-vistas** condicionales que comparten el shell (sidebar + topbar).

### 1.1 `isLanding` — Landing pública (route `landing`)

Página de marketing, `max-width:1180px`, fondo blanco. Secciones en orden:

1. **NAV (header sticky)** — `position:sticky; top:0; z-index:50; background:rgba(255,255,255,0.85); backdrop-filter:blur(12px); border-bottom:1px solid #e4e7ec; height:64px`.
   - Izquierda: logo `assets/dpc-logo.png` (44px alto) + tagline serif itálica *"Protección Certificada"* (Newsreader 17px/500, letter-spacing -0.2px).
   - Centro: 4 anchor-links (`#dominios`, `#ciclo`, `#modelo`, `#certificacion`) — 14px/500, color `#6f7988`, padding 6px 10px, radius 10px.
   - Derecha: **vacía** (sin botón de login; el acceso al panel es discreto vía footer, coherente con RFC §11).

2. **HERO** — centrado, padding `96px 32px 56px`.
   - **Pill de urgencia**: borde `#f3c9c6`, fondo `#fdf3f2`, radius 999px, 12px/600 color `#a1231f`; dentro: punto 8px `#e5342b` con animación `dpcBlink` (parpadeo 1.1s) + badge rojo `#e5342b` con texto blanco "Ley 21.719" + texto "vigente desde el 1 de diciembre de 2026".
   - **H1** 64px Newsreader 500, line-height 1.05, ls -1.28px, max-width 820px: *"Protección de datos personales, certificada"* + SVG check circular verde `#22C463` (58px) inline.
   - Subtítulo 20px/500 `#6f7988` max 560px: *"En DPC acompañamos a las empresas en todo el proceso: diagnóstico, propuesta y validación."*
   - Micro-label "Dos formas de cotizar" (13px/600 `#8f99a8`).
   - **CTA duales**: botón secundario "Autoevaluación en línea" (blanco, borde `#d3d8df`, radius 10, padding 11px 18px, icono documento) → `goCotizador`; separador "o"; **CTA WhatsApp** "Cotización asistida" (fondo `#25D366`, texto blanco, icono WhatsApp) → `https://wa.me/56900000000?text=…`.
   - **Card "Lo que está en juego" (stakes)**: card borde `#e4e7ec` radius 12, sombra `rgba(28,40,64,0.08) 0px 8px 24px -12px`; header gris `#fbfbfc` con título 13px/600 y nota "Fiscalización de la Agencia desde el 1 de diciembre de 2026"; grid de 3 columnas (loop `stakes`): punto de color (`s.dot`), severidad (`s.sev` 13px/600), rango UTM en serif 26px (`s.utm`), equivalencia CLP 13px `#8f99a8` (`s.clp`).

3. **DOMINIOS (`#dominios`)** — padding 80px 32px, border-top `#f3f4f6`.
   - Encabezado centrado: eyebrow 13px/600 color `var(--accent)` "Arquitectura del marco de trabajo"; H2 serif 40px *"Un estándar completo de protección de datos."*; párrafo 16px `#6f7988`.
   - **Divisor de sección** (patrón reusable): label uppercase 12px/600 + sub-label `#8f99a8` + línea flexible 1px `#e4e7ec`. Dos grupos: "Principios / Art. 3 · Ley 21.719" y "Dominios complementarios / Obligaciones operativas".
   - **Grid de domain-cards** `repeat(auto-fill,minmax(340px,1fr))`, gap 12: loop `domainsPrincipio` (8) y `domainsComp` (6). Cada card: borde `#e4e7ec`, radius 8, padding 18; chip de código (11px/600 `#505967` sobre `#f3f4f6`, radius 4, padding 3px 7px), nombre 15px/600, descripción 13px `#6f7988`.

4. **LOGO CLOUD** — texto "Diseñado sobre el ecosistema regulatorio chileno"; loop `agencies` como wordmarks 16px/600 `#8f99a8` (APDP, ANCI, SERNAC, CMF, Dirección del Trabajo, SUBTEL).

5. **CICLO (`#ciclo`)** — banda `#fbfbfc` con borders `#f3f4f6`. Eyebrow "Ciclo de aseguramiento continuo"; H2 *"Del diagnóstico a la renovación."*; grid 4 columnas (loop `fases`): card blanca con número de fase (12px/600 `#b5bdc9`), nombre 18px/600, descripción 13px `#6f7988`.

6. **ENTREGABLE** — grid `1fr 1.05fr` gap 64, align center.
   - Izquierda: eyebrow "El entregable"; H2 *"Documentación lista para una fiscalización."*; párrafo; 3 bullets con icono check en cuadrado `#f3f4f6` 22px radius 6: **Respaldo ante fiscalización**, **Trazabilidad total**, **Detalle del tratamiento** (negrita 600 + texto normal).
   - Derecha: **mock del expediente**: card radius 12 con sombra profunda (`rgba(28,40,64,0.1) 0px 16px 40px -16px, rgba(28,40,64,0.05) 0px 4px 8px -4px`); header `#fbfbfc` con icono documento en cuadrado ink 26px + título "Expediente de cumplimiento" + badge verde "Certificado" (11px/600 `#075a39` sobre `#e9f2ec`, pill); lista loop `dossierDocs` (7 ítems, check verde 18px `#e9f2ec`/`#075a39`); footer negro `#1c1d1f` con roseta (círculo 40px borde `#34353a` + icono medalla) + "Certificación privada DPC / Verificable en línea".

7. **CONFIANZA / AUTOCERTIFICACIÓN** — card única `#fbfbfc` radius 12 padding 32, grid 2 col: (a) icono medalla en cuadrado ink 44px radius 10 + "Nuestros procesos, bajo la misma rigurosidad" (dogfooding); (b) icono escudo-check en cuadrado blanco borde `#d3d8df` + "Confidencialidad por diseño".

8. **ACOMPAÑAMIENTO** — eyebrow "Acompañamiento"; H2 *"Un consultor asignado en cada fase."*; grid 4 cards (loop `acompanamiento`): título 16px/600 + descripción 13px.

9. **MODELO DE SERVICIO (`#modelo`)** — banda `#fbfbfc`. Eyebrow "Modelo de servicio"; H2 *"Un acompañamiento que perdura."*; grid 2 cards radius 12 padding 28: chip "01 · Certificación inicial" → "Ruta al estándar"; chip "02 · Revalidación periódica" → "Aseguramiento continuo" (+ nota "Suscripción renovable…").

10. **LA INVERSIÓN / CTA (`#certificacion`)** — eyebrow "La inversión"; H2 *"El valor, a la medida de cada organización."*; **3 pricing-cards** radius 12 padding 28:
    - Microempresa: "Desde" + serif 34px "5 UF" + "+ IVA" (14px `#8f99a8`) + "valor base referencial".
    - Pequeña empresa: ídem con "15 UF".
    - **Enterprise**: card invertida (fondo y borde `#1c1d1f`, texto blanco), serif 34px "Bajo cotización" + "según el alcance del diagnóstico" (`#b5bdc9`).
    - Barra final con disclaimer legal (13px `#8f99a8`) + botones "Autoevaluación en línea" (secundario) y "Cotizar certificación" (WhatsApp verde).

11. **FOOTER** — fondo `#000000` (Abyss). Grid `1.4fr 1fr 1fr 1fr` gap 40, padding `64px 32px 40px`: columna de marca (logo con `filter:invert(1)` 30px + "Data Protection Compliance" + descripción 13px `#8f99a8` max 280px); loop `footerCols` (3 columnas: título 14px/500 blanco, links 14px `#8f99a8`). **El link "Panel del consultor" ejecuta `goLogin`** (acceso discreto a la app). Línea legal inferior con border-top `#1c1d1f`: "© 2026 DPC · Marco de trabajo. No emite certificaciones gubernamentales oficiales…".

### 1.2 `isLogin` — Login del equipo (route `login`)

- Página completa centrada, fondo `#fbfbfc`, contenedor max-width 400px.
- Encima de la card: logo 40px + tagline serif itálica.
- **Card de login**: blanca, borde `#e4e7ec`, radius 12, padding 32, sombra `rgba(28,40,64,0.1) 0px 12px 32px -12px, rgba(28,40,64,0.06) 0px 4px 8px -4px`.
  - H1 serif 26px "Ingreso del equipo"; subtítulo 14px `#6f7988` "Herramienta interna de evaluación y certificación DPC."
  - Inputs "Usuario" (placeholder `admin`) y "Contraseña" (password, placeholder `••••••`): label 12px/500 `#6f7988`; input 14px, borde `#d3d8df`, radius 8, padding 10px 12px. Manejan `onInput` y Enter (`onLoginKey`).
  - **Error condicional** `<sc-if value="{{ loginErr }}">`: caja 13px `#772322` sobre `#f6e9e8`, borde `#77232222`, radius 8: "Usuario o contraseña incorrectos."
  - Botón primario full-width "Ingresar" (ink, radius 10, padding 11) → `doLogin` (valida `admin`/`admin`, setea `authed:true` y navega a `dashboard`).
  - Botón fantasma "← Volver al sitio" → `goLanding`.
- Nota demo bajo la card: "Demo · usuario **admin** · contraseña **admin**" (12px `#b5bdc9`).

### 1.3 `isCotizador` — Autoevaluación en línea (route `cotizador`, pública)

- Fondo `#fbfbfc`. **Topbar sticky** igual a la landing (logo 36px + tagline) con botón "← Volver al sitio".
- Contenedor max-width 1080px. Header centrado: eyebrow "Autoevaluación en línea"; H1 serif 48px *"Estima el valor de la certificación."*; párrafo 17px (gratis, sin compromiso, la cotización final se confirma con el equipo).
- **Grid `1.1fr 0.9fr`**:
  - **Card de preguntas** (blanca, radius 12, padding 30):
    - 2 selects lado a lado: "Tamaño de la organización" (loop `cotSizes`: Microempresa / Pequeña / Mediana o grande) y "Rubro" (loop `cotRubros`: Otros / Salud / Fintech-Financiero / Servicios esenciales). Selects estilizados: borde `#d3d8df`, radius 10, padding 11px 12px, chevron SVG como `background-image` data-URI.
    - 3 **toggles Sí/No** (loop `cotToggles`, filas con border-top `#f3f4f6`): "¿Tratan datos sensibles? (salud, biométricos, financieros)" / "¿Transfieren datos al extranjero o usan proveedores cloud fuera de Chile?" / "¿Usan decisiones automatizadas o perfilamiento? (scoring, IA)". Botones segmentados: activo = fondo/borde `#1c1d1f` texto blanco; inactivo = blanco borde `#d3d8df` (helper `segBtn`).
  - **Card de resultado** (fondo `#1c1d1f`, radius 12, padding 30, texto blanco, `position:sticky; top:88px`):
    - "Estimación referencial" (12px `#b5bdc9`) → `{{ cotTierName }}` (15px/600) → `{{ cotPrice }}` en serif 40px → divisor `#2c2d30` → `{{ cotNote }}` (13px `#b5bdc9`).
    - Condicional `cotHasFactors`: chips de factores (loop `cotFactors`) 11px/500 sobre `#2c2d30`, pill.
    - CTA blanco full-width "Confirmar cotización con el equipo" → WhatsApp.
    - **Lógica**: micro → "Desde 5 UF + IVA"; pequeña → "Desde 15 UF + IVA"; mediana/grande → tier "Enterprise", precio "Bajo cotización". Factores: sensibles → "Datos sensibles"; rubro ≠ ninguno → "Rubro regulado"; intl → "Transferencias internacionales"; auto → "Decisiones automatizadas / IA". `cotNote` cambia según enterprise / con factores / sin factores.
- **Bloque "riesgo vs valor"** (grid 2 col):
  - Card roja (borde `#f3c9c6`, fondo `#fdf3f2`): título uppercase 12px `#a1231f` "El riesgo de no contar con certificación"; 2 bullets con punto rojo (WhatsApp de ejecutivos / Excel en un equipo); párrafos con la multa "**7 millones de pesos**" destacada.
  - Card verde (borde `#cfe6d8`, fondo `#f1f9f4`): título "El valor de certificarse"; loop `cotValor` (3 ítems con check verde `#dcefe3`/`#075a39`): Protección económica / Cumplimiento demostrable / Prestigio y confianza.

### 1.4 `isApp` — Shell de la aplicación interna (route ∉ {landing, login, cotizador})

Layout de dos columnas `display:flex; min-height:100vh`:

**SIDEBAR** (`<aside>` 236px, `border-right:#e4e7ec`, fondo `#fbfbfc`, sticky full-height):
- Header 56px: logo 26px + "DPC · Marco de trabajo" (14px/600).
- **Bloque de contexto de empresa** (condicional `inCompany`): botón "← Todas las empresas" (12px `#8f99a8`) → `goEmpresas`; avatar cuadrado 32px radius 8 fondo ink con iniciales blancas `{{ current.in }}`; nombre 13px/600 truncado + rubro 11px `#8f99a8`.
- **Nav** (loop `navItems`): label de grupo `{{ navLabel }}` (11px/600 `#b5bdc9` uppercase) = **"Consultoría"** (modo admin) o **"Empresa"** (modo empresa). Ítems: botón full-width, icono SVG 16px + label 13px/500, padding 8px 10px, radius 8; activo = texto `#1c1d1f` + fondo `#f3f4f6`, icono `#1c1d1f`; inactivo = texto `#6f7988`, icono `#8f99a8`.
  - Ítems modo admin (`adminKeys`): Panel general (`dashboard`), Empresas (`empresas`), Nueva empresa (`registro`).
  - Ítems modo empresa (`companyKeys`): Resumen, Checklist DPC, Riesgos & Gap, Soluciones, Plan de adecuación, Evidencias, Certificación. (La vista `control` marca activo "Checklist DPC".)
- Footer: botón "Cerrar sesión" (borde `#e4e7ec`, radius 10) → `logout` (vuelve a landing y desautentica).

**TOPBAR** (56px, border-bottom `#e4e7ec`, sticky, fondo blanco):
- Izquierda condicional: si `inCompany` → nombre de empresa 15px/600 + **pill de fase** (12px/500, colores por `faseMeta`) + (si `showScores`) "Complexity Score **{{score}}** · {{scoreTier}}" (12px). Si `isAdminView` → "Panel de administración".
- Derecha: **búsqueda decorativa** (200×32px, borde `#d3d8df`, radius 7, "⌕ Buscar controles…" en `#b5bdc9` — no funcional) + avatar circular 30px ink con "CD".

**MAIN**: `max-width:1160px`, padding `32px 32px 80px`. Contiene las 10 sub-vistas:

#### 1.4.1 `isDashboard` — Panel general (admin)
- H1 serif 40px "Panel general" + subtítulo "Visión de administración del portafolio de evaluaciones DPC."
- **4 stat-cards** (loop `dashStats`): label 12px `#8f99a8`, valor 30px/600 ls -0.9px, delta 12px/500 color variable. Datos calculados: Empresas en evaluación (assessment+remediation), Tasa de certificación %, Tiempo promedio (días), Riesgos abiertos (+% cumplimiento medio).
- Grid `1fr 1.3fr`:
  - **"Distribución por fase"** (loop `faseDist`, 4 filas): label + n + progress bar 7px (track `#f3f4f6`, fill color de fase, radius 999).
  - **"Actividad reciente"**: header con botón "Ver todas →" (secundario) → `goEmpresas`; loop `companies` (6 filas clicables → selecciona empresa y navega a `resumen`): avatar 28px `#f3f4f6` con iniciales, nombre 13px/500, "{{dias}} en proceso" 11px, pill de fase a la derecha.

#### 1.4.2 `isEmpresas` — Listado de empresas (admin)
- Header flex: H1 serif 40px "Empresas" + subtítulo; botón primario "+ Nueva empresa" (ink, 13px/500, radius 10, padding 9px 14px) → `goRegistro`.
- **Tabla-card** (borde `#e4e7ec`, radius 8, sombra `subtle-2`): header row grid `1.6fr 1fr 1fr 1.3fr 0.8fr 0.9fr 0.9fr` con labels uppercase 11px/600 `#8f99a8`: **Empresa · Rubro · Fase · Cumplimiento · Score · Riesgos · Tiempo**.
- Filas clicables (loop `companies`): avatar+nombre; rubro 13px `#6f7988`; pill fase; barra de progreso (6px, max 90px, color por `pctColor`) + % 13px/600; score 13px/600 coloreado por `tierColor`; riesgos en rojo `#772322` bold; días 13px `#8f99a8`.

#### 1.4.3 `isRegistro` — Alta de empresa + Complexity Score (admin, "Paso 1 de 4")
- Eyebrow "Alta de empresa · Paso 1 de 4"; H1 "Registrar y clasificar empresa"; subtítulo (el rubro activa leyes complementarias y calcula score).
- Grid `1.25fr 1fr`:
  - **Card formulario**: sección "Datos de la empresa" con 4 inputs prellenados (grid 2×2): Razón social ("Clínica Andes Salud SpA"), RUT ("76.421.905-K"), N° de colaboradores ("480"), Sucursales/oficinas ("6"). Inputs: 14px, borde `#d3d8df`, radius 7, padding 9px 12px. *(Estáticos en el prototipo — sin onInput.)*
  - Sección "Rubro corporativo" (+hint "Determina el multiplicador sectorial…"): grid 2 col de **7 botones-toggle de rubro** (loop `rubros`); activo = ink invertido, inactivo = blanco borde `#d3d8df`; radius 10, padding 10px 12px, transition .12s.
  - Sección "Leyes complementarias activadas automáticamente": chip azul fijo "Ley 21.719 · base" (fondo `#eaf1fe`, borde `#dbe7fd`) + chips grises dinámicos (loop `comp.laws`).
  - **Card Complexity Score** (fondo ink, texto blanco): label "DPC Complexity Score"; **score gigante en serif 64px** `{{ comp.final }}` + badge de tier (12px/600, texto color `tierColor` sobre fondo blanco, pill); línea explicativa "Rubro **X** · multiplicador ×1.7 (+70% sectorial sobre 52 pts base)"; divisor `#2c2d30`; "Factores del score" — loop `factors` (7): label 12px `#d3d8df` + pts + mini barra 5px (track `#2c2d30`, fill blanco 85% opacidad); botón blanco full-width "Iniciar assessment →" → `goChecklist`.
  - **Cálculo**: `base = Σ pts = 52`; `final = round(52 × mult_rubro)`; tier: ≥85 Crítico / ≥70 Alto / ≥50 Medio / <50 Bajo.

#### 1.4.4 `isResumen` — Resumen de empresa (overview)
- Eyebrow "Resumen de la evaluación"; H1 = nombre de la empresa; subtítulo "{{rubro}} · DPO {{dpo}} · en proceso desde {{inicio}} ({{dias}})".
- **4 stat-cards**: Fase actual (pill 15px/600), Cumplimiento global (26px + barra), Complexity Score (26px coloreado + tier), Controles/Riesgos ("4/23" + "N riesgos" en rojo).
- Grid `1.4fr 1fr`:
  - **"Avance por dominio"** (loop `resumenDominios`, 14 filas clicables → checklist del dominio): chip código 10px ancho fijo 64px, nombre truncado 13px/500, barra 90×6px color `pctColor`, contador "done/total" 12px.
  - **"Próximos pasos"** (loop `resumenPasos`, 3 ítems clicables): punto accent 7px + texto 13px + chip dominio 11px. (Ítems hardcodeados: completar RAT → checklist; aprobar plan de respuesta → plan; cargar evidencias → evidencias.)

#### 1.4.5 `isChecklist` — Checklist multiregulatorio
- Eyebrow "Checklist DPC · {{ current.name }}"; H1 "Checklist multiregulatorio"; subtítulo "…Haz clic en el estado para actualizarlo."
- Grid `284px 1fr`:
  - **Rail de dominios** (card, padding 10): label "14 dominios · 8 por principio"; loop `checkDomains` (14 botones): fila código 11px/600 + contador done/total 11px; nombre 13px/500; barra de avance 5px fill ink. Seleccionado = fondo `#f3f4f6` radius 8.
  - **Panel del dominio**: header con chip código + nombre 16px/600 + **pill de principio** a la derecha (`{{ selDomain.rel }}`, 11px/600 color `#2c5bb8` fondo `#eef4ff` borde `#dbe7fd`) + descripción 13px.
  - **Filas de controles** (loop `domainControls`, clicables → ficha `control`): código 11px/600 `#8f99a8` + chips de leyes (11px `#6f7988` sobre `#f3f4f6` radius 4) + nombre 14px/500; a la derecha **pill de estado clickeable** (`onCycle` con `stopPropagation` — cicla Cumple→Parcial→No cumple→Cumple) + chevron "›".

#### 1.4.6 `isControl` — Ficha de control (detalle)
- Botón "← Volver al checklist".
- Grid `1fr 340px`:
  - **Columna principal**: chip código 12px + nombre del dominio 13px `#8f99a8`; H1 serif 32px = nombre del control; card seccionada (dividers `#f3f4f6`):
    1. **Objetivo del control** (label uppercase 11px/600 `#8f99a8`): objetivo 14px/500 + detalle 14px `#505967` line-height 1.65.
    2. **Qué se evalúa · criterios de verificación**: loop `ctrl.criterios` — número en cuadrado 20px `#f3f4f6` radius 6 + texto 14px.
    3. **Fundamento legal primario** (texto 14px).
    4. **Fundamento legal conectado**.
    5. **Riesgo mitigado** (label en rojo `#772322`).
  - **Columna lateral**:
    - Card "Métrica de resultado": **botón grande de estado** full-width (15px/600, colores `statusMeta`, radius 10, padding 12px 16px) con texto "cambiar ↻" → `ctrl.onCycle`; chips de leyes debajo.
    - Card "Evidencias requeridas": contador `{{ evDone }}/{{ evTotal }}`; loop `ctrl.evidencias`: punto de color 7px + nombre 13px + **badge de estado** (Validada verde / Parcial ámbar / Faltante rojo, 11px/600 radius 4); botón dashed "+ Cargar evidencia" (borde `1px dashed #d3d8df`, radius 10 — decorativo, sin handler).

#### 1.4.7 `isRiesgos` — Gap Analysis / matriz de riesgos
- Eyebrow "Gap Analysis · {{ current.name }}"; H1 "Riesgos & matriz de brechas".
- Grid `1fr 1.4fr`:
  - **Card "Matriz de riesgo"**: grid `64px 1fr 1fr 1fr` gap 6. Columnas (loop `matrixCols`): Bajo / Medio / Alto · Crítico (impacto). Filas (loop `matrixRows`): Alta / Media / Baja (probabilidad). Celdas: `min-height:64px`, radius 8, fondo por severidad (score = fila+columna): ≥3 `#f6e9e8` (alto), =2 `#f6f0df` (medio), <2 `#e9f2ec` (bajo); dentro, chips de códigos de riesgo (11px/600 sobre `rgba(255,255,255,0.75)` radius 5). Leyenda inferior con cuadrados 12px + "Eje vertical: probabilidad".
  - **Card "Catálogo de riesgos identificados"** (loop `risks`, 7): fila con código 11px/700, chip tipo, chip dominio, **pill de impacto** a la derecha (Crítico/Alto rojo, Medio ámbar, Bajo verde); descripción 13px.

#### 1.4.8 `isSoluciones` — Catálogo de soluciones
- Eyebrow "Catálogo de soluciones"; H1 "Remedios parametrizados"; subtítulo (el cliente elige según rubro, tamaño y presupuesto).
- Stack vertical de cards (loop `solutions`, 3): header `#fbfbfc` con label uppercase "Problema identificado" + chip dominio + chip riesgo rojo (`R-00X`); título del problema 15px/600. Cuerpo: "Alternativas de solución predefinidas" — loop `s.alts`: número en cuadrado ink 22px radius 6 texto blanco + alternativa 14px.

#### 1.4.9 `isPlan` — Plan de adecuación
- Eyebrow "Plan de adecuación · {{ current.name }}"; H1 "Seguimiento de remediación".
- **4 summary-cards** (loop `planSummary`): Total tareas / Completadas / En curso / Pendientes (valor 28px/600).
- **Tabla** grid `2.2fr 1fr 1.2fr 1fr 1.1fr 1fr`: **Tarea · Dominio · Responsable · Vence · Avance · Estado**. Avance = barra 6px (max 70px, color `pctColor`) + %; Estado = pill (`planMeta`): Pendiente gris / En curso ámbar / En revisión azul `#407ff2`/`#eaf1fe` / Completado verde.

#### 1.4.10 `isEvidencias` — Repositorio documental
- Header flex: eyebrow "Repositorio · {{ current.name }}"; H1 "Evidencias documentales"; botón primario "+ Subir evidencia" (decorativo).
- **4 summary-cards**: Documentos / Validados / Pendientes / Rechazados.
- **Tabla** grid `2.4fr 1.1fr 1fr 1fr 0.8fr 1fr`: **Documento · Control · Tipo · Fecha · Tamaño · Estado**. Documento = icono archivo en cuadrado 28px `#f3f4f6` + nombre truncado; Estado = pill (`repoMeta`): Validado verde / Pendiente ámbar / Rechazado rojo.

#### 1.4.11 `isCertificacion` — Certificación DPC
- Eyebrow "Certificación DPC · {{ current.name }}"; H1 "Certificado privado de cumplimiento"; subtítulo "Emisión y verificación criptográfica del sello DPC…".
- Grid `1fr 1fr`:
  - **Columna izquierda**:
    - Card "Ciclo de aseguramiento": timeline vertical (loop `certPhases`, 4): círculo numerado 28px (colores por estado), nombre 14px/600 + pill de estado (Completada verde / En curso azul / Pendiente gris) + descripción 12px. El estado se deriva de la fase de la empresa (`order.indexOf(fase)`).
    - Card "Resumen de controles": 3 mini-cards tintadas — Cumple (borde `#e9f2ec`, fondo `#f6faf7`, número 24px `#075a39`), Parcial (`#f6f0df`/`#fbf8ef`/`#705500`), No cumple (`#f6e9e8`/`#fbf3f2`/`#772322`); línea "23 controles evaluados · X% de cumplimiento global".
  - **Card certificado** (fondo ink, radius 12, padding 36px 32px, sticky top 80px):
    - Header: mini-logo "D" en cuadrado blanco 24px + "DPC Certification"; **pill de estado** ("Certificado vigente" verde / "Pendiente de emisión" ámbar).
    - Roseta: círculo 72px borde `#34353a` + icono medalla SVG 34px.
    - "Certificado de cumplimiento otorgado a" (12px `#8f99a8`) → nombre en serif 28px → "Rubro {{rubro}} · Estándar DPC v0.3" (13px).
    - Grid 2×2 con border-top `#34353a`: **Código** (`DPC-{iniciales}-2026-{1001+idx}`), **Cumplimiento** (%), **Emitido** (28 jun 2026), **Vence** (28 jun 2027).
    - **Hash de verificación**: `0x{iniciales}a3f9c72e1d84b6` (12px Inter, `#d3d8df`, word-break).
    - Botón blanco full-width "Verificar certificado ↗" (decorativo — implica página pública de verificación).

### 1.5 Navegación — resumen del grafo

```
landing ──goCotizador──▶ cotizador ──goLanding──▶ landing
landing ──footer "Panel del consultor" (goLogin)──▶ login (o dashboard si ya authed)
login ──doLogin(admin/admin)──▶ dashboard
[admin] dashboard ⇄ empresas ⇄ registro   (sidebar "Consultoría")
empresas/dashboard ──click fila──▶ resumen (setea company, entra a modo empresa)
[empresa] resumen ⇄ checklist ⇄ control ⇄ riesgos ⇄ soluciones ⇄ plan ⇄ evidencias ⇄ certificacion  (sidebar "Empresa")
[empresa] "← Todas las empresas" ──▶ empresas
registro ──"Iniciar assessment →"──▶ checklist (¡sin pasar por resumen!)
cualquier vista app ──"Cerrar sesión"──▶ landing (authed=false)
```

---

## 2. Mapa de rutas propuesto (Next.js App Router)

### Área pública — grupo `(public)`

| Vista del prototipo | Ruta Next.js | Notas |
|---|---|---|
| `isLanding` | `/` | Landing con anchors `#dominios`, `#ciclo`, `#modelo`, `#certificacion` |
| `isCotizador` | `/autoevaluacion` | Autoevaluador gratuito; estado en cliente (o searchParams para compartir) |
| `isLogin` | `/login` | Acceso discreto solo desde footer ("Panel del consultor") |
| (implícita) | `/verificar/[codigo]` | Verificación pública del certificado — implicada por "Verificar certificado ↗", "Verificable en línea" y el hash. No existe en el prototipo pero es requerida por RFC §11/§17 |

### Área autenticada — grupo `(app)` bajo `/app` con `layout.tsx` (sidebar + topbar) y middleware de auth

| Vista | Ruta Next.js | Nav |
|---|---|---|
| `isDashboard` | `/app` (o `/app/panel`) | Sidebar "Consultoría" |
| `isEmpresas` | `/app/empresas` | Sidebar "Consultoría" |
| `isRegistro` | `/app/empresas/nueva` — wizard multi-paso: `/app/empresas/nueva?paso=1..4` o segmentos | El prototipo solo muestra el Paso 1 de 4 |
| `isResumen` | `/app/empresas/[id]` | Layout anidado `app/empresas/[id]/layout.tsx` inyecta el contexto de empresa en sidebar/topbar (`inCompany`) |
| `isChecklist` | `/app/empresas/[id]/checklist` (+ `?dominio=DPC-INC` o `/checklist/[dominio]`) | El dominio seleccionado debe ser URL-state |
| `isControl` | `/app/empresas/[id]/controles/[codigo]` | Ej.: `/app/empresas/clinica-andes/controles/DPC-INC-002` |
| `isRiesgos` | `/app/empresas/[id]/riesgos` | |
| `isSoluciones` | `/app/empresas/[id]/soluciones` | |
| `isPlan` | `/app/empresas/[id]/plan` | |
| `isEvidencias` | `/app/empresas/[id]/evidencias` | |
| `isCertificacion` | `/app/empresas/[id]/certificacion` | |

Recomendaciones estructurales:
- Dos layouts anidados: `(app)/app/layout` (shell + nav admin) y `(app)/app/empresas/[id]/layout` (cambia navLabel a "Empresa", muestra bloque de contexto + fase + score en topbar).
- La regla `activeKey = route==='control' ? 'checklist' : route` se traduce en marcar activo el ítem Checklist para rutas `controles/*` (usar `usePathname` con startsWith).
- El estado `controlStatus` (ciclado de estados) pasa a ser mutación por empresa (server action / API) — en el prototipo es global y compartido entre empresas (limitación consciente del mock).

---

## 3. Inventario de componentes UI (con estilos exactos)

### 3.1 Tipografía aplicada

| Uso | Fuente | Estilo |
|---|---|---|
| H1 landing hero | Newsreader 500 | 64px / 1.05 / ls −1.28px |
| H1 cotizador | Newsreader 500 | 48px / 1.05 / ls −0.9px |
| H1 vistas app / H2 landing | Newsreader 500 | 40px / 1.1 / ls −0.6px |
| H1 ficha de control | Newsreader 500 | 32px / 1.15 / ls −0.5px |
| Nombre en certificado | Newsreader 500 | 28px / ls −0.4px |
| H1 login | Newsreader 500 | 26px / 1.15 / ls −0.4px |
| Cifras destacadas (stakes 26px, pricing 34px, cotPrice 40px, score 64px) | Newsreader 500 | ls −0.5 a −0.8px |
| Tagline "Protección Certificada" | Newsreader 500 itálica | 17px (nav) / 16px (cotizador) |
| Body/UI | Inter (`font-feature-settings:'ss03'`) | 11–20px, weights 400–700 |
| Códigos (controles, riesgos, hash) | `font-family:'Inter'` explícita | 10–13px, weight 600–700 |

Carga de fuentes: Google Fonts `Inter:wght@400;500;600;700` + `Newsreader:opsz,wght@6..72,400;6..72,500`. Body: `#1c1d1f` sobre `#ffffff`, antialiased. Selection: fondo `#94b9ff`. Scrollbar custom 10px thumb `#e4e7ec`.

### 3.2 Botones

| Componente | Estilos |
|---|---|
| **Primario (ink)** | bg `#1c1d1f`, texto `#fff`, 13–14px/500, borde `1px solid #1c1d1f`, radius 10, padding 9px 14px (compacto) u 11px 18px (hero) |
| **Secundario** | bg `#fff`, texto `#1c1d1f`, 14px/500, borde `1px solid #d3d8df`, radius 10, padding 11px 18px |
| **WhatsApp CTA** | bg/borde `#25D366`, texto `#fff`, 14px/500, radius 10, padding 11px 18px, icono SVG 17px |
| **Botón blanco sobre panel oscuro** | bg `#fff`, texto `#1c1d1f`, sin borde, radius 10, padding 11–12px, full-width |
| **Ghost / back-link** | transparent, sin borde, 12–13px/500 `#6f7988`/`#8f99a8`, con flecha "←" |
| **Toggle segmentado (Sí/No, rubros, tamaños)** | activo: bg/borde `#1c1d1f` texto `#fff`; inactivo: bg `#fff` borde `#d3d8df` texto `#1c1d1f`; 13px/500, radius 10, padding 9px 15px (seg) / 10px 12px (rubro) |
| **Dashed (subir evidencia)** | bg `#fff`, borde `1px dashed #d3d8df`, radius 10, 13px/500, padding 10px |
| **Nav item sidebar** | full-width, 13px/500, padding 8px 10px, radius 8, gap 10; activo bg `#f3f4f6` texto ink; inactivo texto `#6f7988` |
| **Logout** | borde `1px solid #e4e7ec`, radius 10, 13px/500 `#6f7988`, padding 8px |

### 3.3 Cards y contenedores

| Componente | Estilos |
|---|---|
| **Card estándar** | bg `#fff`, borde `1px solid #e4e7ec`, radius 8, padding 16–24px |
| **Card destacada / marketing** | radius 12, padding 28–32px |
| **Card con tabla** | radius 8, `overflow:hidden`, filas con `border-bottom:1px solid #f3f4f6`, opcional sombra `rgba(28,40,64,0.1) 0px 2px 3px -2px, rgba(28,40,64,0.04) 0px 4px 6px -2px` (= `--shadow-subtle-2`) |
| **Card header gris** | sub-header bg `#fbfbfc`, `border-bottom:1px solid #f3f4f6`, padding 14–18px 18–24px |
| **Panel oscuro** (score, cotización, certificado) | bg `#1c1d1f`, radius 8–12, texto blanco; secundario `#b5bdc9`/`#8f99a8`; divisores `#2c2d30` (1px) / `#34353a` (borde roseta y grid) |
| **Banda de sección landing** | bg `#fbfbfc` con `border-top/bottom:1px solid #f3f4f6` |
| **Sombras profundas** (hero stakes, mock expediente, login) | `rgba(28,40,64,0.08) 0px 8px 24px -12px` · `rgba(28,40,64,0.1) 0px 16px 40px -16px, rgba(28,40,64,0.05) 0px 4px 8px -4px` · `rgba(28,40,64,0.1) 0px 12px 32px -12px, rgba(28,40,64,0.06) 0px 4px 8px -4px` |

### 3.4 Badges, pills y chips

| Componente | Estilos |
|---|---|
| **Chip de código de dominio/control** | 10–12px/600 `#505967` sobre `#f3f4f6`, radius 4, padding 3px 7px, `font-family:'Inter'` |
| **Chip de ley** | 11px `#6f7988` sobre `#f3f4f6`, radius 4, padding 2px 7px |
| **Chip de ley activada (registro)** | base: `#1c1d1f` sobre `#eaf1fe`, borde `#dbe7fd`, pill 999px; resto: sobre `#f3f4f6` borde `#e4e7ec` |
| **Pill de estado de control** (botón) | 12px/600, radius 999, padding 4px 12px, borde `1px solid {color}22` |
| **Pill de fase** | 12px/500, radius 999, padding 3–4px 9–12px |
| **Pill de principio (checklist)** | 11px/600 `#2c5bb8` sobre `#eef4ff`, borde `#dbe7fd`, pill |
| **Badge de evidencia** | 11px/600, radius 4, padding 2px 8px |
| **Pill de impacto de riesgo** | 11px/600, radius 999, padding 3px 10px |
| **Chip de riesgo en matriz** | 11px/600 `#1c1d1f` sobre `rgba(255,255,255,0.75)`, radius 5, padding 3px 7px |
| **Chip factor (cotizador oscuro)** | 11px/500 `#fff` sobre `#2c2d30`, pill, padding 4px 10px |
| **Badge urgencia (hero)** | pill `#fdf3f2` borde `#f3c9c6`, 12px/600 `#a1231f`; sub-badge `#e5342b` texto blanco; dot animado `dpcBlink` |

### 3.5 Sistema de colores semánticos de estado (crítico para la implementación)

| Semántica | Texto | Fondo | Uso |
|---|---|---|---|
| **Positivo / Cumple / Validada / Completado / Revalidación** | `#075a39` | `#e9f2ec` | statusMeta, evMeta, repoMeta, planMeta, faseMeta(renewal) |
| **Advertencia / Parcial / Pendiente / En curso / Propuesta** | `#705500` | `#f6f0df` | ídem |
| **Negativo / No cumple / Faltante / Rechazado / Crítico-Alto** | `#772322` | `#f6e9e8` | ídem + riesgos |
| **Activo / En revisión / Certificación** | `#407ff2` | `#eaf1fe` | planMeta, faseMeta(certification) |
| **Neutro / Diagnóstico / Pendiente (fase)** | `#6f7988` / `#8f99a8` | `#f3f4f6` | faseMeta(assessment), planMeta, certPhases |

Funciones de color por umbral:
- `pctColor(p)`: ≥80 → `#075a39`; ≥50 → `#705500`; <50 → `#772322` (barras de cumplimiento/avance).
- `tier(v)` / `tierColor(v)` (Complexity Score): ≥85 Crítico `#772322`; ≥70 Alto `#705500`; ≥50 Medio `#407ff2`; <50 Bajo `#075a39`.
- Matriz de riesgo: celdas `#f6e9e8` (score≥3), `#f6f0df` (=2), `#e9f2ec` (<2).
- Impacto riesgo: Crítico/Alto → rojo; Medio → ámbar; Bajo → verde.

### 3.6 Otros componentes

- **Progress bar**: track `#f3f4f6` (o `#eef0f3`/`#2c2d30` en variantes), fill de color semántico, alto 5–7px, radius 999.
- **Stat-card**: label 12px `#8f99a8` + valor 26–30px/600 ls −0.8/−0.9px (+ delta opcional).
- **Tabla por CSS grid** (no `<table>`): header row 11px/600 uppercase `#8f99a8` ls 0.3px; filas con divider `#f3f4f6`, padding 14px 18–20px.
- **Avatar de empresa**: cuadrado 28–32px radius 7–8, iniciales 11–12px/600; gris (`#f3f4f6`/`#505967`) en listas, ink invertido en sidebar.
- **Avatar de usuario**: círculo 30px ink, iniciales "CD".
- **Input**: 14px, borde `#d3d8df`, radius 7–8, padding 9–10px 12px; label 12px/500 `#6f7988` margin-bottom 6px.
- **Select**: radius 10, padding 11px 12px, chevron SVG por background-image (data-URI), `appearance:none`.
- **Search fake (topbar)**: 200×32px, borde `#d3d8df`, radius 7, texto `#b5bdc9`.
- **Divisor de sección con línea** (landing): label uppercase + `span flex:1 height:1px #e4e7ec`.
- **Timeline de fases** (certificación): círculos numerados 28px + pills de estado.
- **Iconografía**: SVG inline 11–34px, stroke `currentColor`, `stroke-width` 1.4–3, línea redondeada. Iconos del nav generados por helper `ic(d)` con paths (16px, stroke 1.6). Set: home, edificio, +, documento-resumen, listas, triángulo-alerta, ampolleta, checklist, carpeta, medalla.

---

## 4. Modelo de datos implícito

### 4.1 Entidades

**Empresa** (`COMPANIES`)
- `name` (string), `in` (iniciales, 2 chars), `rubro` (label), `fase` (enum), `score` (int, Complexity Score), `pct` (int, % cumplimiento global), `riesgos` (int, conteo abiertos), `dpo` (string o "—"), `dias` (int, días en proceso), `inicio` (fecha texto "02 may 2026").
- Del formulario de registro: `razonSocial`, `rut`, `colaboradores` (int), `sucursales` (int), `rubroKey`.
- **Enum `fase`**: `assessment` (Diagnóstico) → `remediation` (Propuesta) → `certification` (Certificación) → `renewal` (Revalidación). *(Ojo: las keys internas en inglés no coinciden 1:1 con los labels — `remediation` se etiqueta "Propuesta".)*

**Rubro** (`RUBROS`) — catálogo
- `key`, `label`, `mult` (multiplicador sectorial: 1.1–1.8), `laws[]` (leyes complementarias activadas).

**Dominio** (`DOMAINS`) — catálogo de 14
- `code` (`DPC-XXX`), `name`, `esPrincipio` (bool: 8 true / 6 false), `rel` (principio u obligación asociada), `desc`.

**Control** (`CONTROLS`) — catálogo de 23 fichas
- `code` (`DPC-XXX-NNN`), `domain` (FK código dominio), `name`, `status` (estado inicial seed), `laws[]`, `objetivo` (resumen), `detalle` (explicación larga), `criterios[]` (3–4 strings), `fp` (fundamento legal primario), `fc` (fundamento conectado, "—" si no hay), `riesgo` (riesgo mitigado), `evidencias[]` de `{n (nombre), estado}`.
- **Enum resultado**: `cumple` / `parcial` / `no` → labels "Cumple" / "Parcial" / "No cumple".
- **Enum estado de evidencia requerida**: `validada` / `parcial` / `faltante`.

**EvaluaciónControl** (implícita) — en el prototipo `state.controlStatus` es un mapa global `código→estado`; en la app real debe ser **por empresa** (relación Empresa×Control con status, y estado por evidencia requerida).

**Riesgo** (`RISKS`) — catálogo/hallazgos
- `code` (`R-00N`), `tipo` (Transversal / Transversal-Financiero / Laboral / Salud-Fintech / Seguridad), `desc`, `imp` (enum Bajo/Medio/Alto/Crítico), `prob` (enum Baja/Media/Alta), `dominio` (FK).

**Solución** (`SOLUTIONS`) — catálogo de remedios
- `problema` (título), `dominio` (FK), `riesgo` (FK código R-00N), `alternativas[]` (strings).

**TareaPlan** (`PLAN`) — plan de adecuación
- `tarea`, `dominio` (FK), `resp` (responsable, "Área · Persona"), `estado` (enum Pendiente / En curso / En revisión / Completado), `vence` (fecha texto), `prog` (0–100).

**EvidenciaDocumento** (`EVIDENCES`) — repositorio
- `name` (nombre de archivo), `control` (FK código), `tipo` (enum visto: Política / Acta / Registro / Bitácora / Contrato / Configuración / Captura), `estado` (enum Validado / Pendiente / Rechazado), `fecha`, `size`.

**Certificado** (`cert`, derivado)
- `code` = `DPC-{iniciales}-2026-{1001+idx}`, `hash` = `0x{in}a3f9c72e1d84b6`, `emitida` (bool: fase ∈ {certification, renewal}), `estadoLabel` ("Certificado vigente" / "Pendiente de emisión"), `fecha` (emisión), `vence` (+1 año), `pct`, conteos `cumple/parcial/no`, `totalCtrl`, `company`, `rubro`, versión del estándar ("Estándar DPC v0.3").

**FactorScore** (`FACTORS`) — 7 factores con `label` y `pts`; base = 52 pts; `final = round(base × mult_rubro)`.

**Fase** (`FASES`) — catálogo: `n` ("Fase 1"…), `name`, `landing` (descripción).

**Usuario/Consultor** (implícito) — login user/pass (demo admin/admin), avatar "CD"; sin entidad modelada. La app real necesita: usuario, rol, consultor asignado por empresa (RFC promete "consultor asignado").

**Cotización/Autoevaluación** (efímera) — `cotSize` (micro/pequena/mediana), `cotRubro` (ninguno/salud/fintech/esenciales), `cotSensibles`, `cotIntl`, `cotAuto` (bools) → derivan `cotTierName`, `cotPrice`, `cotFactors[]`, `cotNote`. La app real probablemente quiera persistir leads.

### 4.2 Relaciones

```
Rubro 1─n Empresa            Dominio 1─n Control
Empresa 1─n EvaluaciónControl n─1 Control
Control 1─n EvidenciaRequerida (definición) / Empresa 1─n EvidenciaDocumento n─1 Control
Empresa 1─n RiesgoIdentificado n─1 RiesgoCatálogo n─1 Dominio
RiesgoCatálogo 1─n Solución (vía código R-00N)
Empresa 1─n TareaPlan n─1 Dominio
Empresa 1─1 Certificado (por ciclo)
Rubro 1─n LeyComplementaria (array embebido)
```

### 4.3 Inconsistencias del prototipo a resolver en implementación

1. **Códigos de control obsoletos en EVIDENCES**: usan una taxonomía vieja (`DPC-GOV-001/002`, `DPC-DAT-001`, `DPC-SEC-001/002`, `DPC-THD-001`, `DPC-RGT-001`) que no existe en los 14 dominios v0.4. Mapear a: DPC-RES-001/002, DPC-INV-001, DPC-SEG-001/002, DPC-TER-001, DPC-DER-001.
2. **"ARSOP" vs "ARCOP"**: el RFC usa ARCOP; el prototipo dice "derechos ARSOP" (control DPC-DER-001, dossierDocs, evidencia `Formulario_ARSOP_web.png`). Unificar (el RFC v0.4 manda: ARCOP).
3. `resumenPasos` referencia dominio inexistente `DPC-EVD`.
4. `controlStatus` es global (compartido entre empresas): en la app real es per-empresa.
5. Labels de fase: key `remediation` = "Propuesta" (RFC llama a la Fase 2 "Propuesta" pero la vista plan habla de "remediación"); decidir nomenclatura canónica.
6. El certificado dice "Estándar DPC v0.3" pero el RFC es v0.4.
7. Datos no usados en el template pero computados (vestigiales, útiles como seed extra): `heroNav`, `heroStats`, `heroDomains`, `planes` (Esencial/Profesional/Corporativo), `principios` (6 principios rectores), `goPlatform`, `goDashboard`, y los campos `sub` de `cotSizes`.

---

## 5. Datos de ejemplo / seed

### 5.1 Los 14 dominios (`DOMAINS`) — seed canónico

**Por principio (Art. 3, Ley 21.719):**
| Código | Nombre | `rel` |
|---|---|---|
| DPC-LIC | Licitud y Lealtad | Licitud y lealtad |
| DPC-FIN | Finalidad | Finalidad |
| DPC-PRO | Proporcionalidad | Proporcionalidad |
| DPC-CAL | Calidad | Calidad |
| DPC-RES | Responsabilidad | Responsabilidad (accountability) |
| DPC-SEG | Seguridad | Seguridad |
| DPC-TRA | Transparencia e Información | Transparencia e información |
| DPC-CON | Confidencialidad | Confidencialidad |

**Complementarios:**
| Código | Nombre | `rel` |
|---|---|---|
| DPC-INV | Inventario y RAT | Registro de Actividades de Tratamiento |
| DPC-DER | Derechos de los Titulares | Derechos ARCOP *(prototipo: "ARCOP" en rel, "ARSOP" en control)* |
| DPC-SEN | Datos Sensibles y Grupos Especiales | Régimen reforzado |
| DPC-TER | Encargados y Transferencias | Encargados y transferencias internacionales |
| DPC-INC | Incidentes y Brechas | Notificación de brechas (72 h) |
| DPC-EIA | Evaluación de Impacto y Decisiones Automatizadas | EIPD · perfilamiento e IA |

Cada uno con `desc` completa en el prototipo (líneas 1040–1054) — copiar literal.

### 5.2 Los 23 controles (`CONTROLS`) — ficha completa cada uno

Distribución por dominio: DPC-RES ×4 (001 DPD, 002 Política gobierno datos, 003 Centralización evidencias, 004 MPI) · DPC-INV ×2 (001 RAT, 002 Ciclo de vida/flujos transfronterizos) · DPC-SEG ×2 (001 Accesos/logs, 002 Cifrado+MFA) · DPC-FIN ×2 (001 Finalidades, 002 Retención/borrado) · DPC-TER ×2 (001 Contratos encargados, 002 Transferencias internacionales) · DPC-INC ×2 (001 Plan de respuesta, 002 Protocolo/historial incidentes) · DPC-EIA ×2 (001 EIPD, 002 Decisiones automatizadas) · DPC-LIC-001, DPC-DER-001, DPC-SEN-001 (biometría laboral), DPC-CAL-001, DPC-PRO-001, DPC-TRA-001 (Art. 14 ter), DPC-CON-001 ×1 c/u.

Estados seed: **4 cumple** (RES-002, DER-001, SEG-002, RES-003), **10 parcial** (RES-001, INV-001, LIC-001, SEG-001, TER-001, INC-001, FIN-001, CAL-001, TRA-001, CON-001), **9 no** (INV-002, SEN-001, INC-002, FIN-002, PRO-001, RES-004, TER-002, EIA-001, EIA-002).

Cada control trae: objetivo, detalle (~3–5 líneas), 4 criterios, fp, fc, riesgo y 1–3 evidencias con estado (validada/parcial/faltante) — texto completo en líneas 1057–1150 del prototipo; usar literal como seed.

### 5.3 Rubros (`RUBROS`)

| key | label | mult | laws |
|---|---|---|---|
| retail | Retail / e-commerce | 1.2 | Ley 19.496 (SERNAC), Ley 21.719 |
| fintech | Fintech / Financiero | 1.8 | Circulares CMF, Ley 21.663, Ley 21.719 |
| salud | Salud | 1.7 | Ley 20.584, Ley 21.719, DPC-SEN reforzado |
| b2b | Servicios B2B | 1.3 | Código del Trabajo, Ley 21.719 |
| telco | Telecomunicaciones | 1.6 | Normas SUBTEL, Ley 21.663, Ley 21.719 |
| startup | Startup tecnológica | 1.1 | Ley 21.719, Ley 21.459 |
| estado | Proveedor del Estado | 1.5 | Ley 21.663 (ANCI), Ley 21.719 |

### 5.4 Factores del Complexity Score (`FACTORS`) — base 52 pts

Tratamiento de datos sensibles 12 · Volumen de datos sensibles procesados 9 · Actividades de tratamiento identificadas 8 · Sistemas e infraestructura crítica 8 · Dispersión geográfica y sucursales 5 · Proveedores críticos / encargados 6 · Canales de recepción de datos 4.

### 5.5 Empresas demo (`COMPANIES`)

| Nombre | in | Rubro | Fase | Score | Cumpl.% | Riesgos | DPO | Días | Inicio |
|---|---|---|---|---|---|---|---|---|---|
| Clínica Andes Salud | CA | Salud | certification | 88 | 82 | 3 | M. Fuentes | 58 | 02 may 2026 |
| Aurora Pay | AP | Fintech | remediation | 94 | 61 | 7 | R. Cáceres | 41 | 20 may 2026 |
| Tienda Norte Retail | TN | Retail | assessment | 62 | 34 | 5 | — | 12 | 19 jun 2026 |
| Nexo Servicios B2B | NX | Servicios B2B | renewal | 68 | 91 | 1 | C. Álvarez | 96 | 26 mar 2026 |
| Kappa Labs | KL | Startup | assessment | 57 | 22 | 6 | — | 8 | 23 jun 2026 |
| RedFibra Telecom | RF | Telecom | remediation | 83 | 54 | 4 | P. Rojas | 33 | 29 may 2026 |

Formulario de registro prellenado: "Clínica Andes Salud SpA", RUT 76.421.905-K, 480 colaboradores, 6 sucursales, rubro salud → score 88 (52×1.7) tier Crítico.

### 5.6 Riesgos (`RISKS`)

| Código | Tipo | Impacto | Prob. | Dominio | Descripción |
|---|---|---|---|---|---|
| R-001 | Transversal | Medio | Alta | DPC-SEG | Uso de canales informales (WhatsApp) para envío de documentación con datos personales |
| R-002 | Transversal | Medio | Alta | DPC-INV | Ausencia de RAT actualizado |
| R-004 | Transversal / Financiero | Crítico | Media | DPC-SEG | Planillas Excel con datos sensibles sin control de acceso ni cifrado |
| R-005 | Transversal | Bajo | Media | DPC-LIC | Políticas de privacidad desactualizadas frente a Ley 21.719 |
| R-007 | Laboral | Crítico | Media | DPC-SEN | Control de asistencia biométrico sin cumplir exigencias DT |
| R-008 | Salud / Fintech | Crítico | Alta | DPC-SEG | Cuentas genéricas compartidas para historial clínico o datos transaccionales |
| R-009 | Seguridad | Crítico | Alta | DPC-INC | Inexistencia de plan de respuesta y notificación ante brechas |

*(Nota: R-003 y R-006 no existen — la numeración del catálogo tiene huecos intencionales, coherentes con RFC §8.)*

### 5.7 Soluciones (`SOLUTIONS`)

1. **Control biométrico sin resguardo** (DPC-SEN, R-007): sistema de marcas autorizado por DT / hash irreversible de templates / anexo de contrato / enrolamiento y eliminación al término.
2. **Planillas Excel con datos sensibles** (DPC-SEG, R-004): migración a repositorio RBAC / cifrado en reposo + DLP / bitácora de acceso y descarga.
3. **Canales informales** (DPC-SEG, R-001): canal corporativo seguro / política de uso aceptable + capacitación / bloqueo de reenvío externo.

### 5.8 Plan de adecuación (`PLAN`) — 7 tareas

| Tarea | Dominio | Responsable | Estado | Vence | % |
|---|---|---|---|---|---|
| Redactar anexo de contrato para tratamiento biométrico | DPC-SEN | Legal · A. Soto | En curso | 15 jul 2026 | 40 |
| Implementar cifrado hash de templates biométricos | DPC-SEN | TI · Infra | Pendiente | 30 jul 2026 | 0 |
| Aprobar manual del plan de respuesta a incidentes | DPC-INC | Dirección | En revisión | 10 jul 2026 | 75 |
| Ejecutar simulacro de brecha de datos | DPC-INC | TI · SecOps | Pendiente | 20 ago 2026 | 0 |
| Completar Registro de Actividades de Tratamiento | DPC-INV | DPO | En curso | 25 jul 2026 | 55 |
| Actualizar cláusulas con encargados de hosting | DPC-TER | Legal | Completado | 02 jul 2026 | 100 |
| Definir matriz de plazos de retención | DPC-FIN | DPO | Pendiente | 12 ago 2026 | 0 |

### 5.9 Evidencias del repositorio (`EVIDENCES`) — 7 documentos

| Archivo | Control (obsoleto→mapear) | Tipo | Estado | Fecha | Tamaño |
|---|---|---|---|---|---|
| Politica_Tratamiento_v3.pdf | DPC-GOV-002 → DPC-RES-002 | Política | Validado | 12 jun 2026 | 1.2 MB |
| Acta_Nombramiento_DPD.pdf | DPC-GOV-001 → DPC-RES-001 | Acta | Validado | 10 jun 2026 | 480 KB |
| Matriz_RAT_procesos.xlsx | DPC-DAT-001 → DPC-INV-001 | Registro | Pendiente | 18 jun 2026 | 2.4 MB |
| Logs_auditoria_Q2.csv | DPC-SEC-001 → DPC-SEG-001 | Bitácora | Pendiente | 20 jun 2026 | 8.1 MB |
| Contrato_Encargado_Hosting.pdf | DPC-THD-001 → DPC-TER-001 | Contrato | Rechazado | 05 jun 2026 | 900 KB |
| Config_MFA_corporativa.pdf | DPC-SEC-002 → DPC-SEG-002 | Configuración | Validado | 14 jun 2026 | 320 KB |
| Formulario_ARSOP_web.png | DPC-RGT-001 → DPC-DER-001 | Captura | Validado | 09 jun 2026 | 640 KB |

### 5.10 Contenido de la landing (seed de marketing)

- **Stakes (sanciones)**: Infracción leve · 100–5.000 UTM · ≈ $7M–$340M CLP (dot `#b5bdc9`) / Infracción grave · 5.001–10.000 UTM · ≈ $340M–$680M (dot `#705500`) / Infracción gravísima · 10.001–20.000 UTM · hasta ≈ $1.360M (dot `#772322`).
- **Agencias**: APDP, ANCI, SERNAC, CMF, Dirección del Trabajo, SUBTEL.
- **Fases** (`FASES`): Fase 1 Diagnóstico / Fase 2 Propuesta / Fase 3 Certificación / Fase 4 Revalidación (con descripciones).
- **dossierDocs** (7): RAT · Políticas y avisos de privacidad vigentes · Procedimiento de derechos ARSOP · Plan de respuesta ante incidentes · Inventario y mapeo de flujos de datos · Evidencias por control, versionadas · Certificado privado DPC con hash de verificación.
- **acompanamiento** (4): Consultor asignado / Asesoría personalizada / Acompañamiento en la implementación / Seguimiento posterior.
- **footerCols**: Marco de trabajo (Los 14 dominios, Taxonomía de controles, Catálogo de riesgos, Verticales sectoriales) · Plataforma (**Panel del consultor** → login, Complexity Score, Repositorio de evidencias, Certificación DPC) · Marco legal (Ley 21.719, Ley 21.663, Ley 19.496, Código del Trabajo).
- **cotValor** (3): Protección económica / Cumplimiento demostrable / Prestigio y confianza.
- **Precios**: Micro desde 5 UF + IVA / Pequeña desde 15 UF + IVA / Enterprise bajo cotización.
- **WhatsApp**: `wa.me/56900000000` con 3 mensajes prellenados distintos (info, cotizar, post-autoevaluación).
- **No usados pero disponibles**: `PRINCIPIOS` (6: Objetivo, Repetible, Medible, Auditable, Basado en evidencia, Independiente — RFC §5 dice que NO van en la landing), `planes` (Esencial/Profesional/Corporativo con scopes — descartados de la landing v0.4 a favor de precios por tamaño), `heroStats` (72%, 9/14, Fase 2, Media), `heroNav`, `heroDomains`.

---

## 6. Template vars y condicionales — lista completa

### 6.1 Condicionales `<sc-if>`

| Condición | Significado |
|---|---|
| `isLanding` | route === 'landing' — landing pública |
| `isLogin` | route === 'login' |
| `loginErr` | credenciales incorrectas (dentro de login) |
| `isCotizador` | route === 'cotizador' |
| `cotHasFactors` | la autoevaluación tiene ≥1 factor de ajuste |
| `isApp` | route no es landing/login/cotizador — shell interno |
| `inCompany` | route ∈ {resumen, checklist, control, riesgos, soluciones, plan, evidencias, certificacion} — muestra contexto de empresa en sidebar y topbar (aparece 2 veces: sidebar y topbar) |
| `showScores` | prop `showComplexityScore` — muestra score en topbar |
| `isAdminView` | !inCompany — título "Panel de administración" en topbar |
| `isDashboard`, `isEmpresas`, `isRegistro`, `isResumen`, `isChecklist`, `isControl`, `isRiesgos`, `isSoluciones`, `isPlan`, `isEvidencias`, `isCertificacion` | sub-vistas del área app |

### 6.2 Vars globales de estilo
`accent` (color eyebrow/acentos), `serifFont` (familia de headlines), `--accent`/`--serif` como CSS custom properties en el div raíz.

### 6.3 Vars por vista

**Landing**: `stakes[]` {sev, utm, clp, dot} · `domainsPrincipio[]`/`domainsComp[]` {code, name, desc} · `agencies[]` (strings) · `fases[]` {n, name, landing} · `dossierDocs[]` (strings) · `acompanamiento[]` {t, d} · `footerCols[]` {title, links[{label, onClick}]} · `goCotizador`.

**Login**: `loginUser`, `loginPass`, `loginErr`, `onLoginUser`, `onLoginPass`, `onLoginKey`, `doLogin`, `goLanding`.

**Cotizador**: `cotSize`/`onCotSize`, `cotRubro`/`onCotRubro`, `cotSizes[]` {key,label,(sub)}, `cotRubros[]` {key,label}, `cotToggles[]` {q, si:{onClick,style}, no:{onClick,style}}, `cotTierName`, `cotPrice`, `cotNote`, `cotHasFactors`, `cotFactors[]` (strings), `cotValor[]` {t,d}, `goLanding`.

**Shell app**: `navLabel` ("Consultoría"/"Empresa"), `navItems[]` {label, icon (React SVG), onClick, style, icColor}, `current` {name, in, rubro, faseLabel, faseColor, faseBg, score, scoreTier}, `goEmpresas`, `logout`.

**Dashboard**: `dashStats[]` {label, value, delta, deltaColor}, `faseDist[]` {label, n, pctW, color}, `companies[]` (ver abajo), `goEmpresas`.

**Empresas**: `companies[]` {in, name, rubro, faseLabel, faseColor, faseBg, pct, pctW, pctColor, score, scoreColor, riesgos, dias, onClick}, `goRegistro`.

**Registro**: `rubros[]` {label, onClick, style}, `comp` {final, tier, tierColor, rubroLabel, mult, multPct, base, laws[]}, `factors[]` {label, pts, w}, `goChecklist`.

**Resumen**: `resumen` {name, rubro, dpo, inicio, dias, faseLabel/Color/Bg, pct, pctW, pctColor, score, scoreTier, scoreColor, riesgos, ctrlDone, ctrlTotal}, `resumenDominios[]` {code, name, label, pctW, pctColor, onClick}, `resumenPasos[]` {t, dom, onClick}.

**Checklist**: `checkDomains[]` {code, name, done, total, pctW, style, onClick}, `selDomain` {code, name, rel, desc}, `domainControls[]` {code, name, laws[], pillLabel, pillStyle, onClick, onCycle}.

**Control**: `ctrl` {code, domainName, name, objetivo, detalle, criterios[{num,text}], fp, fc, riesgo, statusLabel/Color/Bg/Border, onCycle, laws[], evidencias[{n,label,color,bg}], evDone, evTotal}, `goChecklist`.

**Riesgos**: `matrixCols[]` (strings), `matrixRows[]` {label, cells[{bg, codes[]}]}, `risks[]` {code, tipo, dominio, imp, impColor, impBg, desc}.

**Soluciones**: `solutions[]` {dominio, riesgo, problema, alts[{num,text}]}.

**Plan**: `planSummary[]` {l, v}, `plan[]` {tarea, dominio, resp, vence, progW, progColor, estado, estadoColor, estadoBg}.

**Evidencias**: `evSummary[]` {l, v}, `evidences[]` {name, control, tipo, fecha, size, estado, estColor, estBg}.

**Certificación**: `certPhases[]` {num, name, landing, stLabel, stColor, stBg}, `cert` {company, rubro, code, hash, estadoLabel/Color/Bg, fecha, vence, pct, cumple, parcial, no, totalCtrl}.

**Exportadas sin uso en el HTML** (vestigiales): `heroNav`, `heroStats`, `heroDomains`, `planes`, `principios`, `domains`, `goPlatform`, `goDashboard`, `cotEnterprise`, `cotSize`/`cotRubro` (sí usados como `value` de selects).

---

## 7. Interacciones y estados

| Interacción | Dónde | Comportamiento |
|---|---|---|
| `goCotizador` / `goLanding` / `goEmpresas` / `goRegistro` / `goChecklist` / `go(route)` | Global | Navegación por seteo de `route` |
| `goLogin` | Footer landing ("Panel del consultor") | Si `authed` → dashboard; si no → login (resetea `loginErr`) |
| `doLogin` | Login (botón + Enter) | Valida `admin`/`admin` (user case-insensitive+trim); OK → `{authed:true, route:'dashboard'}` y limpia password; error → `loginErr:true` |
| `logout` | Sidebar | `{authed:false, route:'landing'}` y limpia credenciales |
| Click fila empresa | Dashboard/Empresas | `{company:i, route:'resumen'}` — entra al modo empresa |
| "← Todas las empresas" | Sidebar | Vuelve a `empresas` (sale de modo empresa) |
| Selección de rubro | Registro | `{regRubro:key}` → recalcula score, tier, multiplicador y leyes en vivo |
| "Iniciar assessment →" | Registro (card score) | Navega a `checklist` |
| Selección de dominio | Rail del checklist / avance por dominio (resumen) / cards de dominio (landing… solo prepara handler) | `{selectedDomain:code}` (+route checklist si viene de fuera) |
| Click fila de control | Checklist | `{selectedControl:code, route:'control'}` |
| **Ciclado de estado de control** | Pill en checklist (con `stopPropagation`) y botón grande en ficha | `cycle(code)`: cumple→parcial→no→cumple; persiste en `controlStatus` y recalcula todos los agregados (avance por dominio, resumen de controles del certificado, ctrlDone) |
| Autoevaluador | Cotizador | 2 selects (`onChange` nativo) + 3 pares de botones Sí/No (`setCot`); el resultado (tier/precio/factores/nota) se recalcula en vivo; tamaño "mediana" fuerza Enterprise |
| CTAs WhatsApp | Landing ×2, cotizador ×1 | `wa.me/56900000000` con mensajes URL-encoded distintos, `target="_blank" rel="noopener"` |
| Enter en inputs login | Login | `onLoginKey` dispara `doLogin` |
| Próximos pasos | Resumen | Navegan a checklist / plan / evidencias |
| **Decorativos (sin handler)** | — | Search de topbar, "+ Subir evidencia", "+ Cargar evidencia", "Verificar certificado ↗", inputs del formulario de registro (values fijos), anchor-links del nav landing |
| **Multi-paso implícito** | Registro ("Paso 1 de 4") | Solo existe el paso 1; los pasos 2–4 hay que diseñarlos (sugerencia RFC §12: clasificación → checklist → hallazgos → plan) |
| Animación | Hero landing | `@keyframes dpcBlink` (opacity 1→0.2, 1.1s infinite) en el dot del badge de urgencia |
| Sticky | Nav landing/cotizador (top 0), sidebar (100vh), topbar app, card resultado cotizador (top 88px), card certificado (top 80px) | |

No hay modales ni menús desplegables en el prototipo. No hay estados vacíos (empty states) ni loaders diseñados.

---

## 8. Assets

| Asset | Uso | Estado |
|---|---|---|
| `assets/dpc-logo.png` | Nav landing (h 44px), footer (h 30px, `filter:invert(1)` para fondo negro), login (h 40px), topbar cotizador (h 36px), sidebar app (h 26px) | **NO EXISTE en el repo** — hay que crearlo/obtenerlo (ruta relativa `design/assets/dpc-logo.png` o mover a `public/` en Next.js) |
| Iconos SVG inline | Toda la app (check, documento, WhatsApp, medalla/roseta, escudo, carpeta, ampolleta, alerta, home, edificio, etc.) | Embebidos en el markup; extraer a componentes de icono (stroke 1.4–3, linecap/linejoin round) |
| Chevron de selects | Cotizador | SVG como data-URI en `background-image` |
| Fuentes | Google Fonts: Inter (400–700) + Newsreader (opsz 6..72; 400, 500 + itálica) | En Next.js usar `next/font/google` |
| favicon / OG | — | No definidos en el prototipo |

---

## 9. Fidelidad al design system (Style Reference "Attio")

### 9.1 Conformidades
- **Tipografía dual**: Newsreader (sustituto aprobado de Tiempos Text) para headlines ≥28px + Inter con `ss03` para toda la UI. ✔
- **Paleta base monocroma**: ink `#1c1d1f` sobre blanco; grises exactos del token set (`#f3f4f6`, `#e4e7ec`, `#d3d8df`, `#b5bdc9`, `#8f99a8`, `#6f7988`, `#505967`); footer `#000000` (Abyss). ✔
- **Botones**: primario ink/blanco, secundario blanco/borde slate, radius 10px consistente, 14px/500. ✔ (calcados del spec).
- **Nav links**: 14px/500 `#6f7988` (Metal), padding 6px 10px, radius 10. ✔
- **Bordes como separador principal** (`#e4e7ec`/`#f3f4f6`), sombras sutiles en cards de tabla (= `--shadow-subtle-2` literal). ✔
- **Colores semánticos de estado**: Success `#075a39`, Danger `#772322`, Warning `#705500` usados exactamente como en tokens. ✔
- **Action Blue `#407ff2`** reservado a acentos/estados activos (eyebrows vía `accent`, fase Certificación, "En revisión", tier Medio). ✔ (aprox.)
- Letter-spacing negativo en textos grandes, feature `ss03` global, inputs con borde `#d3d8df`. ✔

### 9.2 Desviaciones detectadas (decidir si se mantienen o corrigen)

1. **Verde WhatsApp `#25D366`**: color saturado fuera de paleta en 3 CTAs. Justificable como color de marca de WhatsApp; el Style Reference prohíbe "new saturated colors". *Recomendación: mantener solo en CTAs de WhatsApp.*
2. **Rojos de urgencia del hero**: `#e5342b` (badge/dot), `#a1231f` (texto), `#fdf3f2`/`#f3c9c6` (fondos/bordes) — más saturados que Danger Red `#772322`. Uso semántico (riesgo legal), pero es una extensión de paleta.
3. **Check verde del H1 `#22C463`**: saturado, no es Success Green `#075a39`. Además introduce color dentro de un headline (el spec dice "Don't use color in headlines").
4. **Serif bajo 28px**: tagline "Protección Certificada" (16–17px itálica), H1 login 26px, cifras de stakes 26px. El spec prohíbe Tiempos/serif <28px. *La tagline itálica funciona como logotipo — decisión de marca a validar.*
5. **Tintes de estado extendidos** no presentes en tokens: `#e9f2ec`, `#f6f0df`, `#f6e9e8`, `#eaf1fe`, `#eef4ff`, `#dbe7fd`, `#f1f9f4`, `#cfe6d8`, `#dcefe3`, `#fbf8ef`, `#fbf3f2`, `#f6faf7`, `#fbfbfc`, `#eef0f3`, `#2c2d30`, `#34353a`, `#2c5bb8`. Son derivados coherentes (fondos al ~10% de los semánticos + grises de superficie/panel oscuro); conviene **tokenizarlos** en la implementación (p.ej. `--tint-success-bg`, `--surface-raised`, `--dark-divider`).
6. **Radius 12px en cards destacadas** (pricing, cotizador, certificado, login, stakes): el spec fija cards en 8px, aunque `--radius-xl:12px` existe en los tokens Quick Start. Pills 999px para badges de estado (el spec dice tags 4px — los chips de código sí usan 4px). Aceptable como jerarquía: 4px chips técnicos / 999px estados / 8px cards estándar / 12px cards hero.
7. **Sombras profundas** en hero-cards, login y mock del expediente (hasta `0px 16px 40px -16px`) — exceden las 3 sombras del token set. El spec dice "no shadows on simple cards"; aquí se usan para piezas showcase.
8. **Prop `accent` default `#1c1d1f`** pero el código cae a `#407ff2` si no viene: definir el canónico (los eyebrows azules con Action Blue son consistentes con "color solo interactivo/acento raro"; con accent ink quedan 100% monocromos).
9. **Max-width 1180px (landing) / 1160px (app)** vs 1440px del spec — más angosto, decisión válida.
10. Inputs con radius 8px (login) y selects 10px vs token inputs 7px (el formulario de registro sí usa 7px). Unificar en 7px.

### 9.3 Tokens adicionales a incorporar al theme de la app

```css
/* Superficies */
--surface-page-alt:#fbfbfc; --surface-chip:#f3f4f6; --surface-track:#eef0f3;
/* Panel oscuro */
--dark-bg:#1c1d1f; --dark-divider:#2c2d30; --dark-border:#34353a; --dark-text-2:#b5bdc9; --dark-text-3:#8f99a8;
/* Tintes semánticos */
--ok:#075a39; --ok-bg:#e9f2ec; --warn:#705500; --warn-bg:#f6f0df; --bad:#772322; --bad-bg:#f6e9e8;
--info:#407ff2; --info-bg:#eaf1fe; --info-border:#dbe7fd; --info-text-alt:#2c5bb8;
/* Urgencia (landing) */
--alert:#e5342b; --alert-text:#a1231f; --alert-bg:#fdf3f2; --alert-border:#f3c9c6;
/* Marca externa */
--whatsapp:#25D366;
```

---

## 10. Checklist de implementación derivado (resumen accionable)

1. Next.js App Router con grupos `(public)` y `(app)`; middleware de auth para `/app/**`; layouts anidados para el shell y el contexto de empresa.
2. Design tokens: base Attio (DESIGN.md) + tokens extendidos §9.3; `next/font/google` (Inter + Newsreader con itálica).
3. Componentes compartidos: Button (5 variantes), Card (3 niveles), StatCard, ProgressBar, Pill/Badge (6 variantes semánticas), CodeChip, LawChip, AvatarInitials, GridTable, SectionHeading (eyebrow+H1+sub), DomainRail, StatusCyclePill, DarkPanel, Timeline, RiskMatrix, SegmentedToggle, Sidebar+Topbar.
4. Modelo de datos §4 con seed §5 (corrigiendo códigos de evidencias, ARSOP→ARCOP, dominio DPC-EVD, versión estándar v0.4, `controlStatus` per-empresa).
5. Vistas: 3 públicas + 10 internas + página pública de verificación de certificado (nueva).
6. Pendientes de diseño no cubiertos por el prototipo: pasos 2–4 del alta de empresa, carga real de evidencias (upload), búsqueda de controles, gestión de usuarios/consultores, empty states, responsive móvil (el prototipo es desktop-only, con grids fijos de 2–4 columnas).
7. Conseguir/crear `dpc-logo.png` (falta en el repo) y variante para fondo oscuro.
