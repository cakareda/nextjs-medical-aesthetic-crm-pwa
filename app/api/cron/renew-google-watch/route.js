import { NextResponse } from 'next/server';
import { renewWatchIfNeeded, getRequestOrigin } from '@/lib/google-calendar';

// proxy.js'in publicApiRoutes listesinde (Vercel Cron admin oturum çerezi
// göndermez) — kendi kendini CRON_SECRET ile korur.
export async function GET(request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  try {
    await renewWatchIfNeeded(getRequestOrigin(request));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Google Takvim kanal yenileme hatası:', err);
    return NextResponse.json({ error: 'Yenilenemedi' }, { status: 500 });
  }
}
