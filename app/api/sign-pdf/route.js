import { NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { FORM_CONFIGS } from '@/lib/pdf-config';

function formatDateTR(isoDate) {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  return `\({d}.\){m}.${y}`;
}

async function drawSignature(pdfDoc, page, base64, box) {
  if (!base64 || !box) return;
  const match = base64.match(/^data:image\/(png|jpe?g);base64,/);
  const mime = match ? match[1] : 'png';
  const clean = base64.replace(/^data:image\/(png|jpe?g);base64,/, '');
  const buffer = Buffer.from(clean, 'base64');
  const img = mime === 'png' ? await pdfDoc.embedPng(buffer) : await pdfDoc.embedJpg(buffer);
  page.drawImage(img, { x: box.x, y: box.y, width: box.w, height: box.h });
}

export async function POST(request) {
  try {
    const {
      sessionId,
      birthDate,
      gender,
      answers,
      patientSignature,
    } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId zorunludur' }, { status: 400 });
    }

    const session = await prisma.signSession.findUnique({
      where: { id: sessionId },
      include: { treatment: { include: { patient: true } } },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session bulunamadı' }, { status: 404 });
    }

    if (session.status === 'SIGNED') {
      return NextResponse.json({ error: 'Bu form zaten imzalanmış. Yeni bir onam bağlantısı gerekiyor.' }, { status: 409 });
    }

    if (!birthDate) {
      return NextResponse.json({ error: 'Doğum tarihi zorunludur' }, { status: 400 });
    }
    if (!gender) {
      return NextResponse.json({ error: 'Cinsiyet seçimi zorunludur' }, { status: 400 });
    }
    if (!patientSignature) {
      return NextResponse.json({ error: 'Hasta imzası zorunludur' }, { status: 400 });
    }

    const patientName = session.treatment.patient.fullName;
    const templateFile = session.templateFile;
    const dateStr = new Date().toLocaleDateString('tr-TR');
    const config = FORM_CONFIGS[templateFile];

    if (!config) {
      return NextResponse.json({ error: `Bu form için koordinat tanımı yok: ${templateFile}` }, { status: 500 });
    }

    const pdfPath = path.join(process.cwd(), 'public', templateFile);
    const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfPath));
    pdfDoc.registerFontkit(fontkit);

    const fontPath = path.join(process.cwd(), 'public/fonts/NotoSans-Regular.ttf');
    const font = await pdfDoc.embedFont(fs.readFileSync(fontPath));

    const pages = pdfDoc.getPages();
    const page0 = pages[0];
    const page1 = pages.length > 1 ? pages[1] : null;

    // Üst Bilgiler
    if (config.patientName) page0.drawText(patientName, { x: config.patientName.x, y: config.patientName.y, size: 10, font, color: rgb(0, 0, 0) });
    if (config.date) page0.drawText(dateStr, { x: config.date.x, y: config.date.y, size: 10, font, color: rgb(0, 0, 0) });
    if (config.birthDate && birthDate) page0.drawText(formatDateTR(birthDate), { x: config.birthDate.x, y: config.birthDate.y, size: 10, font, color: rgb(0, 0, 0) });

    // Evet/Hayır İşaretleri
    if (config.answersMap && answers) {
      Object.keys(answers).forEach((qId) => {
        const value = answers[qId];
        const qTarget = config.answersMap[qId];
        if (qTarget) {
          const targetCoord = value === 'evet' ? qTarget.evet : value === 'hayir' ? qTarget.hayir : null;
          if (targetCoord) {
            page0.drawText('X', { x: targetCoord.x, y: targetCoord.y, size: 10, font, color: rgb(0, 0, 0) });
          }
        }
      });
    }

    // İmzalar - Sadece Hasta İmzası Basılır (Tanık ve Doktor kaldırıldı)
    if (config.signatures?.page1) {
      const p1 = config.signatures.page1;
      if (p1.patient?.name) page0.drawText(patientName, { x: p1.patient.name.x, y: p1.patient.name.y, size: 9, font, color: rgb(0, 0, 0) });
      await drawSignature(pdfDoc, page0, patientSignature, p1.patient?.box);
    }

    if (page1 && config.signatures?.page2) {
      const p2 = config.signatures.page2;
      if (p2.patient?.name) page1.drawText(patientName, { x: p2.patient.name.x, y: p2.patient.name.y, size: 9, font, color: rgb(0, 0, 0) });
      await drawSignature(pdfDoc, page1, patientSignature, p2.patient?.box);
    }

    const pdfBytes = await pdfDoc.save();
    const signedDir = path.join(process.cwd(), 'public', 'signed');
    if (!fs.existsSync(signedDir)) fs.mkdirSync(signedDir, { recursive: true });

    const fileName = `${sessionId}.pdf`;
    fs.writeFileSync(path.join(signedDir, fileName), pdfBytes);

    const relativeUrl = `/signed/${fileName}`;

    await prisma.signSession.update({
      where: { id: sessionId },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
        signedPdfUrl: relativeUrl,
        birthDate: birthDate || null,
        answersJson: answers ? JSON.stringify(answers) : null,
      },
    });

    if (session.treatment?.patientId) {
      try {
        await prisma.patient.update({
          where: { id: session.treatment.patientId },
          data: {
            ...(birthDate && { birthDate: new Date(birthDate) }),
            ...(gender && { gender }),
          },
        });
      } catch (patientUpdateErr) {
        console.error('Hasta bilgisi güncellenemedi:', patientUpdateErr);
      }
    }

    return NextResponse.json({ message: 'Tüm veriler eklendi', signedPdfUrl: relativeUrl });
  } catch (err) {
    console.error('PDF Hatası:', err);
    return NextResponse.json({ error: 'PDF oluşturulamadı: ' + err.message }, { status: 500 });
  }
}