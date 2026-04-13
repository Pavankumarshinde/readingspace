import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl
  const isPrefetch = request.headers.get('next-router-prefetch') === '1' || request.headers.get('purpose') === 'prefetch'

  // Public routes
  const publicRoutes = ['/login', '/signup', '/auth/callback', '/manifest.json', '/favicon.ico']
  const isPublic = publicRoutes.some(r => pathname.startsWith(r)) || pathname === '/'

  // Aggressive Bypass: If it's a prefetch, skip EVERYTHING and just return NextResponse.next()
  // We handle the real security check on the actual page load.
  if (isPrefetch) {
    return supabaseResponse
  }

  // Quick check: If no auth cookies exist, we can skip getUser() for public routes
  const authCookie = request.cookies.getAll().find(c => c.name.includes('auth-token'))
  if (!authCookie) {
    if (!isPublic) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  // Only call getUser if we have a cookie and it's NOT a prefetch
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Not logged in -> Redirect to login (if not public)
  if (!user) {
    if (!isPublic) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  // 2. Logged in -> Get role if needed
  const isManagerRoute = pathname.startsWith('/manager')
  const isStudentRoute = pathname.startsWith('/student')
  const isAuthRoute = pathname === '/login' || pathname === '/signup'
  const needsRole = isAuthRoute || isManagerRoute || isStudentRoute

  let role = null
  if (needsRole) {
    // Check if we can get role from metadata first to skip DB call
    role = user.user_metadata?.role
    
    // If not in metadata, fetch from DB
    if (!role) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      role = profile?.role
    }
  }

  // 3. User is on public route (like /login) -> Redirect to their dashboard
  if (isAuthRoute) {
    const target = role === 'manager' ? '/manager/dashboard' : '/student/rooms'
    return NextResponse.redirect(new URL(target, request.url))
  }

  // 4. Role-based route protection
  if (isManagerRoute && role !== 'manager') {
    return NextResponse.redirect(new URL('/student/rooms', request.url))
  }
  if (isStudentRoute && role !== 'student') {
    return NextResponse.redirect(new URL('/manager/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt, manifest.json (metadata files)
     * - public files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2)$).*)',
  ],
}
