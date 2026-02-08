import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define public paths that don't require authentication
const PUBLIC_PATHS = new Set([
  '/login',
  '/api/users/login', // Allow login API endpoint
  '/favicon.ico',
])

// Define static resource paths that should bypass middleware
const STATIC_PATHS = new Set([
  '/_next',
  '/images',
  '/static',
  '/logo',
])

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the path is a static resource
  for (const staticPath of STATIC_PATHS) {
    if (pathname.startsWith(staticPath)) {
      return NextResponse.next()
    }
  }
  if (pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }

  // Get token from cookies
  const token = request.cookies.get('token')?.value

  // Check if path is public
  const isPublicPath = PUBLIC_PATHS.has(pathname)

  // If trying to access login page while already authenticated,
  // redirect to home
  if (isPublicPath && pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // Allow access to public paths without authentication
  if (isPublicPath) {
    return NextResponse.next()
  }

  // For all other routes, require authentication
  if (!token) {
    // Redirect to login page and store the attempted URL
    const loginUrl = new URL('/login', request.url)
    // Only store the redirect for non-API routes
    if (!pathname.startsWith('/api/')) {
      loginUrl.searchParams.set('from', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  // If we have a token, allow the request
  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all routes
     * Exclude _next/static, _next/image, and favicon.ico
     */
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
}