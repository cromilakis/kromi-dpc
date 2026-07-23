import Image from "next/image";
import { cn } from "./cn";

/**
 * Logo — /public/kpc-logo.png (lockup horizontal KPC | Kromi Privacy Center)
 * vía next/image con altura configurable. Dimensiones intrínsecas del asset:
 * 1952x806 (ratio ancho/alto fijo para evitar layout shift). El alt es prop
 * obligatoria (cero strings hardcodeados).
 */
const INTRINSIC_WIDTH = 1661;
const INTRINSIC_HEIGHT = 312;

export interface LogoProps {
  alt: string;
  /** Altura en px; el ancho se deriva del ratio intrínseco. */
  height?: number;
  className?: string;
  priority?: boolean;
}

export function Logo({ alt, height = 28, className, priority }: LogoProps) {
  const width = Math.round((height * INTRINSIC_WIDTH) / INTRINSIC_HEIGHT);
  return (
    <Image
      src="/kpc-logo.png"
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={cn("shrink-0", className)}
    />
  );
}
