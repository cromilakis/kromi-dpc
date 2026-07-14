# Portal de Evaluaciones — detalle de brechas — Plan de implementación (sub-proyecto #3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar al cliente pagado una sección de Evaluaciones en el portal para ver su diagnóstico persistido y el detalle de cada brecha (qué encontramos / por qué es riesgo / qué dice la ley / gravedad de la multa).

**Architecture:** Un catálogo de contenido por `breach_code` (`lib/legal/breach-content.ts`, borrador) y un formateador de multa UTM→CLP alimentan una sección nueva del portal (`/portal/evaluaciones` lista + `[breachId]` detalle), gated a `service_paid_at`, que lee el diagnóstico activo + brechas vía RLS del cliente. Navegación ligera en el layout del portal.

**Tech Stack:** Next.js 16 (App Router, Server Components), Supabase (RLS), `lib/legal` (`UTM_CLP`, códigos de brecha), Vitest, Playwright, next-intl.

## Global Constraints

- pnpm. Comandos: `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test:e2e`.
- Prosa en español; identificadores en inglés. Textos de UI externalizados (i18n).
- **Gate:** Evaluaciones (y su data) solo con `companies.service_paid_at` no nulo (vía `company_client_view`). No pagado → bloqueado, sin filtrar brechas.
- **RLS del cliente** ya permite SELECT de `company_diagnoses`/`diagnosis_breaches`/`company_client_view` de su empresa (#1). Lecturas con el cliente autenticado (`createClient`).
- **Contenido legal** de `breach-content.ts` = **borrador pendiente de revisión legal** (banner de módulo); sin banner cara al cliente; la revisión es gate pre-deploy del usuario.
- **Degradación:** brecha sin entrada de catálogo → se muestran los campos persistidos, sin romper.
- Identidad de commits: `Cromilakis <ipcromilakis@gmail.com>`; sin trailers `Co-Authored-By` ni atribuciones a Claude.
- Códigos de brecha existentes (18): B-BIO-001, B-CAP-001, B-CCT-001, B-CON-001, B-CON-002, B-DER-001, B-GOB-001, B-LEG-001, B-LEG-002, B-LEG-003, B-MEN-001, B-SAL-001, B-SEG-001, B-SEG-002, B-SEG-003, B-TER-001, B-TER-002, B-WEB-001.

## Estructura de archivos

- Create: `lib/legal/breach-content.ts` — catálogo + `getBreachContent`.
- Test: `test/breach-content.test.ts`.
- Create: `lib/legal/fine.ts` — `formatFineClp(minUtm, maxUtm)` (UTM→CLP).
- Test: `test/fine.test.ts`.
- Create: `lib/portal/load-diagnosis.server.ts` — loader del diagnóstico activo + brechas + servicePaidAt.
- Create: `components/portal/portal-nav.tsx` — nav cliente (Inicio/Evaluaciones).
- Modify: `app/portal/layout.tsx` — insertar la nav.
- Create: `app/portal/evaluaciones/page.tsx` — lista (gated).
- Create: `app/portal/evaluaciones/[breachId]/page.tsx` — detalle (gated).
- Modify: `messages/app/portal.json` — i18n de la sección.

---

### Task 1: Catálogo de contenido de brechas + `getBreachContent`

**Files:**
- Create: `lib/legal/breach-content.ts`
- Test: `test/breach-content.test.ts`

**Interfaces:**
- Produces: `interface BreachContent { whyRisk: string; lawDetail: string }`; `getBreachContent(breachCode: string): BreachContent | null`.

- [ ] **Step 1: Escribir el test que falla**

Create `test/breach-content.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getBreachContent, BREACH_CONTENT } from "../lib/legal/breach-content";

describe("getBreachContent", () => {
  it("devuelve el contenido de una brecha conocida", () => {
    const c = getBreachContent("B-SEG-003");
    expect(c).not.toBeNull();
    expect(typeof c?.whyRisk).toBe("string");
    expect(c?.whyRisk.length).toBeGreaterThan(0);
    expect(typeof c?.lawDetail).toBe("string");
    expect(c?.lawDetail.length).toBeGreaterThan(0);
  });

  it("devuelve null para un código desconocido", () => {
    expect(getBreachContent("B-XXX-999")).toBeNull();
  });

  it("cubre los 18 códigos de brecha vigentes", () => {
    const codes = [
      "B-BIO-001","B-CAP-001","B-CCT-001","B-CON-001","B-CON-002","B-DER-001",
      "B-GOB-001","B-LEG-001","B-LEG-002","B-LEG-003","B-MEN-001","B-SAL-001",
      "B-SEG-001","B-SEG-002","B-SEG-003","B-TER-001","B-TER-002","B-WEB-001",
    ];
    for (const code of codes) expect(BREACH_CONTENT[code], code).toBeTruthy();
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `pnpm test breach-content`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar el catálogo (borrador redactado — transcribir tal cual)**

Create `lib/legal/breach-content.ts`:

```ts
/**
 * Contenido explicativo por brecha para el portal del cliente (sub-proyecto #3):
 * "por qué es un riesgo para tu empresa" y "qué dice la ley" (en detalle),
 * complementando lo persistido (description corta, artículos, severidad, multa).
 *
 * ⚠️ BORRADOR PENDIENTE DE REVISIÓN LEGAL. Redactado para acelerar; debe pasar
 * revisión del equipo legal ANTES de producción (gate pre-deploy). Las cifras y
 * artículos concretos se muestran desde el snapshot persistido; acá va la
 * narrativa. Basado en la Ley 21.719 (protección de datos personales, Chile).
 */
export interface BreachContent {
  /** Por qué esta brecha es un riesgo concreto para la empresa. */
  whyRisk: string;
  /** Qué exige la ley al respecto, en lenguaje llano. */
  lawDetail: string;
}

export const BREACH_CONTENT: Record<string, BreachContent> = {
  "B-GOB-001": {
    whyRisk:
      "Sin una gobernanza de datos definida (responsable, políticas, registro de actividades de tratamiento), la empresa no puede demostrar cumplimiento ante la Agencia de Protección de Datos ni responder con orden frente a un requerimiento o una fiscalización. La responsabilidad recae directamente en la organización.",
    lawDetail:
      "La ley consagra el principio de responsabilidad (accountability): no basta con cumplir, hay que poder demostrarlo con evidencia y gobernanza documentada. Esto incluye designar quién responde por el tratamiento y mantener un registro de las actividades de tratamiento de datos personales.",
  },
  "B-LEG-001": {
    whyRisk:
      "Tratar datos personales sin una base de licitud válida (consentimiento u otra causa legal) expone a la empresa a sanciones y a que las personas exijan el cese del tratamiento. Es una de las infracciones más frecuentes y de las primeras que revisa un fiscalizador.",
    lawDetail:
      "Toda operación con datos personales debe apoyarse en una base de licitud: consentimiento libre, informado y específico, o alguna de las causales que la ley reconoce (contrato, obligación legal, interés legítimo, etc.). Sin base válida, el tratamiento es ilícito.",
  },
  "B-LEG-002": {
    whyRisk:
      "Si el consentimiento no fue libre, informado y específico —o no queda registro de él—, la empresa no puede acreditar que estaba autorizada a tratar los datos, lo que invalida el tratamiento y agrava la exposición ante un reclamo.",
    lawDetail:
      "Cuando la base es el consentimiento, debe ser inequívoco y otorgado para finalidades determinadas, y la empresa debe poder demostrarlo. Un consentimiento genérico, tácito o sin registro no cumple el estándar de la ley.",
  },
  "B-LEG-003": {
    whyRisk:
      "Usar los datos para fines distintos de los informados (por ejemplo, marketing sin haberlo declarado) rompe el principio de finalidad y la confianza del titular, y es sancionable aunque los datos se hayan obtenido lícitamente.",
    lawDetail:
      "Los datos se recolectan para fines determinados, explícitos y legítimos, y no pueden reutilizarse para fines incompatibles con los informados al titular. Un cambio de finalidad requiere una nueva base de licitud.",
  },
  "B-SEG-001": {
    whyRisk:
      "Sin medidas de seguridad adecuadas, un incidente (filtración, acceso indebido, pérdida) es más probable y más grave; además la ley obliga a proteger los datos según el riesgo, por lo que su ausencia es en sí una infracción, no solo un problema técnico.",
    lawDetail:
      "El principio de seguridad exige medidas técnicas y organizativas apropiadas al riesgo del tratamiento (control de accesos, cifrado, respaldos, bitácoras). El nivel exigido es mayor mientras más sensibles o voluminosos sean los datos.",
  },
  "B-SEG-002": {
    whyRisk:
      "La falta de control de acceso (usuarios compartidos, permisos amplios) impide saber quién vio o modificó qué, dificulta contener un incidente y deja a la empresa sin trazabilidad para demostrar diligencia.",
    lawDetail:
      "Entre las medidas de seguridad razonables, la ley espera control de accesos individualizado y trazabilidad: cada persona con su credencial y registros que permitan auditar el acceso a los datos personales.",
  },
  "B-SEG-003": {
    whyRisk:
      "Sin registros de auditoría ni respaldos, ante un incidente la empresa no puede reconstruir qué pasó ni recuperar la información, y queda sin evidencia de que actuó con la diligencia que la ley exige.",
    lawDetail:
      "La seguridad del tratamiento incluye poder detectar y reconstruir accesos y cambios (auditoría) y asegurar la disponibilidad de los datos (respaldos). Su ausencia debilita tanto la prevención como la respuesta a incidentes.",
  },
  "B-TER-001": {
    whyRisk:
      "Cuando un proveedor externo trata datos por la empresa sin un contrato que fije obligaciones de protección, la empresa sigue siendo responsable de lo que ese tercero haga mal, sin herramientas para exigirle cumplimiento.",
    lawDetail:
      "Al encargar el tratamiento a un tercero (hosting, software, contador, etc.), debe existir un contrato que regule finalidad, confidencialidad y medidas de seguridad. El responsable no se libera de su responsabilidad por delegar la operación.",
  },
  "B-TER-002": {
    whyRisk:
      "Transferir datos al extranjero sin garantías adecuadas (por ejemplo, alojarlos en servicios fuera de Chile sin resguardos) expone a la empresa si el país de destino no ofrece protección equivalente y no se tomaron medidas.",
    lawDetail:
      "Las transferencias internacionales de datos requieren que el destino ofrezca un nivel de protección adecuado o que se adopten garantías apropiadas (cláusulas contractuales u otros mecanismos que la ley reconozca).",
  },
  "B-CON-001": {
    whyRisk:
      "Conservar datos más allá de lo necesario aumenta la superficie de riesgo (más datos que proteger y que pueden filtrarse) e infringe el deber de limitar la conservación al cumplimiento de la finalidad.",
    lawDetail:
      "Los datos deben conservarse solo por el tiempo necesario para la finalidad que justificó su recolección y luego suprimirse o anonimizarse. Guardar 'por si acaso' indefinidamente no cumple el principio de conservación limitada.",
  },
  "B-CON-002": {
    whyRisk:
      "Si la empresa no sabe dónde están todos los datos de una persona ni cómo eliminarlos, no puede responder a una solicitud de supresión ni cumplir los plazos, lo que deriva en reclamos y sanciones.",
    lawDetail:
      "El titular puede solicitar la supresión de sus datos, y la empresa debe poder ubicarlos y eliminarlos completamente dentro de los plazos legales. Esto exige tener mapeado dónde se almacenan.",
  },
  "B-DER-001": {
    whyRisk:
      "No tener un mecanismo para que las personas ejerzan sus derechos (acceso, rectificación, cancelación, oposición, portabilidad) genera incumplimiento automático apenas alguien lo solicita, y es fácil de fiscalizar.",
    lawDetail:
      "La ley reconoce a los titulares los derechos ARCOP y obliga a la empresa a habilitar canales y procedimientos para atenderlos en los plazos establecidos, de forma gratuita y expedita.",
  },
  "B-SAL-001": {
    whyRisk:
      "Los datos de salud son sensibles: su tratamiento sin las condiciones reforzadas que exige la ley conlleva las sanciones más altas y un daño reputacional serio, especialmente para clínicas y prestadores.",
    lawDetail:
      "Los datos de salud reciben protección reforzada: su tratamiento requiere una base de licitud calificada (consentimiento explícito u otra causal específica) y medidas de seguridad acordes a su sensibilidad.",
  },
  "B-MEN-001": {
    whyRisk:
      "Tratar datos de niños, niñas y adolescentes sin los resguardos especiales expone a la empresa a la máxima severidad, dado el interés superior del menor que la ley protege de forma reforzada.",
    lawDetail:
      "Los datos de menores tienen protección especial: su tratamiento debe atender el interés superior del niño y, por regla general, contar con autorización de quien ejerce su cuidado, además de medidas reforzadas.",
  },
  "B-BIO-001": {
    whyRisk:
      "Usar datos biométricos (huella, rostro, voz) para control de asistencia o acceso sin las condiciones legales expone a la empresa por tratar datos sensibles e irreemplazables: si se filtran, no se pueden 'cambiar' como una contraseña.",
    lawDetail:
      "Los datos biométricos que identifican a una persona son sensibles y su tratamiento exige base de licitud calificada, proporcionalidad (evaluar alternativas menos invasivas) y medidas de seguridad reforzadas.",
  },
  "B-CCT-001": {
    whyRisk:
      "Cámaras de videovigilancia sin señalética, sin finalidad definida ni control de las grabaciones tratan datos personales (imágenes) de trabajadores y clientes de forma que puede vulnerar su privacidad y ser sancionada.",
    lawDetail:
      "La videovigilancia trata datos personales: exige informar su existencia (señalética), una finalidad legítima y proporcional, y resguardar y conservar las imágenes por un tiempo limitado con acceso controlado.",
  },
  "B-WEB-001": {
    whyRisk:
      "Un sitio web o formulario que recolecta datos sin política de privacidad ni información clara incumple el deber de transparencia desde el primer contacto con el titular, algo visible y fácil de detectar.",
    lawDetail:
      "El deber de información obliga a informar de forma clara —típicamente en una política de tratamiento accesible— quién trata los datos, con qué finalidad y cómo ejercer los derechos, al momento de recolectarlos.",
  },
  "B-CAP-001": {
    whyRisk:
      "Si el equipo no está capacitado en protección de datos, los errores humanos (enviar datos al destinatario equivocado, malas prácticas de seguridad) se vuelven la principal fuente de incidentes, y la empresa no puede demostrar diligencia.",
    lawDetail:
      "La responsabilidad proactiva incluye medidas organizativas como la capacitación del personal que trata datos personales, de modo que las políticas de la empresa se apliquen efectivamente en el día a día.",
  },
};

export function getBreachContent(breachCode: string): BreachContent | null {
  return BREACH_CONTENT[breachCode] ?? null;
}
```

> El detalle específico (artículos citados, montos) se muestra desde el snapshot persistido; este catálogo aporta la narrativa. Si en el futuro `lib/legal` agrega códigos, `getBreachContent` degrada a `null` (la UI lo tolera).

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `pnpm test breach-content`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/legal/breach-content.ts test/breach-content.test.ts
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(portal): catálogo de contenido de brechas (borrador pendiente de revisión legal)"
```

---

### Task 2: Formateador de multa UTM→CLP (pura + tests)

**Files:**
- Create: `lib/legal/fine.ts`
- Test: `test/fine.test.ts`

**Interfaces:**
- Consumes: `UTM_CLP` de `@/lib/legal`.
- Produces: `formatFineClp(minUtm: number | null, maxUtm: number | null): string | null` — devuelve `"$X – $Y"` (rango en CLP, separador de miles es-CL), o `"$X"` si min===max, o `null` si faltan datos.

- [ ] **Step 1: Escribir el test que falla**

Create `test/fine.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatFineClp } from "../lib/legal/fine";
import { UTM_CLP } from "../lib/legal";

describe("formatFineClp", () => {
  it("formatea un rango en CLP con separador de miles", () => {
    const s = formatFineClp(100, 5000);
    expect(s).toBe(`$${(100 * UTM_CLP).toLocaleString("es-CL")} – $${(5000 * UTM_CLP).toLocaleString("es-CL")}`);
  });

  it("colapsa a un solo valor cuando min === max", () => {
    expect(formatFineClp(100, 100)).toBe(`$${(100 * UTM_CLP).toLocaleString("es-CL")}`);
  });

  it("devuelve null si falta algún extremo", () => {
    expect(formatFineClp(null, 5000)).toBeNull();
    expect(formatFineClp(100, null)).toBeNull();
    expect(formatFineClp(null, null)).toBeNull();
  });

  it("no multiplica por 100 raro (rango en pesos plausible)", () => {
    const s = formatFineClp(100, 5000)!;
    expect(s).toContain("$"); // valores en millones de pesos, no centavos
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `pnpm test fine`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

Create `lib/legal/fine.ts`:

```ts
import { UTM_CLP } from "@/lib/legal";

/**
 * Formatea el rango de multa (en UTM del snapshot) a CLP legible: "$X – $Y".
 * Si min === max devuelve "$X"; si falta algún extremo devuelve null (la UI
 * omite la multa). Separador de miles es-CL.
 */
export function formatFineClp(
  minUtm: number | null,
  maxUtm: number | null,
): string | null {
  if (minUtm == null || maxUtm == null) return null;
  const min = Math.round(minUtm * UTM_CLP);
  const max = Math.round(maxUtm * UTM_CLP);
  const fmt = (n: number) => `$${n.toLocaleString("es-CL")}`;
  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}
```

> Confirma que `UTM_CLP` se exporta desde `@/lib/legal` (lo usa hoy `decision-tree.ts`).

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `pnpm test fine`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/legal/fine.ts test/fine.test.ts
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(portal): formateador de multa UTM→CLP"
```

---

### Task 3: Loader del diagnóstico activo + brechas

**Files:**
- Create: `lib/portal/load-diagnosis.server.ts`

**Interfaces:**
- Consumes: `createClient` (`@/lib/supabase/server`).
- Produces:
  - `interface DiagnosisBreachRow { id: string; breachCode: string; area: string; areaLabel: string; severity: string; articles: string[]; fineMinUtm: number | null; fineMaxUtm: number | null; description: string }`
  - `interface ClientDiagnosis { paid: boolean; diagnosisId: string | null; breaches: DiagnosisBreachRow[] }`
  - `loadClientDiagnosis(): Promise<ClientDiagnosis>` — lee `service_paid_at` (de `company_client_view`), el `company_diagnoses` activo y sus `diagnosis_breaches`. Si no pagado o sin diagnóstico → `{ paid, diagnosisId: null, breaches: [] }`.
  - `loadClientBreach(breachId: string): Promise<DiagnosisBreachRow | null>` — una brecha por `id`, solo si pertenece al diagnóstico activo de la empresa y está pagado; si no, `null`.

- [ ] **Step 1: Implementar el loader**

Create `lib/portal/load-diagnosis.server.ts`:

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface DiagnosisBreachRow {
  id: string;
  breachCode: string;
  area: string;
  areaLabel: string;
  severity: string;
  articles: string[];
  fineMinUtm: number | null;
  fineMaxUtm: number | null;
  description: string;
}

export interface ClientDiagnosis {
  paid: boolean;
  diagnosisId: string | null;
  breaches: DiagnosisBreachRow[];
}

const SEVERITY_ORDER: Record<string, number> = {
  critico: 0,
  alto: 1,
  medio: 2,
  bajo: 3,
};

function mapBreach(row: {
  id: string;
  breach_code: string;
  area: string;
  area_label: string;
  severity: string;
  articles: string[] | null;
  fine_min_utm: number | null;
  fine_max_utm: number | null;
  description: string;
}): DiagnosisBreachRow {
  return {
    id: row.id,
    breachCode: row.breach_code,
    area: row.area,
    areaLabel: row.area_label,
    severity: row.severity,
    articles: row.articles ?? [],
    fineMinUtm: row.fine_min_utm,
    fineMaxUtm: row.fine_max_utm,
    description: row.description,
  };
}

/** Diagnóstico activo del cliente + brechas, gated a pagado. RLS acota a su empresa. */
export async function loadClientDiagnosis(): Promise<ClientDiagnosis> {
  try {
    const supabase = await createClient();

    const { data: company } = await supabase
      .from("company_client_view")
      .select("service_paid_at")
      .maybeSingle();
    const paid = Boolean(company?.service_paid_at);
    if (!paid) return { paid: false, diagnosisId: null, breaches: [] };

    const { data: diagnosis } = await supabase
      .from("company_diagnoses")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!diagnosis) return { paid: true, diagnosisId: null, breaches: [] };

    const { data: rows } = await supabase
      .from("diagnosis_breaches")
      .select(
        "id, breach_code, area, area_label, severity, articles, fine_min_utm, fine_max_utm, description",
      )
      .eq("diagnosis_id", diagnosis.id);

    const breaches = (rows ?? [])
      .map(mapBreach)
      .sort(
        (a, b) =>
          (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
          a.areaLabel.localeCompare(b.areaLabel),
      );

    return { paid: true, diagnosisId: diagnosis.id, breaches };
  } catch {
    return { paid: false, diagnosisId: null, breaches: [] };
  }
}

/** Una brecha por id (del diagnóstico activo, pagado). null si no aplica. */
export async function loadClientBreach(
  breachId: string,
): Promise<DiagnosisBreachRow | null> {
  const { breaches } = await loadClientDiagnosis();
  return breaches.find((b) => b.id === breachId) ?? null;
}
```

> `loadClientBreach` reusa `loadClientDiagnosis` (una sola vía de acceso, ya gated y RLS-acotada) y busca por id — evita una consulta separada que pudiera saltarse el gate.

- [ ] **Step 2: Verificar typecheck y lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: sin errores; 0 warnings nuevos.

- [ ] **Step 3: Commit**

```bash
git add lib/portal/load-diagnosis.server.ts
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(portal): loader del diagnóstico activo + brechas (gated a pagado)"
```

---

### Task 4: Navegación del portal (Inicio / Evaluaciones)

**Files:**
- Create: `components/portal/portal-nav.tsx`
- Modify: `app/portal/layout.tsx`
- Modify: `messages/app/portal.json`

**Interfaces:**
- Produces: `PortalNav` (client) que resalta el ítem activo por `usePathname`.

- [ ] **Step 1: Componente de navegación**

Create `components/portal/portal-nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ui";

const ITEMS = [
  { href: "/portal", key: "home", exact: true },
  { href: "/portal/evaluaciones", key: "evaluations", exact: false },
] as const;

export function PortalNav() {
  const pathname = usePathname();
  const t = useTranslations("portal.nav");
  return (
    <nav className="flex items-center gap-4" aria-label={t("label")}>
      {ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-buttons px-12 py-8 text-[13px] font-medium transition-colors",
              active ? "bg-ash text-ink" : "text-carbon hover:bg-ash hover:text-ink",
            )}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Insertar la nav en el layout**

En `app/portal/layout.tsx`, dentro del `<header>`, entre el nombre de la empresa y el botón "Cerrar sesión", renderiza `<PortalNav />`. Importa `PortalNav` de `@/components/portal/portal-nav`. Ajusta el header a `justify-between` con el nombre a la izquierda, la nav al centro/izquierda y el botón a la derecha (p. ej. envuelve nombre + nav en un `div` con `gap`). No cambies la lógica de guard del layout.

- [ ] **Step 3: Claves i18n**

En `messages/app/portal.json`, bajo `portal`, añade `nav: { label, home, evaluations }` (ej. label "Navegación del portal", home "Inicio", evaluations "Evaluaciones").

- [ ] **Step 4: Verificar typecheck, lint y tests**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test`
Expected: sin errores; tests verdes.

- [ ] **Step 5: Commit**

```bash
git add components/portal/portal-nav.tsx app/portal/layout.tsx messages/app/portal.json
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(portal): navegación Inicio/Evaluaciones"
```

---

### Task 5: Rutas de Evaluaciones (lista + detalle) gated a pagado

**Files:**
- Create: `app/portal/evaluaciones/page.tsx`
- Create: `app/portal/evaluaciones/[breachId]/page.tsx`
- Modify: `messages/app/portal.json`

**Interfaces:**
- Consumes: `loadClientDiagnosis`, `loadClientBreach` (Task 3); `getBreachContent` (Task 1); `formatFineClp` (Task 2); estilos de severidad (reusa el patrón de `components/self-assessment/diagnosis-result.tsx`).

- [ ] **Step 1: Lista de Evaluaciones**

Create `app/portal/evaluaciones/page.tsx` (server component):
- `const { paid, breaches } = await loadClientDiagnosis()`.
- Si `!paid`: render de estado **bloqueado** (título + texto "completa tu pago" + enlace/botón al re-pago si existe, o a `/portal`). Textos vía i18n `portal.evaluations.locked.*`. NO consultes ni muestres brechas.
- Si `paid` y `breaches.length === 0`: estado vacío (`portal.evaluations.empty`).
- Si hay brechas: lista agrupada visualmente por severidad/área (ya vienen ordenadas por el loader). Cada ítem: `areaLabel`, badge de severidad (reusa el mapa de clases de `diagnosis-result.tsx` — cópialo o extrae a un helper compartido si prefieres, sin duplicar en exceso), la multa (`formatFineClp(b.fineMinUtm, b.fineMaxUtm)`, omitir si null), y enlaza a `/portal/evaluaciones/${b.id}`.
- `PageHeader`/encabezado con `portal.evaluations.title`/`description`.

- [ ] **Step 2: Detalle de una brecha**

Create `app/portal/evaluaciones/[breachId]/page.tsx` (server component):
- `const { breachId } = await params;` `const breach = await loadClientBreach(breachId);` si `!breach` → `notFound()`.
- Render: título (`areaLabel`), badge de severidad, **gravedad de la multa** (`formatFineClp`), y secciones:
  - "Qué encontramos" → `breach.description`.
  - "Por qué es un riesgo para tu empresa" → `getBreachContent(breach.breachCode)?.whyRisk` (si el contenido es null, omite esta sección).
  - "Qué dice la ley" → `getBreachContent(...)?.lawDetail` (omitir si null) + lista de `breach.articles`.
  - Enlace "Volver a Evaluaciones" → `/portal/evaluaciones`.
- Textos de sección vía i18n `portal.evaluations.detail.*`.

- [ ] **Step 3: Claves i18n**

En `messages/app/portal.json`, bajo `portal`, añade `evaluations: { title, description, locked: {title, body, payCta}, empty, findingLabel, fineLabel, detail: { whatWeFound, whyRisk, whatLawSays, articlesLabel, back } }` y las labels de severidad si no se reusan de `diagnosis.severity.label` (reusa esas si el provider del portal ya las expone — el layout ya incluye el namespace `diagnosis`).

- [ ] **Step 4: Verificar typecheck, lint y tests**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test`
Expected: sin errores; tests verdes.

- [ ] **Step 5: Commit**

```bash
git add app/portal/evaluaciones messages/app/portal.json
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(portal): sección Evaluaciones (lista + detalle de brechas) gated a pagado"
```

---

### Task 6: E2E de Evaluaciones

**Files:**
- Create: `e2e/portal-evaluaciones.spec.ts`

**Interfaces:**
- Consumes: dev server (webServer auto), Supabase local con migraciones, y un cliente **pagado** (reusa el flujo post-pago para llegar al estado pagado, o siembra una empresa+cliente pagados vía service-role en el setup).

- [ ] **Step 1: Escribir la E2E**

Create `e2e/portal-evaluaciones.spec.ts`:
- **Caso pagado:** llegar a un estado de cliente pagado (reusa el recorrido del `e2e/` post-pago: registro → pago con tarjeta de prueba `4242 4242 4242 4242` → webhook marca `paid`; o, si es más estable, siembra en el setup una empresa con `service_paid_at`, un `company_diagnoses` activo + `diagnosis_breaches`, y un `company_members` active con un auth user, vía service-role). Iniciar sesión, ir a `/portal/evaluaciones`, assert que se lista al menos una brecha; abrir el detalle de una y assert que muestra "Qué dice la ley" y la multa.
- **Caso no pagado:** un cliente registrado sin pagar → `/portal/evaluaciones` muestra el estado **bloqueado** (assert el texto de `locked`) y NO lista brechas.

> Si reusar el flujo de pago con Stripe resulta frágil, prefiere el sembrado por service-role de un estado pagado + diagnóstico (más determinista). Usa identificadores únicos por corrida.

- [ ] **Step 2: Ejecutar la E2E**

Run: `pnpm test:e2e portal-evaluaciones`
Expected: PASS (ambos casos).

- [ ] **Step 3: Commit**

```bash
git add e2e/portal-evaluaciones.spec.ts
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "test(e2e): sección Evaluaciones del portal (pagado ve detalle; no pagado bloqueado)"
```

---

## Notas de verificación (convención del repo)

- **Lógica pura** (`getBreachContent`, `formatFineClp`) → tests unitarios Vitest (Tasks 1-2).
- **Loader / rutas / nav** → typecheck/lint + la E2E (Task 6). No se mockea Supabase.

## Fuera de alcance (recordatorio)

Botón/documento de mitigación por brecha (#5), documento consolidado (#5), marcar resuelta + completar (#6), catastro + certificado (#7), infra de documentos (#4), vista del consultor, remoción de lo viejo (#8). El contenido de `breach-content.ts` es borrador pendiente de revisión legal (gate pre-deploy).
