import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE = 'certingo_token';

// UX gating only: the cookie mirrors the bearer token so we can redirect
// unauthenticated visitors early. Real token validation happens in the backend
// (the axios 401 interceptor logs out if the token is invalid/expired).
export function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/learn/:path*',
    '/practice/:path*',
    '/exam/:path*',
    '/progress/:path*',
    '/review/:path*',
    '/onboarding/:path*',
    '/diagnostic/:path*',
    '/admin/:path*',
  ],
};
