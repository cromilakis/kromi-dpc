"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Database } from "@/lib/supabase/types";

/**
 * Contexto del shell interno: puente entre el layout de empresa
 * (app/app/empresas/[id]/layout.tsx, que carga la empresa en servidor) y el
 * sidebar/topbar que viven en el layout PADRE (app/app/layout.tsx) y por eso
 * no pueden recibir la empresa por props. El modo del sidebar NO depende de
 * este contexto (se deriva del pathname, estable en SSR); solo el bloque de
 * contexto (nombre, rubro, fase) espera estos datos y muestra un skeleton en
 * el primer paint de una carga dura.
 */

export type CompanyPhase = Database["public"]["Enums"]["company_phase"];

export interface ShellCompany {
  id: string;
  name: string;
  /** Iniciales (2 letras) del avatar cuadrado del prototipo. */
  initials: string;
  sectorName: string | null;
  phase: CompanyPhase;
  complexityScore: number | null;
}

interface ShellContextValue {
  company: ShellCompany | null;
  setCompany: (company: ShellCompany | null) => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<ShellCompany | null>(null);
  const value = useMemo(() => ({ company, setCompany }), [company]);
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShellCompany(): ShellContextValue {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error(
      "useShellCompany requiere <ShellProvider> (shell de /app en app/app/layout.tsx).",
    );
  }
  return context;
}

/**
 * Publica en el shell la empresa ya cargada en servidor y la limpia al salir
 * del segmento /app/empresas/[id]. La renderiza SOLO el layout de empresa.
 */
export function CompanyScope({
  company,
  children,
}: {
  company: ShellCompany;
  children: ReactNode;
}) {
  const { setCompany } = useShellCompany();
  useEffect(() => {
    setCompany(company);
    return () => setCompany(null);
  }, [company, setCompany]);
  return <>{children}</>;
}
