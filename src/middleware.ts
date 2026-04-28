import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  const { pathname } = request.nextUrl;
  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch";

  // Public routes — never require auth
  const publicRoutes = [
    "/login",
    "/signup",
    "/auth/callback",
    "/manifest.json",
    "/favicon.ico",
  ];
  const isPublic =
    publicRoutes.some((r) => pathname.startsWith(r)) || pathname === "/";

  // Skip auth check entirely for prefetch requests
  if (isPrefetch) {
    return supabaseResponse;
  }

  // Fast path: no auth cookie → redirect protected routes to login
  const authCookie = request.cookies
    .getAll()
    .find((c) => c.name.includes("auth-token"));
  if (!authCookie) {
    if (!isPublic) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return supabaseResponse;
  }

  // Get user — wrap in try/catch to handle stale/invalid refresh tokens gracefully
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // refresh_token_not_found or similar — session is dead
      // For protected routes: clear cookies + redirect to login
      if (!isPublic) {
        const loginUrl = new URL("/login", request.url);
        const response = NextResponse.redirect(loginUrl);
        // Clear all Supabase auth cookies so the client starts fresh
        request.cookies
          .getAll()
          .filter(
            (c) => c.name.includes("auth-token") || c.name.includes("sb-"),
          )
          .forEach((c) => response.cookies.delete(c.name));
        return response;
      }
      return supabaseResponse;
    }
    user = data.user;
  } catch {
    // Network or unexpected error — fail open for public routes, redirect otherwise
    if (!isPublic) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return supabaseResponse;
  }

  // Not logged in → redirect protected routes to login
  if (!user) {
    if (!isPublic) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return supabaseResponse;
  }

  // Logged in user → get role if needed
  const isManagerRoute = pathname.startsWith("/manager");
  const isStudentRoute = pathname.startsWith("/student");
  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const needsRole = isAuthRoute || isManagerRoute || isStudentRoute;

  let role = null;
  if (needsRole) {
    role = user.user_metadata?.role;
    if (!role) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      role = profile?.role;
    }
  }

  // Logged-in user on auth route → redirect to their dashboard
  if (isAuthRoute) {
    const target = role === "manager" ? "/manager/rooms" : "/student/rooms";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // Role-based route protection
  if (isManagerRoute && role !== "manager") {
    return NextResponse.redirect(new URL("/student/rooms", request.url));
  }
  if (isStudentRoute && role !== "student") {
    return NextResponse.redirect(new URL("/manager/rooms", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2)$).*)",
  ],
};
