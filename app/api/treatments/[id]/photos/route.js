import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VALID_TYPES = ['BEFORE', 'AFTER'];

// Öncesi/sonrası fotoğraf albümüne bir fotoğraf ekler. Tek bir tedaviye
// birden fazla fotoğraf eklenebilsin diye — eski tekli beforePhotoUrl/
// afterPhotoUrl alanlarının yerine geçer.
export async function POST(request, context) {
  try {
    const { id } = await context.params;
    const { url, type } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'Fotoğraf adresi gerekli.' }, { status: 400 });
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Geçersiz fotoğraf türü.' }, { status: 400 });
    }

    const treatment = await prisma.treatment.findUnique({ where: { id }, select: { id: true } });
    if (!treatment) {
      return NextResponse.json({ error: 'İşlem bulunamadı.' }, { status: 404 });
    }

    const photo = await prisma.treatmentPhoto.create({
      data: { treatmentId: id, url, type },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error('Tedavi fotoğrafı ekleme hatası:', error);
    return NextResponse.json({ error: 'Fotoğraf eklenemedi.' }, { status: 500 });
  }
}
