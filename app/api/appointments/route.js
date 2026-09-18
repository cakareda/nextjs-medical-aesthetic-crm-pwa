import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getColorIdForType, getColorIdForStatus } from '@/lib/appointment-colors';
import { createGoogleEvent, updateGoogleEvent, deleteGoogleEvent, renewWatchIfNeeded, getRequestOrigin } from '@/lib/google-calendar';

const VALID_STATUSES = ['PENDING', 'ATTENDED', 'NO_SHOW', 'CANCELED'];

export async function GET(request) {
  try {
    const appointments = await prisma.appointment.findMany({
      orderBy: { date: 'asc' },
      include: {
        patient: {
          select: { id: true, fullName: true, phone: true },
        },
      },
    });

    // Ucuz, sonucu beklenmeyen yedek kontrol: cron kaçırılsa bile Google Takvim
    // webhook kanalı sessizce süresi dolmuş kalmasın.
    renewWatchIfNeeded(getRequestOrigin(request)).catch((err) =>
      console.error('Google Takvim kanal yenileme (yedek kontrol) hatası:', err)
    );

    return NextResponse.json(appointments);
  } catch (err) {
    return NextResponse.json({ error: 'Randevular alınamadı: ' + err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { patientId, title, date, type, notes } = await request.json();

    if (!patientId || !title || !date) {
      return NextResponse.json({ error: 'Hasta, başlık ve tarih zorunludur' }, { status: 400 });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Geçersiz tarih formatı' }, { status: 400 });
    }

    const appointmentType = type || 'TOUCH_UP';

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        title,
        date: parsedDate,
        type: appointmentType,
        notes,
        colorId: getColorIdForType(appointmentType),
      },
      include: { patient: { select: { id: true, fullName: true, phone: true } } },
    });

    // Google Takvim senkronu ikincil bir sistem: başarısız olursa CRM
    // kaydını asla etkilemez, sadece loglanır.
    try {
      const googleEventId = await createGoogleEvent(appointment);
      if (googleEventId) {
        await prisma.appointment.update({ where: { id: appointment.id }, data: { googleEventId } });
        appointment.googleEventId = googleEventId;
      }
    } catch (err) {
      console.error('Google Takvim etkinliği oluşturulamadı:', err);
    }

    return NextResponse.json(appointment);
  } catch (err) {
    return NextResponse.json({ error: 'Randevu oluşturulamadı: ' + err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const { status, date } = await request.json();

    if (!id) return NextResponse.json({ error: 'Randevu ID gerekli' }, { status: 400 });

    const data = {};

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Geçersiz randevu durumu' }, { status: 400 });
      }
      data.status = status;

      // Geldi / gelmedi durumunda renk otomatik güncellenir (bkz. lib/appointment-colors).
      const statusColorId = getColorIdForStatus(status);
      if (statusColorId) data.colorId = statusColorId;
    }

    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: 'Geçersiz tarih formatı' }, { status: 400 });
      }
      data.date = parsedDate;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek alan bulunamadı' }, { status: 400 });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data,
      include: { patient: { select: { id: true, fullName: true, phone: true } } },
    });

    try {
      if (updated.googleEventId) {
        await updateGoogleEvent(updated.googleEventId, updated);
      } else {
        const googleEventId = await createGoogleEvent(updated);
        if (googleEventId) {
          await prisma.appointment.update({ where: { id }, data: { googleEventId } });
          updated.googleEventId = googleEventId;
        }
      }
    } catch (err) {
      console.error('Google Takvim etkinliği güncellenemedi:', err);
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Randevu güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Randevu ID gerekli' }, { status: 400 });

    const deleted = await prisma.appointment.delete({ where: { id } });

    try {
      await deleteGoogleEvent(deleted.googleEventId);
    } catch (err) {
      console.error('Google Takvim etkinliği silinemedi:', err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Randevu silinemedi' }, { status: 500 });
  }
}
