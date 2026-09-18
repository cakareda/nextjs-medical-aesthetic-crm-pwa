import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { computePaymentStatus } from '@/lib/treatment-utils';

const PERFORMED_BY = 'Nurlana Sarıyeva';

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

  return productUsages.map((usage) => {
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
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { patientName, phone, treatmentType, productBrand, templateFile, price, paidAmount } = body;

    if (!patientName || !treatmentType || !templateFile) {
      return NextResponse.json({ error: 'Eksik alan var' }, { status: 400 });
    }

    const cleanPhone = phone && String(phone).trim() ? String(phone).trim() : null;

    let productUsages;
    try {
      productUsages = normalizeProductUsages(body.productUsages);
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const priceValue = parseMoney(price, 0);
    const paidAmountValue = parseMoney(paidAmount, 0);

    if (paidAmountValue > priceValue) {
      return NextResponse.json({ error: 'Ödenen tutar toplam tutardan fazla olamaz.' }, { status: 400 });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        let patient = cleanPhone
          ? await tx.patient.findFirst({ where: { phone: cleanPhone } })
          : null;

        if (!patient) {
          patient = await tx.patient.create({
            data: { fullName: patientName, phone: cleanPhone },
          });
        }

        const productIds = productUsages.map((usage) => usage.productId);

        const products = productIds.length > 0
          ? await tx.product.findMany({ where: { id: { in: productIds }, isActive: true } })
          : [];

        const productMap = new Map(products.map((product) => [product.id, product]));

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
            patientId: patient.id,
            treatmentType,
            productBrand: productBrand || null,
            // Bilerek backend tarafından sabit tutuluyor.
            performedBy: PERFORMED_BY,
            price: priceValue,
            paidAmount: paidAmountValue,
            paymentStatus: computePaymentStatus(priceValue, paidAmountValue),
          },
        });

        for (const usage of productUsages) {
          const updateResult = await tx.product.updateMany({
            where: { id: usage.productId, isActive: true, stockQuantity: { gte: usage.quantity } },
            data: { stockQuantity: { decrement: usage.quantity } },
          });

          if (updateResult.count !== 1) {
            throw new Error('Yetersiz stok veya ürün bulunamadı.');
          }

          await tx.treatmentProductUsage.create({
            data: {
              treatmentId: treatment.id,
              productId: usage.productId,
              quantity: usage.quantity,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              productId: usage.productId,
              type: 'OUT',
              quantity: usage.quantity,
              treatmentId: treatment.id,
              note: `Tedavi kullanımı: ${treatment.treatmentType}`,
            },
          });
        }

        const session = await tx.signSession.create({
          data: {
            treatmentId: treatment.id,
            templateFile,
            status: 'PENDING',
          },
        });

        return session;
      },
      { maxWait: 10000, timeout: 10000 }
    );

    return NextResponse.json({ sessionId: result.id });
  } catch (error) {
    console.error('Session oluşturma hatası:', error);

    const knownErrors = [
      'Seçilen ürünlerden biri bulunamadı.',
      'Yetersiz stok veya ürün bulunamadı.',
      'Ürün miktarı zorunludur.',
      'Ürün miktarı 0’dan büyük olmalıdır.',
      'Geçersiz ürün miktarı.',
      'Ürün seçimi zorunludur.',
      'productUsages bir dizi olmalıdır.',
      'Geçersiz ürün kullanımı.',
      'Ödenen tutar toplam tutardan fazla olamaz.',
      'Geçersiz ödeme tutarı.',
    ];

    const message = error instanceof Error ? error.message : '';
    const isClientError = knownErrors.includes(message) || message.includes('için yeterli stok bulunmuyor');

    return NextResponse.json(
      { error: isClientError ? message : 'Session oluşturulamadı' },
      { status: isClientError ? 400 : 500 }
    );
  }
}
