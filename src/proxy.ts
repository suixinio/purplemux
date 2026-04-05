import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { verifyTokenValue } from '@/lib/agent-token';

export const proxy = async (request: NextRequest) => {
  const agentToken = request.headers.get('x-agent-token');
  if (agentToken && verifyTokenValue(agentToken)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: 'next-auth.session-token',
  });

  if (!token) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: [
    '/((?!login|api/auth|api/agent-rpc/|api/status/hook|_next|favicon\\.ico|fonts|.*\\.(?:svg|png|ico|jpg|jpeg|webp|webmanifest|ttf|woff|woff2)).*)',
  ],
};
