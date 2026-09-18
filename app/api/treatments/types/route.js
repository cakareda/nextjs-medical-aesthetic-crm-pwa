import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const results = await prisma.treatment.groupBy({
      by: ['treatmentType'],
      _count: { treatmentType: true },
      orderBy: { _count: { treatmentType: 'desc' } },
    });

    const types = results
      .map((r) => r.treatmentType)
      .filter((t) => t && t.trim());

    return NextResponse.json(types);
  } catch (err) {
    console.error('GET /api/treatments/types error:', err);
    return NextResponse.json({ error: 'İşlem türleri alınamadı' }, { status: 500 });
  }
}