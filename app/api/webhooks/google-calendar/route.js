import { NextResponse } from 'next/server';
import { getConnection, pullAndApplyChanges } from '@/lib/google-calendar';

// proxy.js'in publicApiRoutes listesinde (Google'ın push bildirimi admin
// oturum çerezi taşımaz) — güvenlik, Google'ın kanal kaydında belirlediğimiz
// paylaşılan `channelToken`'ın header'da geri gelmesiyle sağlanıyor.
export async function POST(request) {
  try {
    const channelId = request.headers.get('x-goog-channel-id');
    const channelToken = request.headers.get('x-goog-channel-token');
    const resourceState = request.headers.get('x-goog-resource-state');

    const connection = await getConnection();

    if (!connection || connection.channelId !== channelId || connection.channelToken !== channelToken) {
      return NextResponse.json({ error: 'Geçersiz webhook kanalı' }, { status: 403 });
    }

    // 'sync' durumu, kanal ilk kaydedildiğinde Google'ın gönderdiği doğrulama
    // pingidir — herhangi bir değişiklik taşımaz.
    if (resourceState && resourceState !== 'sync') {
      await pullAndApplyChanges();
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Google Takvim webhook hatası:', err);
    // Google başarısız yanıtlarda bildirimleri tekrar deneyebilir; yine de
    // 200 dönmek tekrar denemelerin birikmesini önler, hata zaten loglanıyor.
    return NextResponse.json({ success: false });
  }
}
