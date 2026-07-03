/**
 * Deep-merge de catálogos de mensajes next-intl (messages/es.json base +
 * messages/app/*.json de cada módulo). Pura y sin dependencias para poder
 * testearla en aislamiento (test/i18n-merge.test.ts); la consume
 * i18n/request.ts.
 *
 * Regla de propiedad (contrato de módulos): cada módulo es DUEÑO de su
 * archivo messages/app/<modulo>.json y de su namespace; ante una colisión de
 * hoja gana el último archivo en orden alfabético (determinístico), pero una
 * colisión es un bug de namespacing entre módulos, no un caso soportado.
 */

export type MessageTree = { [key: string]: string | MessageTree };

function isMessageSubtree(value: unknown): value is MessageTree {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function deepMergeMessages(
  base: MessageTree,
  extra: MessageTree,
): MessageTree {
  const merged: MessageTree = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const previous = merged[key];
    merged[key] =
      isMessageSubtree(previous) && isMessageSubtree(value)
        ? deepMergeMessages(previous, value)
        : value;
  }
  return merged;
}
