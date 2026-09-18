import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { computePaymentStatus } from '@/lib/treatment-utils';

const PERFORMED_BY = 'Nurlana Sarıyeva';

const TOUCH_UP_STATUSES = new Set([
  'NONE',
  'PENDING',
  'COMPLETED',
  'CANCELED',
]);

function parseMoney(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('Geçersiz ödeme tutarı.');
  }

  return Math.round(parsed);
}

function parseQuantity(value) {
  if (value === undefined || value === null || value === '') {
    throw new Error('Ürün miktarı zorunludur.');
  }

  const stringValue = String(value).trim();

  // En fazla 3 ondalık basamak.
  if (!/^\d+(\.\d{1,3})?$/.test(stringValue)) {
    throw new Error('Geçersiz ürün miktarı.');
  }

  const quantity = new Prisma.Decimal(stringValue);

  if (quantity.lte(0)) {
    throw new Error('Ürün miktarı 0’dan büyük olmalıdır.');
  }

  return quantity;
}

function normalizeProductUsages(productUsages) {
  if (productUsages === undefined || productUsages === null) {
    return [];
  }

  if (!Array.isArray(productUsages)) {
    throw new Error('productUsages bir dizi olmalıdır.');
  }

  const normalized = productUsages.map((usage) => {
    if (!usage || typeof usage !== 'object') {
      throw new Error('Geçersiz ürün kullanımı.');
    }

    const productId = String(usage.productId || '').trim();

    if (!productId) {
      throw new Error('Ürün seçimi zorunludur.');
    }

    return {
      productId,
      quantity: parseQuantity(usage.quantity),
    };
  });

  return normalized;
}

function aggregateUsages(usages) {
  const aggregated = new Map();

  for (const usage of usages) {
    const existing = aggregated.get(usage.productId);

    if (existing) {
      existing.quantity = existing.quantity.plus(usage.quantity);
    } else {
      aggregated.set(usage.productId, {
        productId: usage.productId,
        quantity: usage.quantity,
      });
    }
  }

  return Array.from(aggregated.values());
}

async function applyStockOut(tx, productId, quantity) {
  const result = await tx.product.updateMany({
    where: {
      id: productId,
      isActive: true,
      stockQuantity: {
        gte: quantity,
      },
    },
    data: {
      stockQuantity: {
        decrement: quantity,
      },
    },
  });

  if (result.count !== 1) {
    throw new Error('Yetersiz stok veya ürün bulunamadı.');
  }
}

async function createStockMovement(
  tx,
  {
    productId,
    type,
    quantity,
    treatmentId = null,
    note = null,
  }
) {
  return tx.inventoryMovement.create({
    data: {
      productId,
      type,
      quantity,
      treatmentId,
      note,
    },
  });
}

