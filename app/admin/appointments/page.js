'use client';

import { useEffect, useState, useMemo, useCallback, useRef, Fragment } from 'react';
import Link from 'next/link';
import PhoneInput from '@/components/PhoneInput';
import { buildWhatsAppUrl } from '@/lib/phone-utils';
import { T } from '@/lib/theme';
import { getColorHex } from '@/lib/appointment-colors';
import { APPOINTMENT_PROCEDURE_OPTIONS, buildAppointmentTitle } from '@/lib/appointment-categories';
import Drawer from '@/components/Drawer';

const IconCalendar = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const IconClock = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const IconUserPlus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>;
const IconPlus = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const IconCheckCircle = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const IconArrowLeft = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
const IconChevronLeft = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const IconChevronRight = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;
const IconSearch = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;

const getLocalDateString = (dateObj) => {
  const d = new Date(dateObj);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

const getLocalTimeString = (dateObj) => {
  const d = new Date(dateObj);
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

const getMatchedSlot = (exactTimeStr, timeSlots) => {
  if (!exactTimeStr) return null;
  if (timeSlots.includes(exactTimeStr)) return exactTimeStr;

  const [h, m] = exactTimeStr.split(':').map(Number);
  const totalMin = h * 60 + m;

  let closestSlot = timeSlots[0];
  let minDiff = Infinity;

  timeSlots.forEach((slot) => {
    const [sh, sm] = slot.split(':').map(Number);
    const slotMin = sh * 60 + sm;
    const diff = Math.abs(totalMin - slotMin);
    if (diff < minDiff) {
      minDiff = diff;
      closestSlot = slot;
    }
  });

  return closestSlot;
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString(new Date()));
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'week'

  const [patientSearch, setPatientSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedPatientObj, setSelectedPatientObj] = useState(null);

  const searchWrapperRef = useRef(null);

  const [newApp, setNewApp] = useState({
    patientId: '',
    title: 'İlk Muayene / Tanışma',
    type: 'INITIAL',
    notes: '',
  });

  const [isNewPatientMode, setIsNewPatientMode] = useState(false);
  const [quickPatient, setQuickPatient] = useState({ fullName: '', phone: '' });

  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');

  const [googleConnected, setGoogleConnected] = useState(null);

  useEffect(() => {
    fetch('/api/auth/google/status')
      .then((r) => r.json())
      .then((data) => setGoogleConnected(Boolean(data.connected)))
      .catch(() => setGoogleConnected(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('google_error');
    const connected = params.get('google');
    if (error) alert('Google Takvim bağlanamadı: ' + error);
    if (connected === 'connected') alert('Google Takvim başarıyla bağlandı.');
    if (error || connected) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [appRes, patRes, prodRes] = await Promise.all([
        fetch('/api/appointments'),
        fetch('/api/patients'),
        fetch('/api/inventory/products'),
      ]);
      const appData = await appRes.json();
      const patData = await patRes.json();

      if (appRes.ok) setAppointments(appData);
      if (patRes.ok) setPatients(patData);
      if (prodRes.ok) setProducts(await prodRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredPatients = useMemo(() => {
    if (!patientSearch) return patients.slice(0, 8);
    return patients.filter((p) =>
      p.fullName.toLowerCase().includes(patientSearch.toLowerCase()) ||
      (p.phone && p.phone.includes(patientSearch))
    );
  }, [patients, patientSearch]);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 9; hour <= 20; hour++) {
      const hStr = hour.toString().padStart(2, '0');
      slots.push(`${hStr}:00`);
      if (hour !== 20) slots.push(`${hStr}:30`);
    }
    return slots;
  }, []);

  const monthCalendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDate = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ dateStr: getLocalDateString(pDate), dayNumber: pDate.getDate(), isCurrentMonth: false });
    }

    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      const cDate = new Date(year, month, d);
      days.push({ dateStr: getLocalDateString(cDate), dayNumber: d, isCurrentMonth: true });
    }

    const totalCells = days.length > 35 ? 42 : 35;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nDate = new Date(year, month + 1, i);
      days.push({ dateStr: getLocalDateString(nDate), dayNumber: i, isCurrentMonth: false });
    }

    return days;
  }, [currentMonthDate]);

  const appointmentsByDateMap = useMemo(() => {
    const map = {};
    appointments.forEach((app) => {
      if (!app.date || app.status === 'CANCELED') return;
      const dateStr = getLocalDateString(app.date);
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(app);
    });
    return map;
  }, [appointments]);

  const dayAppointments = useMemo(() => {
    return appointments.filter((app) => {
      if (!app.date || app.status === 'CANCELED') return false;
      return getLocalDateString(app.date) === selectedDate;
    });
  }, [appointments, selectedDate]);

  const weekDates = useMemo(() => {
    const base = new Date(`${selectedDate}T00:00:00`);
    let dayOfWeek = base.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;

    const monday = new Date(base);
    monday.setDate(base.getDate() - dayOfWeek);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { dateStr: getLocalDateString(d), dayNumber: d.getDate(), weekdayLabel: d.toLocaleDateString('tr-TR', { weekday: 'short' }) };
    });
  }, [selectedDate]);

  const weekSlotMap = useMemo(() => {
    const map = {};
    weekDates.forEach(({ dateStr }) => {
      map[dateStr] = {};
      const dayApps = appointmentsByDateMap[dateStr] || [];
      dayApps.forEach((app) => {
        const exactTimeStr = getLocalTimeString(app.date);
        const matchedSlot = getMatchedSlot(exactTimeStr, timeSlots);
        if (!matchedSlot) return;
        if (!map[dateStr][matchedSlot]) map[dateStr][matchedSlot] = [];
        map[dateStr][matchedSlot].push({ ...app, exactTimeStr });
      });
    });
    return map;
  }, [weekDates, appointmentsByDateMap, timeSlots]);

  const slotMap = useMemo(() => {
    const map = {};
    dayAppointments.forEach((app) => {
      const exactTimeStr = getLocalTimeString(app.date);
      const matchedSlot = getMatchedSlot(exactTimeStr, timeSlots);
      if (matchedSlot) {
        if (!map[matchedSlot]) map[matchedSlot] = [];
        map[matchedSlot].push({ ...app, exactTimeStr });
      }
    });
    return map;
  }, [dayAppointments, timeSlots]);

  const handleCreateAppointment = async (e) => {
    e.preventDefault();

    const fullDateTimeStr = `${selectedDate}T${selectedTime}:00`;
    let targetPatientId = newApp.patientId;

    if (isNewPatientMode) {
      if (!quickPatient.fullName || !quickPatient.phone) {
        return alert('Lütfen yeni danışanın Ad Soyad ve Telefon bilgisini giriniz.');
      }
      try {
        const createPatRes = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(quickPatient),
        });

        const createdPat = await createPatRes.json();
        if (!createPatRes.ok) throw new Error(createdPat.error || 'Hasta eklenemedi.');
        targetPatientId = createdPat.id;
      } catch (err) {
        return alert('Yeni danışan eklenirken hata: ' + err.message);
      }
    }

    if (!targetPatientId) return alert('Lütfen bir hasta seçiniz.');

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newApp,
          patientId: targetPatientId,
          date: fullDateTimeStr,
        }),
      });

      const resData = await res.json();

      if (res.ok) {
        setNewApp({ patientId: '', title: 'İlk Muayene / Tanışma', type: 'INITIAL', notes: '' });
        setSelectedPatientObj(null);
        setPatientSearch('');
        setQuickPatient({ fullName: '', phone: '' });
        setIsNewPatientMode(false);
        setSelectedProductId('');
        setIsDrawerOpen(false);
        fetchData();
      } else {
        alert('Randevu kaydı oluşturulamadı: ' + (resData.error || 'Bilinmeyen hata'));
      }
    } catch (err) {
      alert('Randevu eklenemedi: ' + err.message);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res = await fetch(`/api/appointments?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchData();
    } catch (err) {
      alert('Güncellenemedi');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Randevuyu silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/appointments?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) {
      alert('Silinemedi');
    }
  };

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [draggedAppId, setDraggedAppId] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);

  const moveAppointment = async (appId, newDateTimeStr) => {
    try {
      const res = await fetch(`/api/appointments?id=${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDateTimeStr }),
      });
      if (res.ok) fetchData();
      else alert('Randevu taşınamadı');
    } catch (err) {
      alert('Randevu taşınamadı: ' + err.message);
    }
  };

  const handleDropOnSlot = async (targetSlotTime, dayStr) => {
    const appId = draggedAppId;
    setDraggedAppId(null);
    setDragOverSlot(null);
    if (!appId) return;

    const newDateTimeStr = `${dayStr || selectedDate}T${targetSlotTime}:00`;
    await moveAppointment(appId, newDateTimeStr);
  };

  const openWhatsApp = (phone, patientName, dateStr, title) => {
    if (!phone) return alert('Hastanın telefonu yok.');
    const dateFormatted = new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    const procedureName = String(title || '').split(' – ')[0].trim();
    const message = `Sayın ${patientName}, Novantis'te ${dateFormatted} tarihindeki "${procedureName}" randevunuzu hatırlatmak isteriz.`;

    const url = buildWhatsAppUrl(phone, message);
    if (!url) return alert('Telefon numarası geçersiz.');
    window.open(url, '_blank');
  };

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', color: '#0f172a' }}>

      {/* ÜST BAŞLIK BARI */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: `1px solid ${T.purple}30`, paddingBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: '700', color: T.purpleDark, textTransform: 'uppercase', letterSpacing: '0.05em' }}>KLİNİK AJANDASI</span>
          <h1 style={{ margin: '2px 0 0 0', fontSize: 22, fontWeight: '800', color: T.bg, letterSpacing: '-0.02em' }}>
            Akıllı Randevu Çizelgesi & Takvim
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {googleConnected === false && (
            <a
              href="/api/auth/google/connect"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #E2D5E5', padding: '8px 14px', borderRadius: 8, color: T.purpleDark, textDecoration: 'none', fontWeight: '700', fontSize: 13 }}
            >
              <IconCalendar /> Google Takvim&apos;i Bağla
            </a>
          )}
          {googleConnected === true && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E9F0EB', border: '1px solid #A7C4AF', padding: '8px 14px', borderRadius: 8, color: T.success, fontWeight: '700', fontSize: 13 }}>
              <IconCalendar /> Google Takvim Bağlı
            </span>
          )}
          <Link href="/admin/patients" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ffffff', border: `1px solid ${T.purple}50`, padding: '8px 14px', borderRadius: 8, color: T.bg, textDecoration: 'none', fontWeight: '700', fontSize: 13 }}>
            <IconArrowLeft /> Hasta Listesi
          </Link>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: T.purpleDark, border: 'none', padding: '8px 16px', borderRadius: 8, color: T.gold, fontWeight: '700', fontSize: 13, cursor: 'pointer' }}
          >
            <IconPlus /> Yeni Randevu
          </button>
        </div>
      </div>

      {/* GÜN ÇİZELGESİ (ANA) + AYLIK TAKVİM (KÜÇÜK WIDGET) */}
      <div className="agenda-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', alignItems: 'start', gap: 20 }}>

        {/* SOL: KÜÇÜK AYLIK TAKVİM WIDGET'I */}
        <div style={{ background: '#ffffff', borderRadius: 12, border: `1px solid ${T.purple}30`, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 6 }}>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: '800', color: T.bg, display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconCalendar /> {currentMonthDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
            </h2>

            <div style={{ display: 'flex', gap: 3 }}>
              <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1))} style={{ background: '#f1f5f9', border: 'none', padding: '4px 6px', borderRadius: 5, cursor: 'pointer', display: 'flex' }}>
                <IconChevronLeft />
              </button>
              <button onClick={() => { const today = new Date(); setCurrentMonthDate(today); setSelectedDate(getLocalDateString(today)); }} style={{ background: '#F0E7F2', border: 'none', padding: '4px 8px', borderRadius: 5, fontSize: 10, fontWeight: '700', cursor: 'pointer', color: T.purpleDark }}>
                Bugün
              </button>
              <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1))} style={{ background: '#f1f5f9', border: 'none', padding: '4px 6px', borderRadius: 5, cursor: 'pointer', display: 'flex' }}>
                <IconChevronRight />
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
          {['P', 'S', 'Ç', 'P', 'C', 'C', 'P'].map((dayName, i) => (
            <div key={i} style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', paddingBottom: 4 }}>{dayName}</div>
          ))}

          {monthCalendarDays.map((item, idx) => {
            const dayApps = appointmentsByDateMap[item.dateStr] || [];
            const isSelected = selectedDate === item.dateStr;
            const isToday = getLocalDateString(new Date()) === item.dateStr;

            return (
              <div
                key={idx}
                onClick={() => setSelectedDate(item.dateStr)}
                style={{
                  minHeight: 28,
                  padding: 2,
                  borderRadius: 6,
                  border: isSelected ? `2px solid ${T.purpleDark}` : isToday ? `1px solid ${T.gold}` : '1px solid transparent',
                  background: isSelected ? '#F0E7F2' : isToday ? '#FBF3E3' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: item.isCurrentMonth ? 1 : 0.35,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: isSelected || isToday ? '800' : '600', color: isSelected ? T.purpleDark : T.bg }}>
                  {item.dayNumber}
                </span>

                {dayApps.length > 0 && (
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? T.purpleDark : T.gold, marginTop: 1 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

        {/* GÜN/HAFTA ÇİZELGESİ (agenda-grid'in 2. sütunu) */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: '700', color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconClock />
              {viewMode === 'day'
                ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })
                : `${weekDates[0].dayNumber} - ${weekDates[6].dayNumber} ${new Date(`${weekDates[6].dateStr}T00:00:00`).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}`}
            </span>
            <button
              type="button"
              onClick={() => setViewMode((v) => (v === 'day' ? 'week' : 'day'))}
              style={{ background: viewMode === 'week' ? T.purpleDark : '#f1f5f9', color: viewMode === 'week' ? T.gold : '#334155', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: '700', cursor: 'pointer' }}
            >
              {viewMode === 'day' ? 'Haftalık Görünüme Geç' : 'Günlük Görünüme Dön'}
            </button>
          </h3>

          {loading ? (
            <div style={{ color: '#64748b', fontSize: 13, padding: '20px 0' }}>Yükleniyor...</div>
          ) : viewMode === 'week' ? (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(7, minmax(110px, 1fr))`, gap: 4, minWidth: 850 }}>
                <div />
                {weekDates.map(({ dateStr, dayNumber, weekdayLabel }) => (
                  <div
                    key={dateStr}
                    onClick={() => { setSelectedDate(dateStr); setViewMode('day'); }}
                    style={{
                      textAlign: 'center',
                      padding: '4px 2px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: dateStr === getLocalDateString(new Date()) ? '#FBF3E3' : 'transparent',
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>{weekdayLabel}</div>
                    <div style={{ fontSize: 13, fontWeight: '800', color: T.bg }}>{dayNumber}</div>
                  </div>
                ))}

                {timeSlots.map((slotTime) => (
                  <Fragment key={slotTime}>
                    <div style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', textAlign: 'right', paddingRight: 4, paddingTop: 4 }}>
                      {slotTime}
                    </div>
                    {weekDates.map(({ dateStr }) => {
                      const occupiedApps = weekSlotMap[dateStr]?.[slotTime] || [];
                      const cellKey = `${dateStr}-${slotTime}`;
                      const isDragOver = dragOverSlot === cellKey;

                      return (
                        <div
                          key={cellKey}
                          onDragOver={(e) => { e.preventDefault(); setDragOverSlot(cellKey); }}
                          onDragLeave={() => setDragOverSlot((cur) => (cur === cellKey ? null : cur))}
                          onDrop={(e) => { e.preventDefault(); handleDropOnSlot(slotTime, dateStr); }}
                          style={{
                            minHeight: 30,
                            border: isDragOver ? `2px dashed ${T.gold}` : '1px solid #f1f5f9',
                            borderRadius: 4,
                            background: isDragOver ? '#FFF8E7' : occupiedApps.length > 0 ? '#fef2f2' : '#ffffff',
                            padding: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                          }}
                        >
                          {occupiedApps.map((occupiedApp) => (
                            <div
                              key={occupiedApp.id}
                              draggable
                              onDragStart={(e) => { e.stopPropagation(); setDraggedAppId(occupiedApp.id); }}
                              onDragEnd={() => setDraggedAppId(null)}
                              onClick={() => { setSelectedDate(dateStr); setViewMode('day'); }}
                              title={`${occupiedApp.exactTimeStr} — ${occupiedApp.title} — ${occupiedApp.patient?.fullName || 'Hasta atanmadı'}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                                background: '#ffffff',
                                border: '1px solid #fecdd3',
                                borderRadius: 4,
                                padding: '2px 4px',
                                cursor: 'grab',
                                opacity: draggedAppId === occupiedApp.id ? 0.5 : 1,
                                overflow: 'hidden',
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: getColorHex(occupiedApp.colorId), flexShrink: 0 }} />
                              <span style={{ fontSize: 10, fontWeight: '700', color: '#991b1b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {occupiedApp.patient?.fullName || occupiedApp.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {timeSlots.map((slotTime) => {
                const occupiedApps = slotMap[slotTime] || [];
                const isSelected = selectedTime === slotTime;

                const isDragOver = dragOverSlot === slotTime;

                return (
                  <div
                    key={slotTime}
                    onClick={() => setSelectedTime(slotTime)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverSlot(slotTime); }}
                    onDragLeave={() => setDragOverSlot((cur) => (cur === slotTime ? null : cur))}
                    onDrop={(e) => { e.preventDefault(); handleDropOnSlot(slotTime); }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: isDragOver ? `2px dashed ${T.gold}` : isSelected ? `2px solid ${T.purpleDark}` : '1px solid #e2e8f0',
                      background: isDragOver ? '#FFF8E7' : occupiedApps.length > 0 ? '#fef2f2' : isSelected ? '#F0E7F2' : '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: '800', color: isSelected ? T.purpleDark : '#334155', minWidth: 48 }}>
                        {slotTime}
                      </span>

                      {occupiedApps.length === 0 ? (
                        <span style={{ fontSize: 12, color: isSelected ? T.purpleDark : '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {isSelected ? <><IconCheckCircle /> Seçili Slot (Uygun)</> : 'Boş Slot'}
                        </span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 200 }}>
                          {occupiedApps.map((occupiedApp) => (
                            <div
                              key={occupiedApp.id}
                              draggable
                              onDragStart={(e) => { e.stopPropagation(); setDraggedAppId(occupiedApp.id); }}
                              onDragEnd={() => setDraggedAppId(null)}
                              onClick={(e) => e.stopPropagation()}
                              title="Başka bir saate taşımak için sürükleyin"
                              style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '6px 10px', borderRadius: 6, border: '1px solid #fecdd3', gap: 6, cursor: 'grab', opacity: draggedAppId === occupiedApp.id ? 0.5 : 1 }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span
                                  title={occupiedApp.colorId ? undefined : 'Renk atanmamış'}
                                  style={{ width: 10, height: 10, borderRadius: '50%', background: getColorHex(occupiedApp.colorId), flexShrink: 0 }}
                                />
                                <span style={{ fontSize: 11, background: T.purpleDark, color: '#ffffff', padding: '2px 6px', borderRadius: 4, fontWeight: '800' }}>
                                  {occupiedApp.exactTimeStr}
                                </span>
                                <span style={{ fontSize: 13, fontWeight: '700', color: '#991b1b' }}>{occupiedApp.title}</span>
                                <span style={{ fontSize: 12, color: '#475569' }}>
                                  — <b>{occupiedApp.patient?.fullName || 'Hasta atanmadı'}</b>
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button onClick={(e) => { e.stopPropagation(); openWhatsApp(occupiedApp.patient?.phone, occupiedApp.patient?.fullName, occupiedApp.date, occupiedApp.title); }} style={{ background: '#25D366', color: '#ffffff', border: 'none', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: '700', cursor: 'pointer' }}>
                                  WA
                                </button>
                                <select value={occupiedApp.status} onChange={(e) => { e.stopPropagation(); handleStatusChange(occupiedApp.id, e.target.value); }} style={{ padding: '3px 6px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 11 }}>
                                  <option value="PENDING">Bekliyor</option>
                                  <option value="ATTENDED">Geldi</option>
                                  <option value="NO_SHOW">Gelmedi</option>
                                  <option value="CANCELED">İptal</option>
                                </select>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(occupiedApp.id); }} style={{ background: '#fff1f2', border: 'none', color: '#e11d48', padding: '4px 6px', borderRadius: 4, cursor: 'pointer' }}>
                                  <IconTrash />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      <Drawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Yeni Randevu">
        <div style={{ background: '#F0E7F2', border: '1px solid #E2D5E5', padding: '10px 12px', borderRadius: 8, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: T.purpleDark, fontWeight: '600', display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconClock /> Saat Seçin / Yazın:
          </span>
          <input
            type="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            style={{ border: `1px solid ${T.purpleDark}`, borderRadius: 6, padding: '4px 8px', fontSize: 14, fontWeight: '800', color: T.purpleDark, background: '#ffffff', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: '#f1f5f9', padding: 3, borderRadius: 6 }}>
          <button type="button" onClick={() => setIsNewPatientMode(false)} style={{ flex: 1, padding: '6px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: '600', cursor: 'pointer', background: !isNewPatientMode ? '#ffffff' : 'transparent', color: !isNewPatientMode ? '#0f172a' : '#64748b' }}>
            Kayıtlı Hasta
          </button>
          <button type="button" onClick={() => { setIsNewPatientMode(true); setNewApp(prev => ({ ...prev, type: 'INITIAL', title: 'İlk Muayene / Tanışma' })); }} style={{ flex: 1, padding: '6px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: '600', cursor: 'pointer', background: isNewPatientMode ? '#ffffff' : 'transparent', color: isNewPatientMode ? '#0f172a' : '#64748b' }}>
            Yeni Müşteri
          </button>
        </div>

        <form onSubmit={handleCreateAppointment} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!isNewPatientMode ? (
            <div style={{ position: 'relative' }} ref={searchWrapperRef}>
              <label style={{ fontSize: 11, fontWeight: '600', color: '#475569', display: 'block', marginBottom: 3 }}>
                Kayıtlı Hasta Ara
              </label>

              {selectedPatientObj ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: '700', color: '#166534' }}>{selectedPatientObj.fullName}</div>
                    <div style={{ fontSize: 11, color: '#15803d' }}>{selectedPatientObj.phone || 'Tel yok'}</div>
                  </div>
                  <button type="button" onClick={() => { setSelectedPatientObj(null); setNewApp({ ...newApp, patientId: '' }); setPatientSearch(''); }} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: '700', cursor: 'pointer' }}>
                    Değiştir
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ position: 'relative' }}>
                    <input type="text" placeholder="Hasta adı veya telefon..." value={patientSearch} onChange={(e) => { setPatientSearch(e.target.value); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }} />
                    <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><IconSearch /></div>
                  </div>

                  {isDropdownOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, marginTop: 4, maxHeight: 180, overflowY: 'auto', zIndex: 50 }}>
                      {filteredPatients.length === 0 ? (
                        <div style={{ padding: 10, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>Hasta bulunamadı</div>
                      ) : (
                        filteredPatients.map((p) => (
                          <div key={p.id} onClick={() => { setSelectedPatientObj(p); setNewApp({ ...newApp, patientId: p.id }); setIsDropdownOpen(false); }} style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: '600', color: '#0f172a' }}>{p.fullName}</span>
                            <span style={{ fontSize: 11, color: '#64748b' }}>{p.phone || 'Tel yok'}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: '700', color: '#166534', display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconUserPlus /> Yeni Müşteri Bilgisi:
              </span>
              <input placeholder="Ad Soyad" value={quickPatient.fullName} onChange={(e) => setQuickPatient({ ...quickPatient, fullName: e.target.value })} style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }} />
              <PhoneInput value={quickPatient.phone} onChange={(val) => setQuickPatient({ ...quickPatient, phone: val })} required />
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, fontWeight: '600', color: '#475569' }}>Randevu Türü</label>
            <select value={newApp.type} onChange={(e) => { const t = e.target.value; setNewApp({ ...newApp, type: t, title: t === 'INITIAL' ? 'İlk Muayene / Tanışma' : t === 'TOUCH_UP' ? 'Rötuş / Kontrol' : 'Rutin Seans' }); }} style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', marginTop: 3, fontSize: 12 }}>
              <option value="INITIAL">İlk Seans / Yeni Muayene</option>
              <option value="TOUCH_UP">Rötuş / Kontrol</option>
              <option value="ROUTINE">Rutin Seans</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: '600', color: '#475569', display: 'block', marginBottom: 4 }}>İşlem (hızlı seçim)</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {APPOINTMENT_PROCEDURE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setNewApp((prev) => ({ ...prev, title: buildAppointmentTitle(opt, products.find((p) => p.id === selectedProductId)?.name) }))}
                  style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${T.purpleDark}`, background: newApp.title.startsWith(opt) ? T.purpleDark : '#fff', color: newApp.title.startsWith(opt) ? '#fff' : T.purpleDark, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: '600', color: '#475569' }}>Ürün (opsiyonel — envanterden)</label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                const productId = e.target.value;
                setSelectedProductId(productId);
                const product = products.find((p) => p.id === productId);
                setNewApp((prev) => ({ ...prev, title: buildAppointmentTitle(prev.title, product?.name) }));
              }}
              style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', marginTop: 3, fontSize: 12 }}
            >
              <option value="">Ürün seçilmedi</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: '600', color: '#475569' }}>İşlem Başlığı</label>
            <input value={newApp.title} onChange={(e) => setNewApp({ ...newApp, title: e.target.value })} placeholder="Örn: Botoks Kontrolü" style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', marginTop: 3, fontSize: 12, boxSizing: 'border-box' }} />
          </div>

          <button type="submit" style={{ marginTop: 4, background: T.purpleDark, color: '#ffffff', border: 'none', padding: '10px', borderRadius: 6, fontWeight: '700', fontSize: 13, cursor: 'pointer' }}>
            Saat {selectedTime} Randevusunu Kaydet
          </button>
        </form>
      </Drawer>

      <style jsx>{`
        @media (max-width: 860px) {
          .agenda-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}