import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/daily-notes            -> tüm notların listesi (arşiv için)
// GET /api/daily-notes?date=...   -> tek bir tarihin notu
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (date) {
      const note = await prisma.dailyNote.findUnique({
        where: { date },
      });
      return NextResponse.json(note || { date, content: '' });
    }

    const notes = await prisma.dailyNote.findMany({
      orderBy: { date: 'desc' },
      take: 30,
    });

    return NextResponse.json(notes);
  } catch (err) {
    return NextResponse.json({ error: 'Notlar alınamadı: ' + err.message }, { status: 500 });
  }
}

// POST /api/daily-notes  body: { date: 'YYYY-MM-DD', content: string }
export async function POST(request) {
  try {
    const { date, content } = await request.json();

    if (!date) {
      return NextResponse.json({ error: 'Tarih bilgisi zorunludur' }, { status: 400 });
    }

    const savedNote = await prisma.dailyNote.upsert({
      where: { date },
      update: { content: content || '' },
      create: { date, content: content || '' },
    });

    return NextResponse.json(savedNote);
  } catch (err) {
    return NextResponse.json({ error: 'Not kaydedilemedi: ' + err.message }, { status: 500 });
  }
}

// DELETE /api/daily-notes?date=YYYY-MM-DD
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Tarih bilgisi zorunludur' }, { status: 400 });
    }

    await prisma.dailyNote.delete({ where: { date } });

    return NextResponse.json({ success: true });
  } catch (err) {
    // Prisma "kayıt bulunamadı" hatası
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Bu tarihe ait not bulunamadı.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Not silinemedi: ' + err.message }, { status: 500 });
  }
}