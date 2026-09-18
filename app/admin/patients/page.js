'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { T } from '@/lib/theme';
import Drawer from '@/components/Drawer';
import PhoneInput from '@/components/PhoneInput';

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);
const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
);
const IconPhone = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
);
const IconUserPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
);

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

const emptyNewPatient = { fullName: '', phone: '', birthDate: '', gender: '', allergies: '', notes: '' };

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [newPatient, setNewPatient] = useState(emptyNewPatient);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  const fetchPatients = useCallback(async (q) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hastalar alınamadı.');
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Hasta getirme hatası:', err);
      setError(err.message || 'Hastalar alınamadı.');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => fetchPatients(query), 300);
    return () => clearTimeout(timeout);
  }, [query, fetchPatients]);

  const handleAddPatient = async (e) => {
    e.preventDefault();
    if (!newPatient.fullName.trim()) return setAddError('Ad Soyad zorunludur.');
    if (!newPatient.phone.trim()) return setAddError('Telefon numarası zorunludur.');

    setAddSaving(true);
    setAddError('');
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatient),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hasta eklenemedi.');

      // Eski hasta kaydı: onam süreci olmadan doğrudan profiline gidip
      // geçmiş işlem/belge eklenebilir.
      router.push(`/admin/patients/${data.id}`);
    } catch (err) {
      setAddError(err.message || 'Hasta eklenemedi.');
    } finally {
      setAddSaving(false);
    }
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', color: T.bg, fontFamily: 'sans-serif' }}>
      <div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ color: T.purpleDark, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Novantis
          </div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: T.bg }}>Hasta Kayıtları</h1>
        </div>

        <section style={{ background: T.white, border: `1px solid ${T.purple}30`, borderRadius: 16, padding: 24, color: T.bg }}>

          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 320px' }}>
              <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: T.purple }}>
                <IconSearch />
              </div>
              <input
                type="text"
                placeholder="Hasta adı, soyadı veya telefon numarası ile ara..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', height: 46, padding: '0 14px 0 42px', border: `1px solid ${T.purple}`, borderRadius: 10, background: T.cream, color: T.bg, fontSize: 14, outline: 'none' }}
              />
            </div>

            <button
              type="button"
              onClick={() => { setNewPatient(emptyNewPatient); setAddError(''); setIsAddDrawerOpen(true); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: T.white, border: `1px solid ${T.purple}50`, color: T.bg, padding: '0 18px', height: 46, borderRadius: 10, fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', cursor: 'pointer' }}
            >
              <IconUserPlus /> Yeni Hasta Ekle
            </button>

            <Link
              href="/admin/new-session"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: T.gold, color: T.bg, padding: '0 18px', height: 46, borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}
            >
              <IconUserPlus /> Yeni Onam Gönder
            </Link>
          </div>

          {!loading && error && (
            <div style={{ padding: 16, borderRadius: 10, background: T.error, color: '#5A2030', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
              {error}
            </div>
          )}

          {!error && (
            <>
              {/* MASAÜSTÜ TABLO — veri yokken de iskelet (başlıklar) görünür kalır */}
              <div className="patients-desktop-table" style={{ width: '100%', background: T.white, border: `1px solid ${T.purple}30`, borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: T.cream, borderBottom: `1px solid ${T.purple}30`, color: T.purple, fontWeight: 700 }}>
                      <th style={{ padding: '12px 16px' }}>Ad Soyad</th>
                      <th style={{ padding: '12px 16px' }}>Telefon</th>
                      <th style={{ padding: '12px 16px' }}>Son İşlem</th>
                      <th style={{ padding: '12px 16px' }}>Son Tarih</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Toplam Seans</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Erişim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '28px 16px', textAlign: 'center', color: T.purple, fontSize: 13, fontWeight: 600 }}>
                          Yükleniyor...
                        </td>
                      </tr>
                    ) : patients.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '28px 16px', textAlign: 'center', color: T.purple, fontSize: 13, fontWeight: 500 }}>
                          {query ? 'Aramanıza uygun hasta kaydı bulunamadı.' : 'Henüz kayıtlı hasta bulunmuyor.'}
                        </td>
                      </tr>
                    ) : patients.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #EEE5F0' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <Link href={`/admin/patients/${p.id}`} style={{ color: T.purpleDark, textDecoration: 'none', fontWeight: 700 }}>
                            {p.fullName}
                          </Link>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#6F5A77' }}>{p.phone || '—'}</td>
                        <td style={{ padding: '14px 16px' }}>
                          {p.lastTreatmentType ? (
                            <span style={{ background: '#F0E7F2', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, color: T.purpleDark }}>
                              {p.lastTreatmentType}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#6F5A77' }}>{formatDate(p.lastTreatmentAt)}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{ background: '#E9F0EB', color: T.success, padding: '2px 8px', borderRadius: 10, fontWeight: 700, fontSize: 12 }}>
                            {p.treatmentCount || 0}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <Link href={`/admin/patients/${p.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: T.purple, textDecoration: 'none', fontWeight: 700, fontSize: 12 }}>
                            Detay <IconChevronRight />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBİL KART */}
              <div className="patients-mobile-list">
                {loading ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: T.purple, fontSize: 13, fontWeight: 600 }}>Yükleniyor...</div>
                ) : patients.length === 0 ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: T.purple, fontSize: 13 }}>
                    {query ? 'Aramanıza uygun hasta kaydı bulunamadı.' : 'Henüz kayıtlı hasta bulunmuyor.'}
                  </div>
                ) : patients.map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/patients/${p.id}`}
                    style={{ display: 'block', background: T.white, border: '1px solid #E2D5E5', borderRadius: 12, padding: 16, marginBottom: 12, textDecoration: 'none', color: 'inherit' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.bg }}>{p.fullName}</h3>
                        <span style={{ fontSize: 12, color: '#6F5A77', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <IconPhone /> {p.phone || 'Telefon Yok'}
                        </span>
                      </div>
                      <span style={{ background: '#E9F0EB', color: T.success, padding: '3px 8px', borderRadius: 10, fontWeight: 700, fontSize: 11 }}>
                        {p.treatmentCount || 0} Seans
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, marginTop: 10, borderTop: '1px solid #EEE5F0', fontSize: 12 }}>
                      <div>
                        <span style={{ color: '#6F5A77' }}>Son İşlem: </span>
                        <b style={{ color: T.bg }}>{p.lastTreatmentType || 'Yok'}</b>
                      </div>
                      <span style={{ color: T.purpleDark, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                        İncele <IconChevronRight />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <Drawer open={isAddDrawerOpen} onClose={() => !addSaving && setIsAddDrawerOpen(false)} title="Yeni Hasta Ekle">
        <p style={{ margin: '0 0 16px', fontSize: 12.5, color: T.purple, lineHeight: 1.5 }}>
          Onam süreci olmadan doğrudan hasta kaydı oluşturur — eski (kağıt üzerinde
          onamlı) hastaları sisteme girmek için kullanabilirsiniz. Kaydettikten
          sonra hasta profilinden geçmiş işlemleri ve taranmış onam belgesini
          ekleyebilirsiniz.
        </p>

        {addError && (
          <div style={{ padding: 12, borderRadius: 8, background: T.error, color: '#5A2030', fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
            {addError}
          </div>
        )}

        <form onSubmit={handleAddPatient} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={drawerLabelStyle}>Ad Soyad</label>
            <input value={newPatient.fullName} onChange={(e) => setNewPatient({ ...newPatient, fullName: e.target.value })} style={drawerInputStyle} />
          </div>
          <div>
            <label style={drawerLabelStyle}>Telefon</label>
            <PhoneInput value={newPatient.phone} onChange={(val) => setNewPatient({ ...newPatient, phone: val })} required />
          </div>
          <div>
            <label style={drawerLabelStyle}>Doğum Tarihi (opsiyonel)</label>
            <input type="date" value={newPatient.birthDate} onChange={(e) => setNewPatient({ ...newPatient, birthDate: e.target.value })} style={drawerInputStyle} />
          </div>
          <div>
            <label style={drawerLabelStyle}>Cinsiyet (opsiyonel)</label>
            <select value={newPatient.gender} onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })} style={drawerInputStyle}>
              <option value="">Seçiniz</option>
              <option value="Kadın">Kadın</option>
              <option value="Erkek">Erkek</option>
            </select>
          </div>
          <div>
            <label style={drawerLabelStyle}>Alerjiler / Hassasiyet (opsiyonel)</label>
            <input value={newPatient.allergies} onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })} style={drawerInputStyle} />
          </div>
          <div>
            <label style={drawerLabelStyle}>Not (opsiyonel)</label>
            <textarea rows={3} value={newPatient.notes} onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })} style={{ ...drawerInputStyle, resize: 'vertical' }} />
          </div>

          <button type="submit" disabled={addSaving} style={{ background: T.purpleDark, color: T.gold, border: 'none', padding: 12, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: addSaving ? 'not-allowed' : 'pointer', opacity: addSaving ? 0.7 : 1 }}>
            {addSaving ? 'Kaydediliyor...' : 'Hastayı Kaydet'}
          </button>
        </form>
      </Drawer>

      <style jsx>{`
        .patients-mobile-list { display: none; }
        @media (max-width: 760px) {
          .patients-desktop-table { display: none; }
          .patients-mobile-list { display: block; }
        }
      `}</style>
    </main>
  );
}

const drawerLabelStyle = {
  fontSize: 11.5,
  fontWeight: 700,
  color: T.purple,
  display: 'block',
  marginBottom: 5,
};

const drawerInputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: `1px solid ${T.purple}`,
  fontSize: 13.5,
  boxSizing: 'border-box',
  background: T.white,
  color: T.bg,
  outline: 'none',
};