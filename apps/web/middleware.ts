import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables in middleware')
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    // Standard fetch failure in Edge Runtime or Supabase network error
    console.error('Middleware Auth Error (fetch failed):', error)
  }

  // Fallback to local session check if getUser() fails due to edge runtime network issues
  if (!user) {
    try {
      const { data } = await supabase.auth.getSession()
      user = data.session?.user || null
    } catch (e) {
      // Ignored
    }
  }

  const protectedRoutes = [
    '/dashboard',
    '/symptoms',
    '/documents',
    '/drugs',
    '/profile',
    '/doctor',
    '/clinic'
  ]

  const isProtectedRoute = protectedRoutes.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email']
  const isAuthRoute = authRoutes.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
