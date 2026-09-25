import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createOAuthClient, getRequestOrigin } from '@/lib/google-calendar';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

export async function GET(request) {
  const state = crypto.randomBytes(24).toString('hex');
  const redirectUri = `${getRequestOrigin(request)}/api/auth/google/callback`;

  const oauth2Client = createOAuthClient(redirectUri);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', 
    scope: SCOPES,
    state,
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  });

  return response;
}
