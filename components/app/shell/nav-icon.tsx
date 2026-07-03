/**
 * Iconos del nav del sidebar — paths EXACTOS del helper ic(d) del prototipo
 * (design/prototype.dc.html líneas 1279–1288): 16px, viewBox 24, stroke 1.6,
 * currentColor, extremos redondeados. Decorativos (siempre acompañan al label
 * de texto), por eso aria-hidden.
 */

export type NavIconName =
  | "panel"
  | "companies"
  | "newCompany"
  | "summary"
  | "checklist"
  | "risks"
  | "solutions"
  | "plan"
  | "evidence"
  | "certification";

const NAV_ICON_PATHS: Record<NavIconName, string[]> = {
  panel: ["M3 12l9-9 9 9M5 10v10a1 1 0 001 1h12a1 1 0 001-1V10"],
  companies: [
    "M3 21h18",
    "M5 21V5a1 1 0 011-1h7a1 1 0 011 1v16",
    "M18 21v-9a1 1 0 00-1-1h-3",
    "M8 8h2M8 12h2M8 16h2",
  ],
  newCompany: ["M12 5v14", "M5 12h14"],
  summary: [
    "M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1z",
    "M8 9h8M8 13h5",
  ],
  checklist: ["M9 6h11M9 12h11M9 18h11", "M4 6h.01M4 12h.01M4 18h.01"],
  risks: ["M12 3l9 16H3z", "M12 10v4", "M12 17h.01"],
  solutions: [
    "M9 18h6",
    "M10 21h4",
    "M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3z",
  ],
  plan: [
    "M11 6h9M11 12h9M11 18h9",
    "M3.5 6l1.2 1.2L7 5",
    "M3.5 12l1.2 1.2L7 11",
    "M3.5 18l1.2 1.2L7 17",
  ],
  evidence: ["M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"],
  certification: [
    "M12 15a6 6 0 100-12 6 6 0 000 12z",
    "M8.5 13.5L7 22l5-3 5 3-1.5-8.5",
  ],
};

export function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {NAV_ICON_PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
