export type PortalServiceState = "pending" | "preparing" | "ready";

/**
 * Estado del servicio en el portal del cliente:
 * - ready: el equipo publicó el trabajo (client_ready_at) — prima sobre todo,
 *   así el portal del cliente que YA fue provisionado por un consultor (sin
 *   pago público) también muestra su dashboard.
 * - preparing: pagó (service_paid_at) pero aún no se publica.
 * - pending: no ha pagado.
 */
export function portalServiceState(input: {
  servicePaidAt: string | null;
  clientReadyAt: string | null;
}): PortalServiceState {
  if (input.clientReadyAt) return "ready";
  if (input.servicePaidAt) return "preparing";
  return "pending";
}
