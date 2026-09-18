import { NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';

export function proxy(request) {
  const sessionCookie = request.cookies.get('admin_session');
  const session = sessionCookie && verifySessionToken(sessionCookie.value, process.env.SESSION_SECRET)
    ? sessionCookie
    : null;
  const { pathname } = request.nextUrl;
  const method = request.method;

  const isAdminPage = pathname.startsWith('/admin');
  const isLoginPage = pathname === '/login';

  // Sadece hastanın imza linkiyle okuyacağı GET isteği herkese açık.
  // POST /api/sessions (yeni oturum oluşturma) admin yetkisi ister.
  const isPublicSessionRead =
    pathname.startsWith('/api/sessions/') && method === 'GET';

  const publicApiRoutes = [
    '/api/auth/login',
    '/api/auth/logout',
    '/api/sign-pdf',
    '/api/webhooks/google-calendar',
  ];

  const isProtectedApi =
    pathname.startsWith('/api/') &&
    !isPublicSessionRead &&
    !publicApiRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedApi && !session) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  if (isAdminPage && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isLoginPage && session) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/api/:path*'],
};
