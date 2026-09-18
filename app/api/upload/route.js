import { NextResponse } from 'next/server';
import { uploadToStorage } from '@/lib/storage';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'Dosya seçilmedi' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Sadece PNG, JPEG, WEBP veya PDF formatları kabul edilir.' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'Dosya boyutu 8MB sınırını aşıyor.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const url = await uploadToStorage(`uploads/${fileName}`, buffer, file.type);

    return NextResponse.json({ url });
  } catch (err) {
    console.error('Yükleme hatası:', err);
    return NextResponse.json({ error: 'Görsel yüklenemedi' }, { status: 500 });
  }
}