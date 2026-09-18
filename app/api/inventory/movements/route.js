import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

// ADJUSTMENT burada listelenmiyor: yönü (artış/azalış) belirsiz olduğundan
// bu endpoint'ten oluşturulamaz. Manuel düzeltme, ürünün mutlak stockQuantity
// değerini değiştiren /api/inventory/products PATCH üzerinden yapılır.
const ALLOWED_TYPES = [
  'IN',
  'OUT',
  'RETURN',
];

function parseQuantity(value) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const stringValue = String(value).trim();

  // En fazla 3 ondalık basamak.
  if (!/^\d+(\.\d{1,3})?$/.test(stringValue)) {
    return null;
  }

  const quantity = new Prisma.Decimal(stringValue);

  if (quantity.lte(0)) {
    return null;
  }

  return quantity;
}

async function applyStockIncrease(
  tx,
  productId,
  quantity
) {
  const result =
    await tx.product.updateMany({
      where: {
        id: productId,
        isActive: true,
      },
      data: {
        stockQuantity: {
          increment: quantity,
        },
      },
    });

  if (result.count !== 1) {
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

    if (!product.isActive) {
      throw new Error(
        'PRODUCT_INACTIVE'
      );
    }

    throw new Error(
      'STOCK_UPDATE_FAILED'
    );
  }
}

async function applyStockDecrease(
  tx,
  productId,
  quantity
) {
  /*
   * UPDATE ... WHERE stockQuantity >= quantity
   *
   * Böylece aynı anda iki OUT işlemi geldiğinde
   * stok negatif duruma düşmez.
   */
  const result =
    await tx.product.updateMany({
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

    if (!product.isActive) {
      throw new Error(
        'PRODUCT_INACTIVE'
      );
    }

    throw new Error(
      'INSUFFICIENT_STOCK'
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const productId =
      searchParams.get('productId');

    const movements =
      await prisma.inventoryMovement.findMany({
        where: productId
          ? {
              productId,
            }
          : undefined,

        include: {
          product: {
            select: {
              id: true,
              name: true,
              unit: true,
            },
          },

          treatment: {
            select: {
              id: true,
              treatmentType: true,
              performedAt: true,

              patient: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

    return NextResponse.json(
      movements
    );
  } catch (err) {
    console.error(
      'GET /api/inventory/movements error:',
      err
    );

    return NextResponse.json(
      {
        error:
          'Stok hareketleri alınamadı',
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request) {
  try {
    const body =
      await request.json();

    const productId = String(
      body.productId || ''
    ).trim();

    const type = String(
      body.type || ''
    )
      .trim()
      .toUpperCase();

    const quantity =
      parseQuantity(body.quantity);

    const note =
      body.note !== undefined &&
      body.note !== null
        ? String(body.note).trim() || null
        : null;

    /*
     * Temel validasyonlar
     */
    if (!productId) {
      return NextResponse.json(
        {
          error:
            'Ürün ID gerekli',
        },
        {
          status: 400,
        }
      );
    }

    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json(
        {
          error:
            'Geçersiz stok hareketi türü',
        },
        {
          status: 400,
        }
      );
    }

    if (quantity === null) {
      return NextResponse.json(
        {
          error:
            'Miktar 0’dan büyük ve en fazla 3 ondalık basamaklı olmalıdır',
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Manuel stok hareketleri tedaviye
     * bağlı oluşturulamaz.
     *
     * Treatment kaynaklı OUT / RETURN işlemleri
     * treatment transaction'ı tarafından oluşturulur.
     */
    if (body.treatmentId) {
      return NextResponse.json(
        {
          error:
            'Tedaviye bağlı stok hareketleri tedavi işlemi üzerinden oluşturulmalıdır',
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
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

          if (!product.isActive) {
            throw new Error(
              'PRODUCT_INACTIVE'
            );
          }

          /*
           * IN
           * RETURN
           *
           * Bu ikisi mevcut stoğu artırır.
           */
          if (
            type === 'IN' ||
            type === 'RETURN'
          ) {
            await applyStockIncrease(
              tx,
              productId,
              quantity
            );
          }

          /*
           * OUT
           *
           * Stok miktarı atomik olarak kontrol edilir.
           */
          if (type === 'OUT') {
            await applyStockDecrease(
              tx,
              productId,
              quantity
            );
          }

          /*
           * Güncel ürünü tekrar al.
           */
          const updatedProduct =
            await tx.product.findUnique({
              where: {
                id: productId,
              },
            });

          if (!updatedProduct) {
            throw new Error(
              'PRODUCT_NOT_FOUND'
            );
          }

          if (
            updatedProduct.stockQuantity.lt(
              new Prisma.Decimal(0)
            )
          ) {
            throw new Error(
              'NEGATIVE_STOCK'
            );
          }

          /*
           * Stok hareketini oluştur.
           *
           * quantity doğrudan Decimal olarak
           * veriliyor.
           */
          const movement =
            await tx.inventoryMovement.create({
              data: {
                productId,
                type,
                quantity,
                note,
              },
            });

          return {
            product: updatedProduct,
            movement,
          };
        },
        {
          maxWait: 10000,
          timeout: 10000,
        }
      );

    return NextResponse.json(
      result,
      {
        status: 201,
      }
    );
  } catch (err) {
    console.error(
      'POST /api/inventory/movements error:',
      err
    );

    const errorCode =
      err instanceof Error
        ? err.message
        : '';

    if (
      errorCode ===
      'PRODUCT_NOT_FOUND'
    ) {
      return NextResponse.json(
        {
          error:
            'Ürün bulunamadı',
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
            'Pasif ürün için stok hareketi yapılamaz',
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
          error:
            'Yetersiz stok',
        },
        {
          status: 400,
        }
      );
    }

    if (
      errorCode ===
      'NEGATIVE_STOCK'
    ) {
      return NextResponse.json(
        {
          error:
            'Stok negatif olamaz',
        },
        {
          status: 400,
        }
      );
    }

    if (
      errorCode ===
      'INVALID_MOVEMENT_TYPE'
    ) {
      return NextResponse.json(
        {
          error:
            'Geçersiz stok hareketi türü',
        },
        {
          status: 400,
        }
      );
    }

    if (
      errorCode ===
      'STOCK_UPDATE_FAILED'
    ) {
      return NextResponse.json(
        {
          error:
            'Stok güncellenemedi',
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          'Stok hareketi oluşturulamadı',
      },
      {
        status: 500,
      }
    );
  }
}