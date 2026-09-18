import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { computePaymentStatus } from '@/lib/treatment-utils';

const PERFORMED_BY = 'Nurlana Sarıyeva';

const TOUCH_UP_STATUSES = [
  'NONE',
  'PENDING',
  'COMPLETED',
  'CANCELED',
];

function parseMoney(value) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return Math.round(number);
}

function parseQuantity(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const stringValue = String(value).trim();

  // Sadece pozitif sayılar ve en fazla 3 ondalık basamak.
  if (!/^\d+(\.\d{1,3})?$/.test(stringValue)) {
    return null;
  }

  const quantity = new Prisma.Decimal(stringValue);

  if (quantity.lte(0)) {
    return null;
  }

  return quantity;
}

function normalizeProductUsages(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  const usages = [];

  for (const item of value) {
    const productId = String(item?.productId || '').trim();
    const quantity = parseQuantity(item?.quantity);

    if (!productId || quantity === null) {
      return null;
    }

    usages.push({
      productId,
      quantity,
    });
  }

  return usages;
}

function aggregateUsages(usages) {
  const map = new Map();

  for (const usage of usages) {
    const current =
      map.get(usage.productId) ||
      new Prisma.Decimal(0);

    map.set(
      usage.productId,
      current.plus(usage.quantity)
    );
  }

  return map;
}

async function createStockMovement(
  tx,
  productId,
  type,
  quantity,
  treatmentId,
  note
) {
  await tx.inventoryMovement.create({
    data: {
      productId,
      type,
      quantity,
      treatmentId,
      note: note || null,
    },
  });
}

async function applyStockDecrease(
  tx,
  productId,
  quantity
) {
  const decimalQuantity =
    quantity instanceof Prisma.Decimal
      ? quantity
      : new Prisma.Decimal(String(quantity));

  const result = await tx.product.updateMany({
    where: {
      id: productId,
      isActive: true,
      stockQuantity: {
        gte: decimalQuantity,
      },
    },
    data: {
      stockQuantity: {
        decrement: decimalQuantity,
      },
    },
  });

  if (result.count !== 1) {
    const product = await tx.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    if (!product.isActive) {
      throw new Error('PRODUCT_INACTIVE');
    }

    throw new Error('INSUFFICIENT_STOCK');
  }
}

async function applyStockReturn(
  tx,
  productId,
  quantity
) {
  const decimalQuantity =
    quantity instanceof Prisma.Decimal
      ? quantity
      : new Prisma.Decimal(String(quantity));

  const result = await tx.product.updateMany({
    where: {
      id: productId,
    },
    data: {
      stockQuantity: {
        increment: decimalQuantity,
      },
    },
  });

  if (result.count !== 1) {
    throw new Error('PRODUCT_NOT_FOUND');
  }
}

