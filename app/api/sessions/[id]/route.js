import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, context) {
  try {
    const { id } = await context.params;
    const session = await prisma.signSession.findUnique({
      where: { id },
      include: { treatment: { include: { patient: true } } },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Session sorgulama hatası:', error);
    return NextResponse.json({ error: 'Session sorgulanamadı: ' + error.message }, { status: 500 });
  }
}