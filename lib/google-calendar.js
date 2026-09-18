import crypto from 'crypto';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { getStatusForColorId } from '@/lib/appointment-colors';

const CONNECTION_ID = 'default';

// `request.nextUrl.origin`, `next dev -H 0.0.0.0` ile çalıştırıldığında
// gelen Host header'ı yerine sunucunun bind adresini (0.0.0.0) döndürüyor —
// bu da Google'ın kayıtlı redirect_uri ile eşleşmemesine yol açar. Gerçek
// Host header'ından origin'i kendimiz kuruyoruz (localhost, LAN IP veya
// production domain fark etmeksizin doğru çalışır).
export function getRequestOrigin(request) {
  const host = request.headers.get('host');
  return `${request.nextUrl.protocol}//${host}`;
}
const EVENT_DURATION_MS = 30 * 60 * 1000; // Nurlana'nın onayladığı sabit süre.
const WATCH_RENEW_MARGIN_MS = 48 * 60 * 60 * 1000; // Süresi dolmadan 48 saat önce yenile.

export function createOAuthClient(redirectUri) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

export async function getConnection() {
  return prisma.googleCalendarConnection.findUnique({ where: { id: CONNECTION_ID } });
}

export async function saveConnectionTokens({ accessToken, refreshToken, expiryDate, scope }) {
  return prisma.googleCalendarConnection.upsert({
    where: { id: CONNECTION_ID },
    create: {
      id: CONNECTION_ID,
      accessToken,
      refreshToken,
      expiryDate,
      scope,
    },
    update: {
      accessToken,
      // Google, refresh_token'ı sadece ilk onayda (prompt=consent) döner;
      // sonraki token yenilemelerinde refreshToken alanı boş gelebilir.
      ...(refreshToken ? { refreshToken } : {}),
      expiryDate,
      scope,
    },
  });
}

// Bağlantı satırındaki token'ları kullanan, gerekirse otomatik yenileyen
// yetkilendirilmiş bir Calendar API istemcisi döner. Bağlantı yoksa null.
async function getAuthorizedClient() {
  const connection = await getConnection();
  if (!connection) return null;

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    expiry_date: connection.expiryDate.getTime(),
  });

  oauth2Client.on('tokens', async (tokens) => {
    await prisma.googleCalendarConnection.update({
      where: { id: CONNECTION_ID },
      data: {
        accessToken: tokens.access_token || connection.accessToken,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        ...(tokens.expiry_date ? { expiryDate: new Date(tokens.expiry_date) } : {}),
      },
    }).catch((err) => console.error('Google token güncellenemedi:', err));
  });

  return { oauth2Client, connection };
}

async function getCalendarApi() {
  const authorized = await getAuthorizedClient();
  if (!authorized) return null;
  const calendar = google.calendar({ version: 'v3', auth: authorized.oauth2Client });
  return { calendar, connection: authorized.connection };
}

function buildEventResource(appointment) {
  const patientName = appointment.patient?.fullName || 'Hasta atanmadı';
  const start = new Date(appointment.date);
  const end = new Date(start.getTime() + EVENT_DURATION_MS);

  return {
    summary: `${patientName} – ${appointment.title}`,
    description: appointment.notes || undefined,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    colorId: appointment.colorId || undefined,
  };
}

export async function createGoogleEvent(appointment) {
  const api = await getCalendarApi();
  if (!api) return null;

  const res = await api.calendar.events.insert({
    calendarId: api.connection.calendarId,
    requestBody: buildEventResource(appointment),
  });

  return res.data.id;
}

export async function updateGoogleEvent(googleEventId, appointment) {
  const api = await getCalendarApi();
  if (!api || !googleEventId) return;

  await api.calendar.events.patch({
    calendarId: api.connection.calendarId,
    eventId: googleEventId,
    requestBody: buildEventResource(appointment),
  });
}

export async function deleteGoogleEvent(googleEventId) {
  const api = await getCalendarApi();
  if (!api || !googleEventId) return;

  try {
    await api.calendar.events.delete({
      calendarId: api.connection.calendarId,
      eventId: googleEventId,
    });
  } catch (err) {
    // Etkinlik zaten silinmişse Google 404/410 döner — hata sayılmaz.
    if (err?.code !== 404 && err?.code !== 410) throw err;
  }
}

