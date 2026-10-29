import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, verifyUserToken } from './lib/auth';

// Paths that require admin authentication
const adminProtectedPaths = ['/admin-dynamic', '/api/admin'];
// Paths that require user authentication
const userProtectedPaths = ['/dashboard', '/api/client'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check admin protected paths
  const isAdminProtected = adminProtectedPaths.some((p) => path.startsWith(p));
  if (isAdminProtected) {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = await verifyToken(token);
    if (!payload) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('admin_token');
      return response;
    }
  }

  // Check user protected paths
  const isUserProtected = userProtectedPaths.some((p) => path.startsWith(p));
  if (isUserProtected) {
    const token = request.cookies.get('user_session')?.value;
    if (!token) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/publik/login', request.url));
    }

    const payload = await verifyUserToken(token);
    if (!payload) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const response = NextResponse.redirect(new URL('/publik/login', request.url));
      response.cookies.delete('user_session');
      return response;
    }
  }

  // Redirect authenticated admins away from login page
  if (path === '/login') {
    const token = request.cookies.get('admin_token')?.value;
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        return NextResponse.redirect(new URL('/admin-dynamic', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
