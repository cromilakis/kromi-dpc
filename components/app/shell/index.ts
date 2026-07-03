/**
 * Barrel del shell de la plataforma interna (/app).
 * Los módulos importan de aquí — sobre todo PageHeader (API estable).
 */
export { PageHeader } from "./page-header";
export type { PageHeaderProps } from "./page-header";

export { AppSidebar } from "./sidebar";

export { AppTopbar } from "./topbar";
export type { AppTopbarProps } from "./topbar";

export { ShellProvider, CompanyScope, useShellCompany } from "./shell-context";
export type {
  ShellCompany,
  CompanyPhase,
  ShellScoreTier,
} from "./shell-context";

export { NavIcon } from "./nav-icon";
export type { NavIconName } from "./nav-icon";
