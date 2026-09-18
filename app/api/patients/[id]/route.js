import { NextResponse } from 'next/server';

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

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

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

export async function GET(request, context) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: 'Hasta ID gerekli.',
        },
        {
          status: 400,
        }
      );
    }

    const patient = await prisma.patient.findUnique({
      where: {
        id,
      },
      include: {
        treatments: {
          orderBy: {
            performedAt: 'desc',
          },
          include: {
            productUsages: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    unit: true,
                    category: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
            mapPoints: true,
            signSessions: {
              where: {
                status: 'SIGNED',
              },
              select: {
                id: true,
                signedPdfUrl: true,
                templateFile: true,
                signedAt: true,
              },
            },
          },
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        {
          error: 'Hasta bulunamadı.',
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(patient);
  } catch (error) {
    console.error('Hasta detay API hatası:', error);

    return NextResponse.json(
      {
        error: 'Hasta bilgileri alınamadı.',
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(request, context) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: 'Hasta ID gerekli.',
        },
        {
          status: 400,
        }
      );
    }

    const body = await request.json();

    const existingPatient = await prisma.patient.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!existingPatient) {
      return NextResponse.json(
        {
          error: 'Hasta bulunamadı.',
        },
        {
          status: 404,
        }
      );
    }

    const updateData = {};

    if (body.fullName !== undefined) {
      const fullName =
        typeof body.fullName === 'string'
          ? body.fullName.trim()
          : '';

      if (!fullName) {
        return NextResponse.json(
          {
            error: 'Ad Soyad boş bırakılamaz.',
          },
          {
            status: 400,
          }
        );
      }

      updateData.fullName = fullName;
    }

    if (body.phone !== undefined) {
      const phone = normalizePhone(body.phone);

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

      const duplicatePatient = await prisma.patient.findFirst({
        where: {
          phone,
          id: {
            not: id,
          },
        },
        select: {
          id: true,
        },
      });

      if (duplicatePatient) {
        return NextResponse.json(
          {
            error: 'Bu telefon numarası başka bir hastaya kayıtlı.',
          },
          {
            status: 409,
          }
        );
      }

      updateData.phone = phone;
    }

    if (body.birthDate !== undefined) {
      const birthDate = parseBirthDate(body.birthDate);

      if (
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

      updateData.birthDate = birthDate;
    }

    if (body.gender !== undefined) {
      updateData.gender = normalizeOptionalText(body.gender);
    }

    if (body.allergies !== undefined) {
      updateData.allergies = normalizeOptionalText(body.allergies);
    }

    if (body.notes !== undefined) {
      updateData.notes = normalizeOptionalText(body.notes);
    }

    /*
     * Arşivleme / geri aktifleştirme.
     * Fiziksel silme yapılmaz.
     */
    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          error: 'Güncellenecek alan bulunamadı.',
        },
        {
          status: 400,
        }
      );
    }

    const updatedPatient = await prisma.patient.update({
      where: {
        id,
      },
      data: updateData,
    });

    return NextResponse.json(updatedPatient);
  } catch (error) {
    console.error('API Patient Patch Error:', error);

    return NextResponse.json(
      {
        error: 'Hasta bilgileri güncellenemedi.',
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: 'Hasta ID gerekli.',
        },
        {
          status: 400,
        }
      );
    }

    const patient = await prisma.patient.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!patient) {
      return NextResponse.json(
        {
          error: 'Hasta bulunamadı.',
        },
        {
          status: 404,
        }
      );
    }

    if (!patient.isActive) {
      return NextResponse.json({
        success: true,
        archived: true,
      });
    }

    await prisma.patient.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      archived: true,
    });
  } catch (error) {
    console.error('Hasta arşivleme API hatası:', error);

    return NextResponse.json(
      {
        error: 'Hasta arşivlenemedi.',
      },
      {
        status: 500,
      }
    );
  }
}