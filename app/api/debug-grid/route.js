import { NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  const session = request.cookies.get('admin_session');
  if (!session) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const signedId = searchParams.get('signedId');
    const templateFile = searchParams.get('file') || 'dolgu_uygulama_onam_fromu.pdf';

    const pdfPath = signedId
      ? path.join(process.cwd(), 'public', 'signed', `${signedId}.pdf`)
      : path.join(process.cwd(), 'public', templateFile);

    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json({ error: `PDF dosyası bulunamadı: ${pdfPath}` }, { status: 404 });
    }

    const existingPdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();

    pages.forEach((page, pageIndex) => {
      const { width, height } = page.getSize();

      for (let x = 0; x < width; x += 50) {
        page.drawLine({
          start: { x, y: 0 },
          end: { x, y: height },
          thickness: 0.3,
          color: rgb(1, 0, 0),
          opacity: 0.35,
        });
        page.drawText(String(x), {
          x: x + 2,
          y: height - 12,
          size: 7,
          color: rgb(1, 0, 0),
        });
      }

      for (let y = 0; y < height; y += 50) {
        page.drawLine({
          start: { x: 0, y },
          end: { x: width, y },
          thickness: 0.3,
          color: rgb(0, 0, 1),
          opacity: 0.35,
        });
        page.drawText(String(y), {
          x: 2,
          y: y + 2,
          size: 7,
          color: rgb(0, 0, 1),
        });
      }

      page.drawText(`SAYFA ${pageIndex + 1} — Boyut: ${Math.round(width)}x${Math.round(height)}`, {
        x: width / 2 - 80,
        y: height - 20,
        size: 9,
        color: rgb(0, 0.6, 0),
      });
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="debug_grid.pdf"',
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Grid oluşturulamadı' }, { status: 500 });
  }
}