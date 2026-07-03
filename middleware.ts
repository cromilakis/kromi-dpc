import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/safe-next-path";

/**
 * Middleware de sesión (patrón oficial @supabase/ssr): refresca el token en
 * cada request cubierto por el matcher y protege la plataforma interna.
 * - /app/* sin sesión → redirect a /login?next=<ruta original>.
 * - /login con sesión → redirect a /app (o al ?next= saneado).
 * Matcher acotado a esas rutas: las páginas públicas no pagan el costo del
 * round-trip a Auth y los assets nunca pasan por aquí.
 * Defensa en profundidad: app/app/layout.tsx re-verifica la sesión y las
 * server actions validan por su cuenta (además de RLS en la base).
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE (doc oficial): nada de lógica entre createServerClient y
  // getUser() — getUser() valida el JWT contra Auth y refresca la sesión.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && pathname.startsWith("/app")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const target = safeNextPath(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(target, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/app/:path*", "/login"],
};
