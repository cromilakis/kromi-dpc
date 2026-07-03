# kromi-dpc

Proyecto generado con Kromi.

Consulta `.kromi/init.md` y `.kromi/design.md` para detalles funcionales y de diseño.

## Setup local

1. `pnpm install`
2. Supabase local (requiere Docker Desktop): `supabase start` — API en
   `http://127.0.0.1:54321`, DB en `:54322`. Las migraciones y seeds de
   `supabase/` se aplican solos.
3. `.env.local` con las claves locales (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
4. Consultor demo (idempotente, se puede re-ejecutar):

   ```bash
   pnpm seed:consultant
   # o con credenciales propias:
   pnpm seed:consultant -- correo@dominio.cl mi-password "Nombre Apellido"
   ```

   Defaults: `consultor@dpc.local` / `dpc-local-2026` / "Consultor Demo".
   Crea el usuario en Auth (email confirmado) y su fila en `public.profiles`
   con `role = 'consultant'` (allowlist del equipo). Solo entorno local.
5. `pnpm dev` y entrar por `/login` (o directo a `/app`: el middleware
   redirige a `/login?next=…` sin sesión).

Comandos de validación: `pnpm typecheck` · `pnpm lint` · `pnpm test` ·
`pnpm test:e2e`.