export async function startWatchChannel(baseUrl) {
  const api = await getCalendarApi();
  if (!api) return;

  // Eski kanalı durdurmayı dene (best-effort, başarısız olursa önemli değil).
  if (api.connection.channelId && api.connection.resourceId) {
    try {
      await api.calendar.channels.stop({
        requestBody: { id: api.connection.channelId, resourceId: api.connection.resourceId },
      });
    } catch {
      // yoksay
    }
  }

  const channelId = crypto.randomUUID();
  const channelToken = crypto.randomBytes(24).toString('hex');
  const address = `${baseUrl}/api/webhooks/google-calendar`;

  const res = await api.calendar.events.watch({
    calendarId: api.connection.calendarId,
    requestBody: { id: channelId, type: 'web_hook', address, token: channelToken },
  });

  await prisma.googleCalendarConnection.update({
    where: { id: CONNECTION_ID },
    data: {
      channelId,
      channelToken,
      resourceId: res.data.resourceId,
      watchExpiration: res.data.expiration ? new Date(Number(res.data.expiration)) : null,
      // Yeni kanal = yeni senkron döngüsü; tam yeniden senkron için sıfırlanır.
      syncToken: null,
    },
  });
}

export async function renewWatchIfNeeded(baseUrl) {
  const connection = await getConnection();
  if (!connection) return;

  const expiresAt = connection.watchExpiration?.getTime() || 0;
  if (expiresAt - Date.now() > WATCH_RENEW_MARGIN_MS) return; // henüz erken

  await startWatchChannel(baseUrl);
}

function isDateEqual(a, b) {
  return new Date(a).getTime() === new Date(b).getTime();
}

// Google Takvim'den gelen değişiklikleri çeker ve doğrudan veritabanına uygular.
// Buradan asla create/update/deleteGoogleEvent çağrılmaz — bu, CRM'in kendi
// push'unun webhook olarak geri dönüp sonsuz döngü yaratmasını yapısal olarak
// engeller (bkz. plan: "Döngü önleme").
export async function pullAndApplyChanges() {
  const api = await getCalendarApi();
  if (!api) return;

  let syncToken = api.connection.syncToken || undefined;
  let pageToken;
  let nextSyncToken;
  const events = [];

  do {
    let res;
    try {
      res = await api.calendar.events.list({
        calendarId: api.connection.calendarId,
        syncToken,
        pageToken,
        singleEvents: true,
      });
    } catch (err) {
      if (err?.code === 410) {
        // syncToken geçersiz/süresi dolmuş — tam yeniden senkron gerekir.
        await prisma.googleCalendarConnection.update({
          where: { id: CONNECTION_ID },
          data: { syncToken: null },
        });
        syncToken = undefined;
        pageToken = undefined;
        continue;
      }
      throw err;
    }

    events.push(...(res.data.items || []));
    pageToken = res.data.nextPageToken || undefined;
    if (res.data.nextSyncToken) nextSyncToken = res.data.nextSyncToken;
  } while (pageToken);

  for (const event of events) {
    await applyIncomingEvent(event);
  }

  if (nextSyncToken) {
    await prisma.googleCalendarConnection.update({
      where: { id: CONNECTION_ID },
      data: { syncToken: nextSyncToken },
    });
  }
}

async function applyIncomingEvent(event) {
  const existing = await prisma.appointment.findUnique({ where: { googleEventId: event.id } });

  if (event.status === 'cancelled') {
    if (existing) {
      await prisma.appointment.update({ where: { id: existing.id }, data: { status: 'CANCELED' } });
    }
    return;
  }

  const newDate = event.start?.dateTime ? new Date(event.start.dateTime) : null;
  if (!newDate) return; // tüm gün etkinlikleri (sadece "date") şimdilik desteklenmiyor.

  const derivedStatus = getStatusForColorId(event.colorId);

  if (existing) {
    const data = {};
    if (!isDateEqual(existing.date, newDate)) data.date = newDate;
    if (event.colorId && event.colorId !== existing.colorId) data.colorId = event.colorId;
    if (derivedStatus && derivedStatus !== existing.status) data.status = derivedStatus;

    if (Object.keys(data).length > 0) {
      await prisma.appointment.update({ where: { id: existing.id }, data });
    }
    return;
  }

  // CRM'de karşılığı olmayan, doğrudan Google Takvim'de oluşturulmuş etkinlik:
  // Nurlana'nın tercihi üzerine hastasız/eksik bilgili bir randevu olarak kaydedilir.
  await prisma.appointment.create({
    data: {
      patientId: null,
      title: event.summary || 'Google Takvim Etkinliği',
      date: newDate,
      type: 'ROUTINE',
      status: derivedStatus || 'PENDING',
      colorId: event.colorId || null,
      googleEventId: event.id,
    },
  });
}