export async function PATCH(request, context) {
  try {
    const params = await context.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json(
        {
          error: 'Geçersiz işlem ID',
        },
        {
          status: 400,
        }
      );
    }

    const body = await request.json();

    const result = await prisma.$transaction(
      async (tx) => {
        const existing =
          await tx.treatment.findUnique({
            where: {
              id,
            },
            include: {
              productUsages: true,
            },
          });

        if (!existing) {
          throw new Error('TREATMENT_NOT_FOUND');
        }

        const updateData = {};

        /*
         * Tedavi türü
         */
        if (body.treatmentType !== undefined) {
          const treatmentType = String(
            body.treatmentType
          ).trim();

          if (!treatmentType) {
            throw new Error(
              'INVALID_TREATMENT_TYPE'
            );
          }

          updateData.treatmentType =
            treatmentType;
        }

        /*
         * Uygulama alanı
         */
        if (body.applicationArea !== undefined) {
          updateData.applicationArea =
            body.applicationArea
              ? String(
                  body.applicationArea
                ).trim()
              : null;
        }

        /*
         * Notlar
         */
        if (body.notes !== undefined) {
          updateData.notes =
            body.notes
              ? String(body.notes).trim()
              : null;
        }

        /*
         * performedBy frontend'den alınmaz.
         * Backend tarafından sabit tutulur.
         */
        updateData.performedBy = PERFORMED_BY;

        /*
         * Touch-up / kontrol durumu
         */
        if (body.touchUpStatus !== undefined) {
          if (
            !TOUCH_UP_STATUSES.includes(
              body.touchUpStatus
            )
          ) {
            throw new Error(
              'INVALID_TOUCH_UP_STATUS'
            );
          }

          updateData.touchUpStatus =
            body.touchUpStatus;
        }

        /*
         * Touch-up tarihi
         */
        if (body.touchUpDate !== undefined) {
          if (
            body.touchUpDate === null ||
            body.touchUpDate === ''
          ) {
            updateData.touchUpDate = null;
          } else {
            const touchUpDate = new Date(
              body.touchUpDate
            );

            if (
              Number.isNaN(
                touchUpDate.getTime()
              )
            ) {
              throw new Error(
                'INVALID_TOUCH_UP_DATE'
              );
            }

            updateData.touchUpDate =
              touchUpDate;
          }
        }

        /*
         * Ön fotoğraf
         */
        if (body.beforePhotoUrl !== undefined) {
          updateData.beforePhotoUrl =
            body.beforePhotoUrl
              ? String(
                  body.beforePhotoUrl
                ).trim()
              : null;
        }

        /*
         * Son fotoğraf
         */
        if (body.afterPhotoUrl !== undefined) {
          updateData.afterPhotoUrl =
            body.afterPhotoUrl
              ? String(
                  body.afterPhotoUrl
                ).trim()
              : null;
        }

        /*
         * Finansal bilgiler
         */
        if (
          body.price !== undefined ||
          body.paidAmount !== undefined
        ) {
          const newPrice =
            body.price !== undefined
              ? parseMoney(body.price)
              : existing.price;

          const newPaidAmount =
            body.paidAmount !== undefined
              ? parseMoney(body.paidAmount)
              : existing.paidAmount;

          if (
            newPrice === null ||
            newPaidAmount === null
          ) {
            throw new Error(
              'INVALID_PAYMENT'
            );
          }

          if (
            newPrice >= 0 &&
            newPaidAmount > newPrice
          ) {
            throw new Error(
              'PAID_AMOUNT_TOO_HIGH'
            );
          }

          updateData.price = newPrice;
          updateData.paidAmount =
            newPaidAmount;

          updateData.paymentStatus =
            computePaymentStatus(
              newPrice,
              newPaidAmount
            );
        }

        /*
         * Ürün kullanımları
         *
         * productUsages gönderilmediyse
         * mevcut kullanım kayıtlarına dokunulmaz.
         *
         * [] gönderilirse tüm ürün kullanımları
         * kaldırılır ve stok geri eklenir.
         */
        if (
          body.productUsages !== undefined
        ) {
          const newProductUsages =
            normalizeProductUsages(
              body.productUsages
            );

          if (!newProductUsages) {
            throw new Error(
              'INVALID_PRODUCT_USAGES'
            );
          }

          const oldMap =
            aggregateUsages(
              existing.productUsages.map(
                (usage) => ({
                  productId:
                    usage.productId,
                  quantity:
                    usage.quantity,
                })
              )
            );

          const newMap =
            aggregateUsages(
              newProductUsages
            );

          const allProductIds =
            new Set([
              ...oldMap.keys(),
              ...newMap.keys(),
            ]);

          /*
           * Önce bütün ürünlerin varlığını
           * ve aktiflik durumunu kontrol et.
           */
          for (
            const productId of allProductIds
          ) {
            const product =
              await tx.product.findUnique({
                where: {
                  id: productId,
                },
              });

            if (!product) {
              throw new Error(
                'PRODUCT_NOT_FOUND'
              );
            }

            /*
             * Pasif ürün daha önce bu tedavide
             * kullanılmışsa mevcut kayıt korunabilir.
             *
             * Ancak pasif ürün yeni kullanım
             * olarak eklenemez.
             */
            const existedBefore =
              oldMap.has(productId);

            if (
              !product.isActive &&
              !existedBefore
            ) {
              throw new Error(
                'PRODUCT_INACTIVE'
              );
            }
          }

          /*
           * Stok farklarını hesapla.
           *
           * new > old
           *   => stoktan OUT
           *
           * new < old
           *   => stoğa RETURN
           */
          for (
            const productId of allProductIds
          ) {
            const oldQuantity =
              oldMap.get(productId) ||
              new Prisma.Decimal(0);

            const newQuantity =
              newMap.get(productId) ||
              new Prisma.Decimal(0);

            const difference =
              newQuantity.minus(
                oldQuantity
              );

            /*
             * Kullanım arttı.
             */
            if (difference.gt(0)) {
              await applyStockDecrease(
                tx,
                productId,
                difference
              );

              await createStockMovement(
                tx,
                productId,
                'OUT',
                difference,
                id,
                'Tedavi ürün kullanımı güncellendi'
              );
            }

            /*
             * Kullanım azaldı.
             */
            if (difference.lt(0)) {
              const returnedQuantity =
                difference.abs();

              await applyStockReturn(
                tx,
                productId,
                returnedQuantity
              );

              await createStockMovement(
                tx,
                productId,
                'RETURN',
                returnedQuantity,
                id,
                'Tedavi ürün kullanımı azaltıldı'
              );
            }
          }

          /*
           * Eski ürün kullanım kayıtlarını temizle.
           */
          await tx.treatmentProductUsage.deleteMany({
            where: {
              treatmentId: id,
            },
          });

          /*
           * Yeni ürün kullanım kayıtlarını oluştur.
           */
          if (newProductUsages.length > 0) {
            await tx.treatmentProductUsage.createMany({
              data: newProductUsages.map(
                (usage) => ({
                  treatmentId: id,
                  productId:
                    usage.productId,
                  quantity:
                    usage.quantity,
                })
              ),
            });
          }
        }

        /*
         * Tedaviyi güncelle.
         */
        const updated =
          await tx.treatment.update({
            where: {
              id,
            },
            data: updateData,
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
                select: {
                  id: true,
                  status: true,
                  signedPdfUrl: true,
                  signedAt: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
              },
            },
          });

        return updated;
      },
      {
        maxWait: 10000,
        timeout: 10000,
      }
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error(
      'PATCH /api/treatments/[id] error:',
      err
    );

    const errorCode =
      err instanceof Error
        ? err.message
        : '';

    if (
      errorCode ===
      'TREATMENT_NOT_FOUND'
    ) {
      return NextResponse.json(
        {
          error: 'İşlem bulunamadı',
        },
        {
          status: 404,
        }
      );
    }

    if (
      errorCode ===
      'PRODUCT_NOT_FOUND'
    ) {
      return NextResponse.json(
        {
          error: 'Ürün bulunamadı',
        },
        {
          status: 404,
        }
      );
    }

    if (
      errorCode ===
      'PRODUCT_INACTIVE'
    ) {
      return NextResponse.json(
        {
          error:
            'Pasif ürün yeni tedavi kullanımına eklenemez',
        },
        {
          status: 400,
        }
      );
    }

    if (
      errorCode ===
      'INSUFFICIENT_STOCK'
    ) {
      return NextResponse.json(
        {
          error: 'Yetersiz stok',
        },
        {
          status: 400,
        }
      );
    }

    if (
      errorCode ===
      'INVALID_PRODUCT_USAGES'
    ) {
      return NextResponse.json(
        {
          error:
            'Ürün kullanımları geçersiz',
        },
        {
          status: 400,
        }
      );
    }

    if (
      errorCode ===
      'INVALID_TREATMENT_TYPE'
    ) {
      return NextResponse.json(
        {
          error:
            'İşlem türü boş olamaz',
        },
        {
          status: 400,
        }
      );
    }

    if (
      errorCode ===
      'INVALID_TOUCH_UP_STATUS'
    ) {
      return NextResponse.json(
        {
          error:
            'Geçersiz kontrol/retouch durumu',
        },
        {
          status: 400,
        }
      );
    }

    if (
      errorCode ===
      'INVALID_TOUCH_UP_DATE'
    ) {
      return NextResponse.json(
        {
          error:
            'Geçersiz kontrol/retouch tarihi',
        },
        {
          status: 400,
        }
      );
    }

    if (
      errorCode ===
      'INVALID_PAYMENT'
    ) {
      return NextResponse.json(
        {
          error:
            'Fiyat veya ödeme tutarı geçersiz',
        },
        {
          status: 400,
        }
      );
    }

    if (
      errorCode ===
      'PAID_AMOUNT_TOO_HIGH'
    ) {
      return NextResponse.json(
        {
          error:
            'Ödenen tutar toplam fiyattan fazla olamaz',
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      {
        error: 'İşlem güncellenemedi',
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const params = await context.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json({ error: 'Geçersiz işlem ID' }, { status: 400 });
    }

    await prisma.$transaction(
      async (tx) => {
        const treatment = await tx.treatment.findUnique({
          where: { id },
          include: { productUsages: true },
        });

        if (!treatment) {
          throw new Error('TREATMENT_NOT_FOUND');
        }

        // Tedavi silinirken kullanılan ürünler stoğa geri eklenir.
        for (const usage of treatment.productUsages) {
          await applyStockReturn(tx, usage.productId, usage.quantity);

          await createStockMovement(
            tx,
            usage.productId,
            'RETURN',
            usage.quantity,
            treatment.id,
            `Tedavi silindi: ${treatment.treatmentType}`
          );
        }

        await tx.treatment.delete({ where: { id } });
      },
      {
        maxWait: 10000,
        timeout: 10000,
      }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/treatments/[id] error:', err);

    const errorCode = err instanceof Error ? err.message : '';

    if (errorCode === 'TREATMENT_NOT_FOUND') {
      return NextResponse.json({ error: 'Tedavi bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Tedavi silinirken bir hata oluştu' }, { status: 500 });
  }
}