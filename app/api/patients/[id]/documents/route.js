import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Eski (kağıt üzerinde imzalanmış) onam formlarının taranmış/fotoğraflanmış
// halini hasta profiline eklemek için — dijital imza akışından bağımsız,
// stok düşümü veya onam süreciyle hiçbir ilgisi yok.
export async function POST(request, context) {
  try {
    const { id } = await context.params;
    const { url, label } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'Belge adresi gerekli.' }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({ where: { id }, select: { id: true } });
    if (!patient) {
      return NextResponse.json({ error: 'Hasta bulunamadı.' }, { status: 404 });
    }

    const document = await prisma.patientDocument.create({
      data: {
        patientId: id,
        url,
        label: label ? String(label).trim() || null : null,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Hasta belgesi ekleme hatası:', error);
    return NextResponse.json({ error: 'Belge eklenemedi.' }, { status: 500 });
  }
}
