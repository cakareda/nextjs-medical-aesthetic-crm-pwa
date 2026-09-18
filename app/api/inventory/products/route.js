import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

const ALLOWED_UNITS = ['ML', 'UNIT', 'PIECE', 'UNSPECIFIED'];

function parseDecimal(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const stringValue = String(value).trim();

  if (!/^\d+(\.\d{1,3})?$/.test(stringValue)) {
    throw new Error(`${fieldName} geçerli bir sayı olmalıdır`);
  }

  const decimal = new Prisma.Decimal(stringValue);

  if (decimal.lt(0)) {
    throw new Error(`${fieldName} negatif olamaz`);
  }

  return decimal;
}

function parseUnitPrice(value) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  const unitPrice = Number(value);

  if (!Number.isInteger(unitPrice) || unitPrice < 0) {
    return null;
  }

  return unitPrice;
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(products);
  } catch (err) {
    console.error('GET /api/products error:', err);
    return NextResponse.json({ error: 'Ürünler alınamadı' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const name = String(body.name || '').trim();

    if (!name) {
      return NextResponse.json({ error: 'Ürün adı zorunludur' }, { status: 400 });
    }

    const unit = String(body.unit || 'UNSPECIFIED').trim().toUpperCase();

    if (!ALLOWED_UNITS.includes(unit)) {
      return NextResponse.json(
        { error: 'Geçerli bir ürün birimi seçilmelidir' },
        { status: 400 }
      );
    }

    let stockQuantity;
    let minStockAlert;
    let unitSize;

    try {
      stockQuantity = parseDecimal(body.stockQuantity, 'Stok miktarı') ?? new Prisma.Decimal(0);
      minStockAlert = parseDecimal(body.minStockAlert, 'Minimum stok uyarısı') ?? new Prisma.Decimal(0);
      unitSize = parseDecimal(body.unitSize, 'Birim başına miktar'); // null olabilir, sorun değil
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const unitPrice = parseUnitPrice(body.unitPrice);

    if (unitPrice === null) {
      return NextResponse.json(
        { error: 'Birim fiyatı geçerli bir kuruş değeri olmalıdır' },
        { status: 400 }
      );
    }

    const category = String(body.category || '').trim();

    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          name,
          category,
          unit,
          unitSize,
          stockQuantity,
          minStockAlert,
          unitPrice,
        },
      });

      if (stockQuantity.gt(0)) {
        await tx.inventoryMovement.create({
          data: {
            productId: createdProduct.id,
            type: 'IN',
            quantity: stockQuantity,
            note: 'Ürün oluşturulurken başlangıç stoğu',
          },
        });
      }

      return createdProduct;
    });

    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error('POST /api/products error:', err);

    const message = err instanceof Error ? err.message : '';

    if (message.includes('geçerli bir sayı') || message.includes('negatif olamaz')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Ürün eklenemedi' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Ürün ID gerekli' }, { status: 400 });
    }

    const body = await request.json();

    const updateData = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();

      if (!name) {
        return NextResponse.json({ error: 'Ürün adı boş olamaz' }, { status: 400 });
      }

      updateData.name = name;
    }

    if (body.category !== undefined) {
      updateData.category = String(body.category).trim();
    }

    if (body.unit !== undefined) {
      const unit = String(body.unit).trim().toUpperCase();

      if (!ALLOWED_UNITS.includes(unit)) {
        return NextResponse.json({ error: 'Geçersiz ürün birimi' }, { status: 400 });
      }

      updateData.unit = unit;
    }

    if (body.unitSize !== undefined) {
      try {
        // Boş gönderilirse null olur (bilgiyi temizler), aksi halde parse edilir.
        updateData.unitSize = parseDecimal(body.unitSize, 'Birim başına miktar');
      } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    if (body.minStockAlert !== undefined) {
      let minStockAlert;

      try {
        minStockAlert = parseDecimal(body.minStockAlert, 'Minimum stok uyarısı');
      } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }

      if (minStockAlert === null) {
        return NextResponse.json(
          { error: 'Minimum stok uyarısı gereklidir' },
          { status: 400 }
        );
      }

      updateData.minStockAlert = minStockAlert;
    }

    if (body.unitPrice !== undefined) {
      const unitPrice = parseUnitPrice(body.unitPrice);

      if (unitPrice === null) {
        return NextResponse.json({ error: 'Geçersiz birim fiyatı' }, { status: 400 });
      }

      updateData.unitPrice = unitPrice;
    }

    let stockQuantityChange = null;

    if (body.stockQuantity !== undefined) {
      let newStockQuantity;

      try {
        newStockQuantity = parseDecimal(body.stockQuantity, 'Stok miktarı');
      } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }

      if (newStockQuantity === null) {
        return NextResponse.json({ error: 'Stok miktarı gereklidir' }, { status: 400 });
      }

      stockQuantityChange = newStockQuantity;
    }

    if (Object.keys(updateData).length === 0 && stockQuantityChange === null) {
      return NextResponse.json({ error: 'Güncellenecek alan bulunamadı' }, { status: 400 });
    }

const updated = await prisma.$transaction(
  async (tx) => {
    const current = await tx.product.findUnique({ where: { id } });

    if (!current) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const updatedProduct = await tx.product.update({
      where: { id },
      data: {
        ...updateData,
        ...(stockQuantityChange !== null && { stockQuantity: stockQuantityChange }),
      },
    });

    if (stockQuantityChange !== null) {
      const diff = stockQuantityChange.minus(current.stockQuantity);

      if (!diff.isZero()) {
        await tx.inventoryMovement.create({
          data: {
            productId: id,
            type: 'ADJUSTMENT',
            quantity: diff.abs(),
            note: `Manuel düzenleme: ${current.stockQuantity.toString()} → ${stockQuantityChange.toString()}`,
          },
        });
      }
    }

    return updatedProduct;
  },
  {
    maxWait: 10000, 
    timeout: 10000,
  }
);

    return NextResponse.json(updated);
  } catch (err) {
    console.error('PATCH /api/products error:', err);

    const message = err instanceof Error ? err.message : '';

    if (message === 'PRODUCT_NOT_FOUND') {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
    }

    if (message.includes('geçerli bir sayı') || message.includes('negatif olamaz')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Ürün güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Ürün ID gerekli' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (err) {
    console.error('DELETE /api/products error:', err);
    return NextResponse.json({ error: 'Ürün pasifleştirilemedi' }, { status: 500 });
  }
}