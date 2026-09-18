import { NextResponse } from 'next/server';

import {
  PDFDocument,
  rgb,
  StandardFonts,
} from 'pdf-lib';

import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';

import { prisma } from '@/lib/prisma';
import { calculateAge } from '@/lib/date-utils';

const COLORS = {
  plum: rgb(36 / 255, 21 / 255, 47 / 255),
  purple: rgb(90 / 255, 58 / 255, 112 / 255),
  gold: rgb(201 / 255, 164 / 255, 92 / 255),
  cream: rgb(255 / 255, 240 / 255, 232 / 255),
  sage: rgb(120 / 255, 150 / 255, 129 / 255),
  pink: rgb(232 / 255, 201 / 255, 209 / 255),
  white: rgb(1, 1, 1),
  text: rgb(55 / 255, 45 / 255, 61 / 255),
  muted: rgb(110 / 255, 90 / 255, 120 / 255),
  border: rgb(225 / 255, 216 / 255, 231 / 255),
};

function sanitizeText(text) {
  if (text === null || text === undefined || text === '') {
    return '—';
  }

  return String(text)
    .replace(/Ğ/g, 'G')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 'S')
    .replace(/ş/g, 's')
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'c');
}

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('tr-TR');
}

function formatQuantity(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  return number
    .toFixed(3)
    .replace(/\.?0+$/, '');
}

function getUnitLabel(unit) {
  switch (unit) {
    case 'ML':
      return 'ml';

    case 'UNIT':
      return 'adet';

    case 'PIECE':
      return 'parça';

    default:
      return '';
  }
}

function formatProductUsage(usage) {
  if (!usage?.product) {
    return '—';
  }

  const productName = usage.product.name || 'Ürün';
  const quantity = formatQuantity(usage.quantity);
  const unit = getUnitLabel(usage.product.unit);

  return `${productName} — ${quantity}${unit ? ` ${unit}` : ''} kullanildi`;
}

