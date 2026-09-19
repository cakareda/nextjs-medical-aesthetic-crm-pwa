import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(request, context) {
  try {
    const { id, photoId } = await context.params;

    const photo = await prisma.treatmentPhoto.findUnique({ where: { id: photoId } });
    if (!photo || photo.treatmentId !== id) {
      return NextResponse.json({ error: 'Fotoğraf bulunamadı.' }, { status: 404 });
    }

    await prisma.treatmentPhoto.delete({ where: { id: photoId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Tedavi fotoğrafı silme hatası:', error);
    return NextResponse.json({ error: 'Fotoğraf silinemedi.' }, { status: 500 });
  }
}
