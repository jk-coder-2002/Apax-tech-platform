import { NextRequest, NextResponse } from 'next/server'

const AUTH_COOKIE = 'token'

/**
 * Redirects based on the presence of the httpOnly auth cookie, before any
 * HTML is sent - this is what avoids the hydration flash a client-side
 * check would cause. This is a presence check only, not a signature
 * verification: the real authorization boundary is the Express backend,
 * which verifies the JWT on every /api and /user request regardless of
 * what this middleware decides. Worst case here is a signed-out user
 * briefly reaching a page shell that then fails its data fetch with 401 -
 * not a security hole.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(AUTH_COOKIE)
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/dashboard') && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname === '/login' && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
