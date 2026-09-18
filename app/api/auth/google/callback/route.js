import { NextResponse } from 'next/server';
import { createOAuthClient, saveConnectionTokens, startWatchChannel, getRequestOrigin } from '@/lib/google-calendar';

// Google'ın geri yönlendirmesi admin oturum çerezini taşımayabileceği için
// proxy.js'in publicApiRoutes listesinde — CSRF koruması `state` parametresiyle
// sağlanıyor (bkz. connect/route.js).
export async function GET(request) {
  const { searchParams } = request.nextUrl;
  const origin = getRequestOrigin(request);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const expectedState = request.cookies.get('google_oauth_state')?.value;

  const failRedirect = (reason) =>
    NextResponse.redirect(`${origin}/admin/appointments?google_error=${encodeURIComponent(reason)}`);

  if (!code || !state || !expectedState || state !== expectedState) {
    return failRedirect('Geçersiz veya süresi dolmuş bağlantı isteği');
  }

  try {
    const redirectUri = `${origin}/api/auth/google/callback`;
    const oauth2Client = createOAuthClient(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      // Kullanıcı zaten daha önce onay verdiyse ve prompt=consent bir şekilde
      // atlandıysa refresh_token gelmeyebilir. Bağlantıyı Google Hesap
      // ayarlarından kaldırıp tekrar denemesi gerekir.
      return failRedirect('Google yenileme anahtarı alınamadı, lütfen tekrar deneyin');
    }

    await saveConnectionTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: new Date(tokens.expiry_date),
      scope: tokens.scope || '',
    });

    try {
      // Webhook kaydı sadece herkese açık bir HTTPS adresiyle çalışır (ör.
      // localhost'ta başarısız olması beklenir) — bu, hesabın bağlanmasını
      // engellememeli, sadece anlık senkron olmadan devam eder.
      await startWatchChannel(origin);
    } catch (watchErr) {
      console.error('Google Takvim webhook kanalı kaydedilemedi (bağlantı yine de kuruldu):', watchErr);
    }

    const response = NextResponse.redirect(`${origin}/admin/appointments?google=connected`);
    response.cookies.delete('google_oauth_state');
    return response;
  } catch (err) {
    console.error('Google Takvim bağlantı hatası:', err);
    return failRedirect('Google Takvim bağlanamadı');
  }
}
