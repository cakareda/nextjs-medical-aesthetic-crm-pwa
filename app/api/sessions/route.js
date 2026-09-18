import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request) {
  try {
    const { patientName, phone, treatmentType, productBrand, performedBy, templateFile } = await request.json();

    if (!patientName || !treatmentType || !productBrand || !templateFile) {
      return NextResponse.json({ error: 'Eksik alan var' }, { status: 400 });
    }

    const cleanPhone = phone && String(phone).trim() ? String(phone).trim() : null;

    let patient = cleanPhone
      ? await prisma.patient.findFirst({ where: { phone: cleanPhone } })
      : null;

    if (!patient) {
      patient = await prisma.patient.create({
        data: { fullName: patientName, phone: cleanPhone },
      });
    }

    const treatment = await prisma.treatment.create({
      data: {
        patientId: patient.id,
        treatmentType,
        productBrand,
        performedBy: performedBy || null,
      },
    });

    const session = await prisma.signSession.create({
      data: {
        treatmentId: treatment.id,
        templateFile,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Session oluşturma hatası:', error);
    return NextResponse.json({ error: 'Session oluşturulamadı: ' + error.message }, { status: 500 });
  }
}