function validateTouchUp(touchUpStatus, touchUpDate) {
  if (
    touchUpStatus !== undefined &&
    touchUpStatus !== null &&
    !TOUCH_UP_STATUSES.has(touchUpStatus)
  ) {
    throw new Error('Geçersiz touch-up durumu.');
  }

  if (touchUpDate !== undefined && touchUpDate !== null) {
    const parsed = new Date(touchUpDate);

    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Geçersiz touch-up tarihi.');
    }
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const patientId = searchParams.get('patientId');
    const id = searchParams.get('id');

    const where = {};

    if (patientId) {
      where.patientId = patientId;
    }

    if (id) {
      where.id = id;
    }

    const treatments = await prisma.treatment.findMany({
      where,
      orderBy: {
        performedAt: 'desc',
      },
      include: {
        patient: true,

        productUsages: {
          include: {
            product: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },

        mapPoints: {
          orderBy: {
            createdAt: 'asc',
          },
        },

        signSessions: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return Response.json(treatments);
  } catch (error) {
    console.error('GET /api/treatments error:', error);

    return Response.json(
      {
        error: 'Tedaviler alınırken bir hata oluştu.',
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

    const patientId = String(body.patientId || '').trim();
    const treatmentType = String(body.treatmentType || '').trim();

    if (!patientId) {
      return Response.json(
        {
          error: 'Hasta seçimi zorunludur.',
        },
        {
          status: 400,
        }
      );
    }

    if (!treatmentType) {
      return Response.json(
        {
          error: 'Tedavi türü zorunludur.',
        },
        {
          status: 400,
        }
      );
    }

    const productUsages = aggregateUsages(
      normalizeProductUsages(body.productUsages)
    );

    const price = parseMoney(body.price, 0);
    const paidAmount = parseMoney(body.paidAmount, 0);

    if (paidAmount > price) {
      return Response.json(
        {
          error: 'Ödenen tutar toplam tutardan fazla olamaz.',
        },
        {
          status: 400,
        }
      );
    }

    validateTouchUp(body.touchUpStatus, body.touchUpDate);

    const touchUpStatus = body.touchUpStatus || 'NONE';

    let touchUpDate = null;

    if (body.touchUpDate) {
      touchUpDate = new Date(body.touchUpDate);

      if (Number.isNaN(touchUpDate.getTime())) {
        return Response.json(
          {
            error: 'Geçersiz touch-up tarihi.',
          },
          {
            status: 400,
          }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({
        where: {
          id: patientId,
        },
      });

      if (!patient) {
        throw new Error('Hasta bulunamadı.');
      }

      if (!patient.isActive) {
        throw new Error('Pasif hasta için tedavi oluşturulamaz.');
      }

      const productIds = productUsages.map((usage) => usage.productId);

      const products =
        productIds.length > 0
          ? await tx.product.findMany({
              where: {
                id: {
                  in: productIds,
                },
                isActive: true,
              },
            })
          : [];

      const productMap = new Map(
        products.map((product) => [product.id, product])
      );

      for (const usage of productUsages) {
        const product = productMap.get(usage.productId);

        if (!product) {
          throw new Error('Seçilen ürünlerden biri bulunamadı.');
        }

        if (product.stockQuantity.lt(usage.quantity)) {
          throw new Error(
            `${product.name} için yeterli stok bulunmuyor. Mevcut stok: ${product.stockQuantity.toString()} ${product.unit.toLowerCase()}.`
          );
        }
      }

      const treatment = await tx.treatment.create({
        data: {
          patientId,
          treatmentType,

          applicationArea:
            body.applicationArea !== undefined &&
            body.applicationArea !== null
              ? String(body.applicationArea).trim() || null
              : null,

          // Bilerek backend tarafından sabit tutuluyor.
          performedBy: PERFORMED_BY,

          notes:
            body.notes !== undefined && body.notes !== null
              ? String(body.notes).trim() || null
              : null,

          price,
          paidAmount,

          paymentStatus: computePaymentStatus(
            price.toString(),
            paidAmount.toString()
          ),

          touchUpStatus,
          touchUpDate,

          beforePhotoUrl:
            body.beforePhotoUrl !== undefined &&
            body.beforePhotoUrl !== null
              ? String(body.beforePhotoUrl).trim() || null
              : null,

          afterPhotoUrl:
            body.afterPhotoUrl !== undefined &&
            body.afterPhotoUrl !== null
              ? String(body.afterPhotoUrl).trim() || null
              : null,

          performedAt: body.performedAt
            ? new Date(body.performedAt)
            : undefined,
        },
      });

      for (const usage of productUsages) {
        await applyStockOut(
          tx,
          usage.productId,
          usage.quantity
        );

        await tx.treatmentProductUsage.create({
          data: {
            treatmentId: treatment.id,
            productId: usage.productId,
            quantity: usage.quantity,
          },
        });

        await createStockMovement(tx, {
          productId: usage.productId,
          type: 'OUT',
          quantity: usage.quantity,
          treatmentId: treatment.id,
          note: `Tedavi kullanımı: ${treatment.treatmentType}`,
        });
      }

      return treatment;
    }, {
      maxWait: 10000,
      timeout: 10000,
    });

    const createdTreatment = await prisma.treatment.findUnique({
      where: {
        id: result.id,
      },
      include: {
        patient: true,

        productUsages: {
          include: {
            product: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },

        mapPoints: {
          orderBy: {
            createdAt: 'asc',
          },
        },

        signSessions: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return Response.json(createdTreatment, {
      status: 201,
    });
  } catch (error) {
    console.error('POST /api/treatments error:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Tedavi oluşturulurken bir hata oluştu.';

    const knownErrors = [
      'Hasta bulunamadı.',
      'Pasif hasta için tedavi oluşturulamaz.',
      'Seçilen ürünlerden biri bulunamadı.',
      'Yetersiz stok veya ürün bulunamadı.',
      'Ürün miktarı zorunludur.',
      'Ürün miktarı 0’dan büyük olmalıdır.',
      'Geçersiz ürün miktarı.',
      'Ürün seçimi zorunludur.',
      'productUsages bir dizi olmalıdır.',
      'Geçersiz ürün kullanımı.',
      'Ödenen tutar toplam tutardan fazla olamaz.',
      'Geçersiz touch-up durumu.',
      'Geçersiz touch-up tarihi.',
    ];

    const isClientError =
      knownErrors.includes(message) ||
      message.includes('için yeterli stok bulunmuyor');

    return Response.json(
      {
        error: isClientError
          ? message
          : 'Tedavi oluşturulurken bir hata oluştu.',
      },
      {
        status: isClientError ? 400 : 500,
      }
    );
  }
}
