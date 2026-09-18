import { NextResponse } from 'next/server';
import { getSignedFileUrl } from '@/lib/storage';

// Bu route zaten proxy.js'in genel /api/:path* korumasından geçiyor
// (admin oturumu gerekli). Private Supabase Storage bucket'ındaki dosya
// için anlık imzalı URL üretip yönlendirir.
export async function GET(request, context) {
  try {
    const params = await context.params;
    const path = Array.isArray(params?.path) ? params.path.join('/') : '';

    if (!path) {
      return NextResponse.json({ error: 'Geçersiz dosya yolu' }, { status: 400 });
    }

    const signedUrl = await getSignedFileUrl(path, 300);

    return NextResponse.redirect(signedUrl);
  } catch (err) {
    console.error('GET /api/files error:', err);
    return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 404 });
  }
}
