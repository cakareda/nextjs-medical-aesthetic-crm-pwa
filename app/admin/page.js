'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

// ---- NOVANTİS MARKA RENK PALETİ (Nurlana'nın istediği) ----
const T = {
  bg: '#24152F',        // mürdüm - ana arka plan
  purple: '#5A3A70',     // ametist - ikincil
  purpleDark: '#4A2859', // buton mürdüm
  gold: '#C9A45C',       // altın - vurgu
  cream: '#FFF0E8',      // krem - kart/form alanları
  white: '#FFFFFF',
  success: '#789681',    // adaçayı - başarı
  error: '#E8C9D1',      // gül tonu - hata/uyarı
};

const sans = 'var(--font-inter), sans-serif';

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
      className={inter.variable}
      style={{
        maxWidth: 1040,
        margin: '0 auto',
        background: T.bg,
        padding: '8px 4px 36px',
        fontFamily: sans,
        minHeight: '100vh',
        color: T.white,
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
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p style={{ margin: '0 0 6px 0', fontSize: 13, fontWeight: 700, color: T.gold, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: sans }}>
            Novantis Anasayfa Paneli
          </p>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: T.white, fontFamily: sans, letterSpacing: '-0.01em' }}>
            {formatDate()}
          </h1>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.gold, fontFamily: sans, lineHeight: 1 }}>
            {stats.todayAppointmentsCount}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
            bugünkü randevu
          </div>
        </div>
      </div>

      {/* İSTATİSTİK KARTLARI */}
      <div
        className="dashboard-metrics"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          border: `1px solid ${T.purple}`,
          borderRadius: 12,
          marginBottom: 26,
          background: T.cream,
          overflow: 'hidden',
        }}
      >
        {[
          { label: 'Kayıtlı toplam hasta', value: stats.totalPatients, color: T.purpleDark },
          { label: 'Bugünkü randevular', value: stats.todayAppointmentsCount, color: T.success },
          { label: 'Bekleyen rötuş / kontrol', value: stats.pendingTouchUpsCount, color: '#8B4A5A' },
        ].map((item, index) => (
          <div
            key={item.label}
            style={{
              padding: '18px 22px',
              borderLeft: index === 0 ? 'none' : `1px solid ${T.purple}30`,
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 800, color: item.color, fontFamily: sans, lineHeight: 1 }}>
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
        <div style={{ background: T.cream, border: `1px solid ${T.purple}`, borderLeft: `3px solid ${T.gold}`, borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.bg, fontFamily: sans }}>
              Bugünün programı
            </h3>
            <span style={{ fontSize: 12, color: T.purple, fontWeight: 600 }}>
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
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 15,
                      padding: '13px 0',
                      borderTop: index === 0 ? 'none' : `1px solid ${T.purple}25`,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
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
        <div style={{ background: T.cream, border: `1px solid ${T.purple}`, borderLeft: `3px solid ${T.purpleDark}`, borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.bg, fontFamily: sans }}>
              Yarının hatırlatmaları
            </h3>
            <span style={{ fontSize: 12, color: T.purpleDark, fontWeight: 700 }}>
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
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 15,
                      padding: '13px 0',
                      borderTop: index === 0 ? 'none' : `1px solid ${T.purple}25`,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
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
      <div style={{ background: T.cream, border: `1px solid ${T.purple}`, borderRadius: 12, padding: '24px 26px', marginBottom: 20 }}>
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

        <div className="dashboard-notes" style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
          </div>

          <div style={{ background: '#F0E7F2', border: `1px solid ${T.purple}`, borderRadius: 8, padding: 14, maxHeight: 160, overflowY: 'auto' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.purple, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${T.purple}30` }}>
              Geçmiş notlar arşivi
            </div>

            {pastNotesList.length === 0 ? (
              <div style={{ fontSize: 11.5, color: T.purple, fontFamily: sans }}>
                Henüz geçmiş kayıt yok.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {pastNotesList.map((note) => (
                  <button
                    type="button"
                    key={note.id}
                    onClick={() => setSelectedNoteDate(note.date)}
                    style={{
                      textAlign: 'left',
                      background: selectedNoteDate === note.date ? '#E9DDF0' : 'transparent',
                      border: 'none',
                      borderLeft: selectedNoteDate === note.date ? `2px solid ${T.gold}` : '2px solid transparent',
                      padding: '6px 9px',
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: selectedNoteDate === note.date ? 700 : 500,
                      color: T.bg,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontFamily: sans,
                    }}
                  >
                    {note.date}
                  </button>
                ))}
              </div>
            )}
          </div>
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
            grid-template-columns: 1fr !important;
          }
          .dashboard-appointments {
            grid-template-columns: 1fr !important;
          }
          .dashboard-notes {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}