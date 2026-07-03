import { promises as fs } from 'node:fs'
import path from 'node:path'
import { getRequestConfig } from 'next-intl/server'
import { deepMergeMessages, type MessageTree } from './merge-messages'

/**
 * Config de next-intl (single-locale es): sirve messages/es.json deep-mergeado
 * con TODOS los messages/app/*.json (un archivo por módulo de la plataforma
 * interna; cada módulo es dueño del suyo, el shell solo hace el merge).
 *
 * Se usa fs.readdir (no imports estáticos) para que agregar un módulo no
 * requiera tocar este archivo: request.ts corre en runtime Node (no edge),
 * compatible con Turbopack. Para que `next build` empaquete los JSON leídos
 * por fs en el server bundle, next.config.ts los declara en
 * outputFileTracingIncludes.
 */

const MODULE_MESSAGES_DIR = path.join(process.cwd(), 'messages', 'app')

async function loadModuleMessages(): Promise<MessageTree[]> {
  let entries: string[]
  try {
    entries = await fs.readdir(MODULE_MESSAGES_DIR)
  } catch {
    // Sin messages/app/ todavía: solo el catálogo base.
    return []
  }
  // Orden alfabético fijo → merge determinístico entre builds.
  const files = entries.filter((name) => name.endsWith('.json')).sort()
  return Promise.all(
    files.map(async (name) => {
      const raw = await fs.readFile(path.join(MODULE_MESSAGES_DIR, name), 'utf8')
      return JSON.parse(raw) as MessageTree
    }),
  )
}

async function buildMessages(): Promise<MessageTree> {
  const base = (await import('../messages/es.json')).default as MessageTree
  const moduleMessages = await loadModuleMessages()
  return moduleMessages.reduce(
    (merged, messages) => deepMergeMessages(merged, messages),
    base,
  )
}

// Cache solo en producción: en dev cada request relee los JSON (editar un
// mensaje no exige reiniciar el server).
let cachedMessages: Promise<MessageTree> | null = null

export default getRequestConfig(async () => {
  const locale = 'es'
  if (process.env.NODE_ENV === 'production') {
    cachedMessages ??= buildMessages()
    return { locale, messages: await cachedMessages }
  }
  return { locale, messages: await buildMessages() }
})
