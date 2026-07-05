import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(
        new URL('.', import.meta.url),
      ),
      // `server-only` lanza al importarse fuera de React Server; en vitest se
      // stubea vacío (el guard real lo aplica el build de Next). Permite
      // testear lib/self-assessment/scoring.server.ts en aislamiento.
      'server-only': fileURLToPath(
        new URL('./test/stubs/server-only.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.test.{ts,tsx}'],
  },
})
