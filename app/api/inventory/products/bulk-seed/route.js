import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Sadece isimler — kategori ve birim tahmini YOK, Nurlana kendi girecek.
const SEED_PRODUCT_NAMES = [
  'Hi Fu',
  'Facetime',
  'Harmonica',
  'E-50 Exsozom Hair',
  'E-50 Exsozom Face',
  'Genosys BBC',
  'Cilt Bakımı',
  'Melano Statik Krem',
  'Melano Statik Peeling',
  'Rejuran',
  'Lighting Peeling Innoa',
  'Dorothy 3 ml',
  'Hyalual Xela Rederm 1,1',
  'Hyalual Electri',
  'Exsozom',
  'Alloblast Gold',
  'Alloblast',
  'PRP Kit',
  'PinkLLA',
  'Botoks Dysport Masseter',
  'Botox Dysport 3 Bölge',
  'Lapuroon Aurora Super 2 ml',
  'Lapuroon Aurora Vivid 5ml',
  'Hyaluronidase BCN',
  'Silika Organika & Dmae',
  'NFCT 135',
  'Hair Loss Innoa Est',
  'RRS Lola',
  '50 Revok',
  'Radisse',
  'Novuma',
  'İnnea Aqua',
  'Elasty G Plus',
  'Elasty F Plus',
  'Elasty D Plus',
];

export async function POST() {
  try {
    const results = { created: [], skipped: [] };

    for (const name of SEED_PRODUCT_NAMES) {
      const existing = await prisma.product.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });

      if (existing) {
        results.skipped.push(name);
        continue;
      }

      await prisma.product.create({
        data: {
          name,
          category: '',
          unit: 'UNSPECIFIED',
          stockQuantity: 0,
          minStockAlert: 0,
        },
      });

      results.created.push(name);
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error('Toplu ürün yükleme hatası:', err);
    return NextResponse.json(
      { error: 'Toplu ürün yüklenemedi: ' + err.message },
      { status: 500 }
    );
  }
}