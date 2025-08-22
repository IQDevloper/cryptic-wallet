import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

// Routes that require authentication
const protectedRoutes = ['/dashboard'];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/login', '/register'];

// Public routes that don't require authentication
const publicRoutes = ['/', '/api/trpc'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get user from request
  const user = getUserFromRequest(request);
  const isAuthenticated = !!user;

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if the current route is an auth route (login/register)
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Handle protected routes
  if (isProtectedRoute && !isAuthenticated) {
    // Redirect to login with a return URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Handle auth routes when already authenticated
  if (isAuthRoute && isAuthenticated) {
    // Check if there's a return URL
    const returnTo = request.nextUrl.searchParams.get('returnTo') || '/dashboard';
    return NextResponse.redirect(new URL(returnTo, request.url));
  }

  // Allow the request to continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};