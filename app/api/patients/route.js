import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

function normalizePhone(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const raw = String(value).trim();

  if (!raw) {
    return null;
  }

  let digits = raw.replace(/\D/g, '');

  if (!digits) {
    return null;
  }

  // 00 ile başlayan uluslararası formatı normalize et.
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // Türkiye'deki 0XXXXXXXXXX formatını 90XXXXXXXXXX formatına çevir.
  if (digits.startsWith('0') && digits.length === 11) {
    digits = `90${digits.slice(1)}`;
  }

  return digits;
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();

  return text || null;
}

function parseBirthDate(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function isValidId(id) {
  return typeof id === 'string' && id.trim().length > 0;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';

    const normalizedQueryPhone = normalizePhone(q);

    const patients = await prisma.patient.findMany({
      where: {
        isActive: true,
        ...(q
          ? {
              OR: [
                {
                  fullName: {
                    contains: q,
                    mode: 'insensitive',
                  },
                },
                {
                  phone: {
                    contains: q,
                  },
                },
                ...(normalizedQueryPhone
                  ? [
                      {
                        phone: {
                          contains: normalizedQueryPhone,
                        },
                      },
                    ]
                  : []),
              ],
            }
          : {}),
      },
      include: {
        treatments: {
          orderBy: {
            performedAt: 'desc',
          },
          take: 1,
          select: {
            performedAt: true,
            treatmentType: true,
          },
        },
        _count: {
          select: {
            treatments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const result = patients.map((patient) => ({
      id: patient.id,
      fullName: patient.fullName,
      phone: patient.phone,
      birthDate: patient.birthDate,
      treatmentCount: patient._count.treatments,
      lastTreatmentAt: patient.treatments[0]?.performedAt || null,
      lastTreatmentType: patient.treatments[0]?.treatmentType || null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Hasta listesi çekme hatası:', error);

    return NextResponse.json(
      {
        error: 'Hasta listesi alınamadı.',
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const fullName =
      typeof body.fullName === 'string'
        ? body.fullName.trim()
        : '';

    const phone = normalizePhone(body.phone);

    if (!fullName) {
      return NextResponse.json(
        {
          error: 'Ad Soyad alanı zorunludur.',
        },
        {
          status: 400,
        }
      );
    }

    if (!phone) {
      return NextResponse.json(
        {
          error: 'Geçerli bir telefon numarası girilmelidir.',
        },
        {
          status: 400,
        }
      );
    }

    const birthDate = parseBirthDate(body.birthDate);

    if (
      body.birthDate !== undefined &&
      body.birthDate !== null &&
      body.birthDate !== '' &&
      !birthDate
    ) {
      return NextResponse.json(
        {
          error: 'Doğum tarihi geçerli değil.',
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Serializable transaction:
     * Aynı anda iki kayıt isteği gelirse "find + create"
     * yarışını azaltır.
     *
     * DB'de phone @unique olması yine de tavsiye edilir.
     */
    const patient = await prisma.$transaction(
      async (tx) => {
        const existingPatient = await tx.patient.findFirst({
          where: {
            phone,
          },
        });

        if (existingPatient) {
          return {
            patient: existingPatient,
            alreadyExists: true,
          };
        }

        const newPatient = await tx.patient.create({
          data: {
            fullName,
            phone,
            birthDate,
            gender: normalizeOptionalText(body.gender),
            allergies: normalizeOptionalText(body.allergies),
            notes: normalizeOptionalText(body.notes),
            isActive: true,
          },
        });

        return {
          patient: newPatient,
          alreadyExists: false,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 10000,
      }
    );

    return NextResponse.json(
      {
        ...patient.patient,
        alreadyExists: patient.alreadyExists,
      },
      {
        status: patient.alreadyExists ? 200 : 201,
      }
    );
  } catch (error) {
    console.error('Hasta ekleme API hatası:', error);

    /*
     * Serializable transaction concurrency conflict.
     */
    if (error?.code === 'P2034') {
      return NextResponse.json(
        {
          error:
            'Hasta kaydı aynı anda başka bir işlem tarafından oluşturuluyor. Lütfen tekrar deneyin.',
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        error: 'Hasta kaydedilemedi.',
      },
      {
        status: 500,
      }
    );
  }
}
