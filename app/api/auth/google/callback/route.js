import { NextResponse } from 'next/server';
import { createOAuthClient, saveConnectionTokens, startWatchChannel, getRequestOrigin } from '@/lib/google-calendar';

export async function GET(request) {
  const { searchParams } = request.nextUrl;
  const origin = getRequestOrigin(request);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const expectedState = request.cookies.get('google_oauth_state')?.value;

  const failRedirect = (reason) =>
    NextResponse.redirect(`${origin}/admin?google_error=${encodeURIComponent(reason)}`);

  if (!code || !state || !expectedState || state !== expectedState) {
    return failRedirect('Geçersiz veya süresi dolmuş bağlantı isteği');
  }

  try {
    const redirectUri = `${origin}/api/auth/google/callback`;
    const oauth2Client = createOAuthClient(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return failRedirect('Google yenileme anahtarı alınamadı, lütfen tekrar deneyin');
    }

    await saveConnectionTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: new Date(tokens.expiry_date),
      scope: tokens.scope || '',
    });

    try {

      await startWatchChannel(origin);
    } catch (watchErr) {
      console.error('Google Takvim webhook kanalı kaydedilemedi (bağlantı yine de kuruldu):', watchErr);
    }

    const response = NextResponse.redirect(`${origin}/admin?google=connected`);
    response.cookies.delete('google_oauth_state');
    return response;
  } catch (err) {
    console.error('Google Takvim bağlantı hatası:', err);
    return failRedirect('Google Takvim bağlanamadı');
  }
}
