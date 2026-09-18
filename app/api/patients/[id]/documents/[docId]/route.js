import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(request, context) {
  try {
    const { id, docId } = await context.params;

    const document = await prisma.patientDocument.findUnique({ where: { id: docId } });
    if (!document || document.patientId !== id) {
      return NextResponse.json({ error: 'Belge bulunamadı.' }, { status: 404 });
    }

    await prisma.patientDocument.delete({ where: { id: docId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Hasta belgesi silme hatası:', error);
    return NextResponse.json({ error: 'Belge silinemedi.' }, { status: 500 });
  }
}
