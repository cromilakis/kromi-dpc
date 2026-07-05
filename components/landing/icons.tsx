/**
 * Iconos SVG inline de la landing, extraídos literalmente del prototipo
 * (design/prototype.dc.html, sección isLanding). Todos decorativos:
 * aria-hidden y stroke currentColor (el color lo da el contenedor).
 */

interface IconProps {
  size?: number;
  className?: string;
}

/** Check simple (bullets del entregable y lista del expediente). */
export function CheckIcon({ size = 13, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/**
 * Check circular del H1 del hero. Desviación normalizada (prototype-analysis
 * §9.2.3): el prototipo usa #22C463 (saturado, fuera de paleta); acá se usa
 * el token semántico success-green vía currentColor (regla .kromi/design.md:
 * color solo semántico; la única excepción saturada es el verde WhatsApp).
 */
export function CheckCircleIcon({ size = 58, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path
        d="M8 12.2l2.6 2.6L16 9.4"
        fill="none"
        stroke="#ffffff"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Documento con líneas (CTA de autoevaluación). */
export function DocumentIcon({ size = 17, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 11h8M8 15h4" />
    </svg>
  );
}

/** Archivo con esquina doblada (header del expediente). */
export function FileIcon({ size = 14, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M14 3v5h5" />
      <path d="M6 3h8l5 5v11a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
    </svg>
  );
}

/** Medalla / roseta (certificación privada y dogfooding). */
export function MedalIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 15a6 6 0 100-12 6 6 0 000 12z" />
      <path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5" />
    </svg>
  );
}

/** Escudo con check (confidencialidad por diseño). */
export function ShieldCheckIcon({ size = 22, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/** Menú hamburguesa (nav móvil de la landing). */
export function MenuIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

/** Billete (multa del caso hipotético en "Lo que está en juego"). */
export function MoneyIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 10.5v3M18 10.5v3" />
    </svg>
  );
}

/** Chevron hacia abajo (acordeón de la FAQ; rota en <details open>). */
export function ChevronDownIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** Logotipo de WhatsApp (solo dentro del CTA de WhatsApp). */
export function WhatsAppIcon({ size = 17, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.47 14.38c-.29-.14-1.7-.84-1.96-.93-.26-.1-.45-.14-.64.15-.19.29-.73.93-.9 1.12-.16.19-.33.21-.62.07-.29-.15-1.22-.45-2.32-1.43-.86-.77-1.44-1.71-1.6-2-.17-.29-.02-.44.12-.59.13-.13.29-.34.44-.5.14-.17.19-.29.29-.48.09-.2.05-.37-.03-.51-.07-.14-.64-1.55-.88-2.12-.23-.55-.47-.48-.64-.49h-.55c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38s1.03 2.76 1.17 2.95c.14.19 2.02 3.08 4.88 4.32.68.29 1.21.47 1.63.6.68.22 1.3.19 1.79.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.34z M20.52 3.45A11.86 11.86 0 0012.06 0C5.5 0 .19 5.31.19 11.86c0 2.09.55 4.13 1.6 5.93L.09 24l6.37-1.67a11.85 11.85 0 005.66 1.44h.01c6.55 0 11.86-5.31 11.86-11.86 0-3.17-1.24-6.15-3.47-8.46zM12.06 21.79h-.01a9.86 9.86 0 01-5.02-1.38l-.36-.21-3.73.98.99-3.64-.23-.37a9.82 9.82 0 01-1.51-5.29c0-5.44 4.43-9.87 9.88-9.87 2.64 0 5.12 1.03 6.98 2.9a9.8 9.8 0 012.89 6.98c0 5.45-4.43 9.88-9.88 9.88z" />
    </svg>
  );
}
