'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Inter, Playfair_Display } from 'next/font/google';
import { T } from '@/lib/theme';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-playfair',
});

const sans = 'var(--font-inter), sans-serif';
const serif = 'var(--font-playfair), Georgia, serif';

function getIstanbulDateString(dateInput = new Date()) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getIstanbulTime(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getTomorrowDateString() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1));
  return tomorrow.toISOString().slice(0, 10);
}

function getApiArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.patients)) return data.patients;
  if (Array.isArray(data?.appointments)) return data.appointments;
  if (Array.isArray(data?.notes)) return data.notes;
  return [];
}

export default function AdminDashboardPage() {
  const todayStr = getIstanbulDateString();

  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointmentsCount: 0,
    pendingTouchUpsCount: 0,
  });

  const [todayAppointments, setTodayAppointments] = useState([]);
  const [tomorrowAppointments, setTomorrowAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedNoteDate, setSelectedNoteDate] = useState(todayStr);
  const [noteContent, setNoteContent] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [pastNotesList, setPastNotesList] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboardData() {
      setLoading(true);
      try {
        const [patRes, appRes, notesRes] = await Promise.all([
          fetch('/api/patients', { cache: 'no-store' }),
          fetch('/api/appointments', { cache: 'no-store' }),
          fetch('/api/daily-notes', { cache: 'no-store' }),
        ]);

        const [patientsData, appointmentsData, notesData] = await Promise.all([
          patRes.json(),
          appRes.json(),
          notesRes.json(),
        ]);

        if (!patRes.ok) throw new Error(patientsData?.error || 'Hasta verileri alınamadı.');
        if (!appRes.ok) throw new Error(appointmentsData?.error || 'Randevu verileri alınamadı.');
        if (!notesRes.ok) throw new Error(notesData?.error || 'Günün notları alınamadı.');

        if (cancelled) return;

        const patients = getApiArray(patientsData);
        const appointments = getApiArray(appointmentsData);
        const notesList = getApiArray(notesData);

        setPastNotesList(notesList);

        const tomorrowStr = getTomorrowDateString();

        const activeAppointments = appointments.filter(
          (appointment) => appointment?.date && appointment.status !== 'CANCELED'
        );

        const todayApps = activeAppointments.filter(
          (appointment) => getIstanbulDateString(appointment.date) === todayStr
        );

        const tomorrowApps = activeAppointments.filter(
          (appointment) => getIstanbulDateString(appointment.date) === tomorrowStr
        );

        let touchUpCount = 0;
        patients.forEach((patient) => {
          if (!Array.isArray(patient?.treatments)) return;
          patient.treatments.forEach((treatment) => {
            if (treatment?.touchUpStatus === 'PENDING') touchUpCount += 1;
          });
        });

        setStats({
          totalPatients: patients.length,
          todayAppointmentsCount: todayApps.length,
          pendingTouchUpsCount: touchUpCount,
        });

        setTodayAppointments(todayApps);
        setTomorrowAppointments(tomorrowApps);
      } catch (err) {
        if (!cancelled) console.error('Dashboard veri hatası:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDashboardData();
    return () => { cancelled = true; };
  }, [todayStr]);

  useEffect(() => {
    if (!selectedNoteDate) {
      setNoteContent('');
      return;
    }

    let cancelled = false;

    async function fetchSelectedNote() {
      try {
        const res = await fetch(`/api/daily-notes?date=${encodeURIComponent(selectedNoteDate)}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Not alınamadı.');
        if (!cancelled) setNoteContent(data?.content || '');
      } catch (err) {
        if (!cancelled) {
          console.error('Not getirme hatası:', err);
          setNoteContent('');
        }
      }
    }

    fetchSelectedNote();
    return () => { cancelled = true; };
  }, [selectedNoteDate]);

  const handleSaveNote = async () => {
    if (!selectedNoteDate) return;
    setNoteSaving(true);
    try {
      const res = await fetch('/api/daily-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedNoteDate, content: noteContent }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Not kaydedilemedi.');

      const notesRes = await fetch('/api/daily-notes', { cache: 'no-store' });
      const notesData = await notesRes.json();
      if (notesRes.ok) setPastNotesList(getApiArray(notesData));
    } catch (err) {
      console.error('Not kaydetme hatası:', err);
      alert(err?.message || 'Not kaydedilemedi.');
    } finally {
      setNoteSaving(false);
    }
  };

  const sendWhatsAppReminder = (phone, patientName, dateStr, title) => {
    if (!phone) {
      alert('Hastanın telefon numarası bulunamadı.');
      return;
    }

    let formattedPhone = String(phone).replace(/\D/g, '');
    if (formattedPhone.startsWith('00')) formattedPhone = formattedPhone.slice(2);
    if (formattedPhone.startsWith('0')) {
      formattedPhone = `90${formattedPhone.slice(1)}`;
    } else if (!formattedPhone.startsWith('90')) {
      formattedPhone = `90${formattedPhone}`;
    }

    const timeFormatted = getIstanbulTime(dateStr);
    const message = encodeURIComponent(
      `Sayın ${patientName || 'Hastamız'}, Novantis'te saat ${timeFormatted} için planlanan "${title || 'randevu'}" randevunuzu hatırlatmak isteriz.`
    );
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const formatDate = () => {
    return new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  };

  return (
    <div
      className={`${inter.variable} ${playfair.variable}`}
      style={{
        maxWidth: 1080,
        margin: '0 auto',
        padding: '8px 4px 36px',
        fontFamily: sans,
        color: T.bg,
      }}
    >
      {/* ÜST BAŞLIK */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 28,
          paddingBottom: 20,
          borderBottom: `1px solid ${T.purple}30`,
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p style={{ margin: '0 0 6px 0', fontSize: 13, fontWeight: 700, color: T.purpleDark, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: sans }}>
            Novantis Anasayfa Paneli
          </p>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: T.bg, fontFamily: sans, letterSpacing: '-0.01em' }}>
            {formatDate()}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: T.gold, borderRadius: 12, padding: '10px 20px' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: T.bg, fontFamily: serif, lineHeight: 1 }}>
            {stats.todayAppointmentsCount}
          </div>
          <div style={{ fontSize: 11.5, color: T.bg, fontWeight: 700, lineHeight: 1.2, maxWidth: 70 }}>
            bugünkü randevu
          </div>
        </div>
      </div>

      {/* İSTATİSTİK KARTLARI */}
      <div
        className="dashboard-metrics"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 26,
        }}
      >
        {[
          { label: 'Kayıtlı toplam hasta', value: stats.totalPatients, color: T.purpleDark },
          { label: 'Bugünkü randevular', value: stats.todayAppointmentsCount, color: T.success },
          { label: 'Yarının randevuları', value: tomorrowAppointments.length, color: '#8A6A1E' },
          { label: 'Bekleyen rötuş / kontrol', value: stats.pendingTouchUpsCount, color: '#8B4A5A' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: T.white,
              border: `1px solid ${T.purple}30`,
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div style={{ fontSize: 36, fontWeight: 700, color: item.color, fontFamily: serif, lineHeight: 1 }}>
              {item.value}
            </div>
            <div style={{ fontSize: 12.5, color: T.purple, marginTop: 8, fontWeight: 600 }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* BUGÜN / YARIN */}
      <div
        className="dashboard-appointments"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 26 }}
      >
        {/* BUGÜNÜN PROGRAMI */}
        <div style={{ background: T.white, border: `1px solid ${T.purple}30`, borderLeft: `3px solid ${T.gold}`, borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px 12px', marginBottom: 16 }}>
            <h3 style={{ margin: 0, minWidth: 0, fontSize: 17, fontWeight: 800, color: T.bg, fontFamily: sans }}>
              Bugünün programı
            </h3>
            <span style={{ fontSize: 12, color: T.purple, fontWeight: 600, flexShrink: 0 }}>
              {todayAppointments.length} randevu
            </span>
          </div>

          {loading ? (
            <div style={{ color: T.purple, fontSize: 13, padding: '12px 0' }}>Yükleniyor...</div>
          ) : todayAppointments.length === 0 ? (
            <div style={{ color: T.purple, fontSize: 13, padding: '16px 0', fontFamily: sans }}>
              Bugün için planlanmış randevu yok.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {todayAppointments.map((appointment, index) => {
                const timeStr = getIstanbulTime(appointment.date);
                const patient = appointment.patient;

                return (
                  <div
                    key={appointment.id}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 15,
                      padding: '13px 0',
                      borderTop: index === 0 ? 'none' : `1px solid ${T.purple}25`,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 9 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#8A6A1E', fontFamily: sans }}>
                          {timeStr}
                        </span>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: T.bg }}>
                          {appointment.title}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: T.purple, marginTop: 3 }}>
                        {patient?.fullName || 'Hasta bilgisi yok'}
                        {patient?.phone ? ` · ${patient.phone}` : ''}
                      </div>
                    </div>

                    {patient?.id ? (
                      <Link
                        href={`/admin/patients/${patient.id}`}
                        style={{ color: T.purpleDark, textDecoration: 'none', fontSize: 12, fontWeight: 700, borderBottom: `1px solid ${T.purpleDark}`, paddingBottom: 1, whiteSpace: 'nowrap' }}
                      >
                        Dosya
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* YARININ HATIRLATMALARI */}
        <div style={{ background: T.white, border: `1px solid ${T.purple}30`, borderLeft: `3px solid ${T.purpleDark}`, borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px 12px', marginBottom: 16 }}>
            <h3 style={{ margin: 0, minWidth: 0, fontSize: 17, fontWeight: 800, color: T.bg, fontFamily: sans }}>
              Yarının hatırlatmaları
            </h3>
            <span style={{ fontSize: 12, color: T.purpleDark, fontWeight: 700, flexShrink: 0 }}>
              WhatsApp
            </span>
          </div>

          {loading ? (
            <div style={{ color: T.purple, fontSize: 13, padding: '12px 0' }}>Yükleniyor...</div>
          ) : tomorrowAppointments.length === 0 ? (
            <div style={{ color: T.purple, fontSize: 13, padding: '16px 0', fontFamily: sans }}>
              Yarın için randevu bulunmuyor.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {tomorrowAppointments.map((appointment, index) => {
                const timeStr = getIstanbulTime(appointment.date);
                const patient = appointment.patient;

                return (
                  <div
                    key={appointment.id}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 15,
                      padding: '13px 0',
                      borderTop: index === 0 ? 'none' : `1px solid ${T.purple}25`,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 9 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: T.purpleDark, fontFamily: sans }}>
                          {timeStr}
                        </span>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: T.bg }}>
                          {appointment.title}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: T.purple, marginTop: 3 }}>
                        {patient?.fullName || 'Hasta bilgisi yok'}
                        {patient?.phone ? ` · ${patient.phone}` : ''}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => sendWhatsAppReminder(patient?.phone, patient?.fullName, appointment.date, appointment.title)}
                      style={{
                        background: '#25D366',
                        color: '#ffffff',
                        border: 'none',
                        padding: '7px 13px',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: sans,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Mesaj gönder
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* GÜNÜN NOTLARI */}
      <div style={{ background: T.white, border: `1px solid ${T.purple}30`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.bg, fontFamily: sans }}>
              Günün klinik notları
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: T.purple }}>
              Seçilen gün için özel notlar alın, geçmiş günlerin arşivine göz atın.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="note-date" style={{ fontSize: 12.5, fontWeight: 700, color: T.purple }}>
              Tarih:
            </label>
            <input
              id="note-date"
              type="date"
              value={selectedNoteDate}
              onChange={(event) => setSelectedNoteDate(event.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${T.purple}`, fontSize: 13, background: T.white, fontFamily: sans, color: T.bg }}
            />
          </div>
        </div>

        <div className="dashboard-notes" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <textarea
            rows={4}
            value={noteContent}
            onChange={(event) => setNoteContent(event.target.value)}
            placeholder={`${selectedNoteDate} tarihi için klinik notlarını buraya yazın...`}
            style={{
              width: '100%',
              padding: 13,
              borderRadius: 8,
              border: `1px solid ${T.purple}`,
              fontSize: 14,
              fontFamily: sans,
              boxSizing: 'border-box',
              outline: 'none',
              resize: 'vertical',
              color: T.bg,
              background: T.white,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={noteSaving}
              style={{
                background: T.purpleDark,
                color: T.gold,
                border: 'none',
                padding: '10px 22px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: noteSaving ? 'default' : 'pointer',
                fontFamily: sans,
                opacity: noteSaving ? 0.7 : 1,
              }}
            >
              {noteSaving ? 'Kaydediliyor...' : 'Notu kaydet'}
            </button>
          </div>

          <details style={{ background: '#F0E7F2', border: `1px solid ${T.purple}30`, borderRadius: 8, padding: '10px 14px' }}>
            <summary style={{ fontSize: 12, fontWeight: 700, color: T.purple, cursor: 'pointer' }}>
              Geçmiş notlar arşivi {pastNotesList.length > 0 ? `(${pastNotesList.length})` : ''}
            </summary>

            {pastNotesList.length === 0 ? (
              <div style={{ fontSize: 11.5, color: T.purple, fontFamily: sans, marginTop: 10 }}>
                Henüz geçmiş kayıt yok.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {pastNotesList.map((note) => (
                  <button
                    type="button"
                    key={note.id}
                    onClick={() => setSelectedNoteDate(note.date)}
                    style={{
                      background: selectedNoteDate === note.date ? T.purpleDark : T.white,
                      border: `1px solid ${selectedNoteDate === note.date ? T.purpleDark : T.purple}40`,
                      padding: '6px 12px',
                      borderRadius: 999,
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: selectedNoteDate === note.date ? 700 : 500,
                      color: selectedNoteDate === note.date ? T.gold : T.bg,
                      whiteSpace: 'nowrap',
                      fontFamily: sans,
                    }}
                  >
                    {note.date}
                  </button>
                ))}
              </div>
            )}
          </details>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          div {
            box-sizing: border-box;
          }
        }
        @media (max-width: 700px) {
          .dashboard-metrics {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .dashboard-appointments {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}