function sanitizeFileName(name) {
  return String(name || 'Hasta')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 100);
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;

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
              orderBy: {
                createdAt: 'asc',
              },
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    unit: true,
                  },
                },
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

    const pdfDoc = await PDFDocument.create();

    pdfDoc.registerFontkit(fontkit);

    let font;
    let isCustomFont = false;

    const fontPath = path.join(
      process.cwd(),
      'public/fonts/NotoSans-Regular.ttf'
    );

    if (fs.existsSync(fontPath)) {
      try {
        const fontBytes = fs.readFileSync(fontPath);

        font = await pdfDoc.embedFont(fontBytes);

        isCustomFont = true;
      } catch (fontError) {
        console.warn(
          'NotoSans font yüklenemedi, Helvetica kullanılacak:',
          fontError
        );
      }
    }

    if (!font) {
      font = await pdfDoc.embedFont(
        StandardFonts.Helvetica
      );
    }

    const formatTxt = (value) => {
      if (isCustomFont) {
        return value === null || value === undefined || value === ''
          ? '—'
          : String(value);
      }

      return sanitizeText(value);
    };

    const PAGE_WIDTH = 595;
    const PAGE_HEIGHT = 842;
    const MARGIN_LEFT = 45;
    const MARGIN_RIGHT = 45;
    const CONTENT_WIDTH =
      PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

    let page;
    let y;

    function addPage() {
      page = pdfDoc.addPage([
        PAGE_WIDTH,
        PAGE_HEIGHT,
      ]);

      y = PAGE_HEIGHT - 45;

      // Üst marka alanı
      page.drawRectangle({
        x: 0,
        y: PAGE_HEIGHT - 72,
        width: PAGE_WIDTH,
        height: 72,
        color: COLORS.plum,
      });

      page.drawText(
        formatTxt('NOVANTIS'),
        {
          x: MARGIN_LEFT,
          y: PAGE_HEIGHT - 42,
          size: 18,
          font,
          color: COLORS.gold,
        }
      );

      page.drawText(
        formatTxt('Hasta Ozeti'),
        {
          x: MARGIN_LEFT,
          y: PAGE_HEIGHT - 60,
          size: 9,
          font,
          color: COLORS.white,
        }
      );

      y = PAGE_HEIGHT - 100;
    }

    function ensureSpace(requiredHeight = 40) {
      if (y < requiredHeight) {
        addPage();
      }
    }

    function drawText(text, options = {}) {
      ensureSpace(options.size ? options.size + 15 : 25);

      page.drawText(formatTxt(text), {
        x: options.x ?? MARGIN_LEFT,
        y,
        size: options.size ?? 10,
        font,
        color: options.color ?? COLORS.text,
      });

      if (options.advance !== false) {
        y -= options.lineHeight ?? 16;
      }
    }

    function drawSectionTitle(title) {
      ensureSpace(60);

      page.drawRectangle({
        x: MARGIN_LEFT,
        y: y - 5,
        width: CONTENT_WIDTH,
        height: 24,
        color: COLORS.cream,
      });

      page.drawText(formatTxt(title), {
        x: MARGIN_LEFT + 8,
        y: y + 2,
        size: 11,
        font,
        color: COLORS.purple,
      });

      y -= 34;
    }

    addPage();

    // =========================
    // PATIENT INFO
    // =========================

    drawSectionTitle('HASTA BILGILERI');

    drawText(
      `Hasta Adi Soyadi: ${patient.fullName}`,
      {
        size: 10,
        advance: false,
      }
    );

    page.drawText(
      formatTxt(`Telefon: ${patient.phone || '—'}`),
      {
        x: 320,
        y,
        size: 10,
        font,
        color: COLORS.text,
      }
    );

    y -= 18;

    drawText(
      `Yas: ${calculateAge(patient.birthDate)}`,
      {
        size: 10,
        advance: false,
      }
    );

    page.drawText(
      formatTxt(`Cinsiyet: ${patient.gender || '—'}`),
      {
        x: 320,
        y,
        size: 10,
        font,
        color: COLORS.text,
      }
    );

    y -= 18;

    drawText(
      `Rapor Tarihi: ${formatDate(new Date())}`,
      {
        size: 10,
        advance: false,
      }
    );

    y -= 26;

    if (patient.allergies) {
      page.drawRectangle({
        x: MARGIN_LEFT,
        y: y - 4,
        width: CONTENT_WIDTH,
        height: 30,
        color: COLORS.pink,
      });

      page.drawText(
        formatTxt(
          `Alerji / Hassasiyet: ${patient.allergies}`
        ),
        {
          x: MARGIN_LEFT + 8,
          y: y + 5,
          size: 9,
          font,
          color: COLORS.plum,
        }
      );

      y -= 40;
    }

    if (patient.notes) {
      drawText(
        `Not: ${patient.notes}`,
        {
          size: 9,
          lineHeight: 18,
        }
      );

      y -= 5;
    }

    // =========================
    // TREATMENT HISTORY
    // =========================

    drawSectionTitle(
      'GECMIS TEDAVI VE ISLEM LISTESI'
    );

    const treatments = patient.treatments || [];

    if (treatments.length === 0) {
      drawText(
        'Kayitli tedavi veya islem bulunmamaktadir.',
        {
          size: 9,
        }
      );
    }

    for (const treatment of treatments) {
      ensureSpace(120);

      // Treatment card
      page.drawRectangle({
        x: MARGIN_LEFT,
        y: y - 5,
        width: CONTENT_WIDTH,
        height: 20,
        color: COLORS.purple,
      });

      page.drawText(
        formatTxt(
          `${formatDate(treatment.performedAt)} — ${
            treatment.treatmentType || 'Estetik Islem'
          }`
        ),
        {
          x: MARGIN_LEFT + 8,
          y: y + 1,
          size: 9,
          font,
          color: COLORS.white,
        }
      );

      y -= 28;

      page.drawText(
        formatTxt(
          `Uygulama Bolgesi: ${
            treatment.applicationArea || '—'
          }`
        ),
        {
          x: MARGIN_LEFT,
          y,
          size: 8.5,
          font,
          color: COLORS.muted,
        }
      );

      y -= 15;

      // Product usages
      if (
        treatment.productUsages &&
        treatment.productUsages.length > 0
      ) {
        page.drawText(
          formatTxt('Kullanilan Urunler:'),
          {
            x: MARGIN_LEFT,
            y,
            size: 8.5,
            font,
            color: COLORS.text,
          }
        );

        y -= 14;

        for (const usage of treatment.productUsages) {
          ensureSpace(35);

          page.drawText(
            formatTxt(`• ${formatProductUsage(usage)}`),
            {
              x: MARGIN_LEFT + 8,
              y,
              size: 8.5,
              font,
              color: COLORS.text,
            }
          );

          y -= 14;
        }
      }

      if (treatment.notes) {
        ensureSpace(35);

        page.drawText(
          formatTxt(`Not: ${treatment.notes}`),
          {
            x: MARGIN_LEFT,
            y,
            size: 8.5,
            font,
            color: COLORS.muted,
          }
        );

        y -= 16;
      }

      if (treatment.touchUpStatus && treatment.touchUpStatus !== 'NONE') {
        ensureSpace(35);

        const touchUpText =
          treatment.touchUpStatus === 'PENDING'
            ? 'Touch-up: Bekliyor'
            : treatment.touchUpStatus === 'COMPLETED'
              ? 'Touch-up: Tamamlandi'
              : treatment.touchUpStatus === 'CANCELED'
                ? 'Touch-up: Iptal edildi'
                : `Touch-up: ${treatment.touchUpStatus}`;

        page.drawText(
          formatTxt(touchUpText),
          {
            x: MARGIN_LEFT,
            y,
            size: 8.5,
            font,
            color:
              treatment.touchUpStatus === 'COMPLETED'
                ? COLORS.sage
                : COLORS.muted,
          }
        );

        y -= 16;
      }

      // Treatment separator
      y -= 6;

      page.drawLine({
        start: {
          x: MARGIN_LEFT,
          y,
        },
        end: {
          x: PAGE_WIDTH - MARGIN_RIGHT,
          y,
        },
        thickness: 0.5,
        color: COLORS.border,
      });

      y -= 18;
    }

    // =========================
    // FOOTER
    // =========================

    const pages = pdfDoc.getPages();

    pages.forEach((currentPage, index) => {
      currentPage.drawText(
        formatTxt(`Novantis — Hasta Ozeti`),
        {
          x: MARGIN_LEFT,
          y: 24,
          size: 7,
          font,
          color: COLORS.muted,
        }
      );

      currentPage.drawText(
        formatTxt(`Sayfa ${index + 1} / ${pages.length}`),
        {
          x: PAGE_WIDTH - 105,
          y: 24,
          size: 7,
          font,
          color: COLORS.muted,
        }
      );
    });

    const pdfBytes = await pdfDoc.save();

    const fileName = sanitizeFileName(
      `Novantis_Hasta_Ozeti_${patient.fullName}.pdf`
    );

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(
          fileName
        )}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('PDF Özet Hatası:', error);

    return NextResponse.json(
      {
        error: 'PDF oluşturulamadı.',
      },
      {
        status: 500,
      }
    );
  }
}