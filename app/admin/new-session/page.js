'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import PhoneInput from '@/components/PhoneInput';
import { T } from '@/lib/theme';

const TEMPLATES = [
  { file: 'dolgu_uygulama_onam_fromu.pdf', label: 'Dolgu Uygulaması Onam Formu' },
  { file: 'botilinum_toksin_uygulamalari_onam_formu.pdf', label: 'Botoks (Botulinum Toksin) Onam Formu' },
  { file: 'mezoterapi_onam_formu.pdf', label: 'Mezoterapi Onam Formu' },
];

export default function NewSessionPage() {
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedPatientObj, setSelectedPatientObj] = useState(null);
  const searchWrapperRef = useRef(null);

  const [isNewPatientMode, setIsNewPatientMode] = useState(false);

  const [form, setForm] = useState({
    patientName: '',
    phone: '',
    treatmentType: '',
    productBrand: '',
    templateFile: TEMPLATES[0].file,
    price: '',
    paidAmount: '',
  });

  // ─── İŞLEM TÜRÜ (geçmişten türeyen combobox) ───
  const [treatmentTypeOptions, setTreatmentTypeOptions] = useState([]);
  const [isTreatmentTypeDropdownOpen, setIsTreatmentTypeDropdownOpen] = useState(false);
  const treatmentTypeWrapperRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sessionResult, setSessionResult] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    fetch('/api/patients')
      .then((r) => r.json())
      .then((data) => setPatients(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));

    fetch('/api/treatments/types')
      .then((r) => r.json())
      .then((data) => setTreatmentTypeOptions(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
      if (treatmentTypeWrapperRef.current && !treatmentTypeWrapperRef.current.contains(e.target)) {
        setIsTreatmentTypeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredPatients = patientSearch
    ? patients.filter((p) =>
        p.fullName.toLowerCase().includes(patientSearch.toLowerCase()) ||
        (p.phone && p.phone.includes(patientSearch))
      )
    : patients.slice(0, 8);

  const filteredTreatmentTypes = form.treatmentType
    ? treatmentTypeOptions.filter((t) =>
        t.toLowerCase().includes(form.treatmentType.toLowerCase())
      )
    : treatmentTypeOptions;

  const handleSelectPatient = (p) => {
    setSelectedPatientObj(p);
    setForm((prev) => ({ ...prev, patientName: p.fullName, phone: p.phone || '' }));
    setIsDropdownOpen(false);
  };

  const handleReset = () => {
    setForm({
      patientName: '',
      phone: '',
      treatmentType: '',
      productBrand: '',
      templateFile: TEMPLATES[0].file,
      price: '',
      paidAmount: '',
    });
    setSelectedPatientObj(null);
    setPatientSearch('');
    setIsNewPatientMode(false);
    setSessionResult(null);
    setQrDataUrl('');
    setErrorMsg('');
  };

  const generateQr = useCallback(async (url) => {
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 320, margin: 1 });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('QR üretilemedi:', err);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.patientName || !form.treatmentType || !form.templateFile) {
      setErrorMsg('Hasta adı, işlem türü ve form seçimi zorunludur.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Oturum oluşturulamadı');

      const signUrl = `${window.location.origin}/sign/${data.sessionId}`;
      setSessionResult({ sessionId: data.sessionId, url: signUrl });
      await generateQr(signUrl);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!sessionResult?.url) return;
    try {
      await navigator.clipboard.writeText(sessionResult.url);
      alert('Bağlantı kopyalandı.');
    } catch {
      alert('Kopyalanamadı, elle seçip kopyalayabilirsiniz: ' + sessionResult.url);
    }
  };

  if (sessionResult) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', color: '#0f172a' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 32 }}>
          <h2 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 800 }}>Onam Formu Hazır</h2>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
            Tableti QR koda okutun, hasta formu doldurup imzalasın.
          </p>

          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Kod" style={{ width: 240, height: 240, margin: '0 auto', border: '1px solid #e2e8f0', borderRadius: 8 }} />
          ) : (
            <div style={{ padding: 40, color: '#94a3b8', fontSize: 13 }}>QR kod oluşturuluyor...</div>
          )}

          <div style={{ marginTop: 20, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#475569', wordBreak: 'break-all' }}>
            {sessionResult.url}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'center' }}>
            <button
              onClick={handleCopyLink}
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Bağlantıyı Kopyala
            </button>
            <button
              onClick={handleReset}
              style={{ background: '#4A2859', color: '#C9A45C', border: 'none', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Yeni Oturum Başlat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', color: '#0f172a' }}>
      <div style={{ marginBottom: 20, borderBottom: `1px solid ${T.purple}30`, paddingBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.purpleDark, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ONAM SÜRECİ</span>
        <h1 style={{ margin: '2px 0 0 0', fontSize: 22, fontWeight: 800, color: T.bg }}>Yeni İşlem / Onam Formu Gönder</h1>
      </div>

      {errorMsg && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="new-session-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* SOL SÜTUN: HASTA & İŞLEM SEÇİMİ */}
        <div style={{ background: T.white, border: `1px solid ${T.purple}30`, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 6 }}>
          <button type="button" onClick={() => { setIsNewPatientMode(false); }} style={{ flex: 1, padding: '6px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: !isNewPatientMode ? '#ffffff' : 'transparent', color: !isNewPatientMode ? '#0f172a' : '#64748b' }}>
            Kayıtlı Hasta
          </button>
          <button type="button" onClick={() => { setIsNewPatientMode(true); setSelectedPatientObj(null); setPatientSearch(''); }} style={{ flex: 1, padding: '6px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: isNewPatientMode ? '#ffffff' : 'transparent', color: isNewPatientMode ? '#0f172a' : '#64748b' }}>
            Yeni Hasta
          </button>
        </div>

        {!isNewPatientMode ? (
          <div style={{ position: 'relative' }} ref={searchWrapperRef}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Hasta Ara</label>

            {selectedPatientObj ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>{selectedPatientObj.fullName}</div>
                  <div style={{ fontSize: 11, color: '#15803d' }}>{selectedPatientObj.phone || 'Tel yok'}</div>
                </div>
                <button type="button" onClick={() => { setSelectedPatientObj(null); setForm((f) => ({ ...f, patientName: '', phone: '' })); setPatientSearch(''); }} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Değiştir
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Hasta adı veya telefon..."
                  value={patientSearch}
                  onChange={(e) => { setPatientSearch(e.target.value); setIsDropdownOpen(true); }}
                  onFocus={() => setIsDropdownOpen(true)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                />
                {isDropdownOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, marginTop: 4, maxHeight: 180, overflowY: 'auto', zIndex: 50 }}>
                    {filteredPatients.length === 0 ? (
                      <div style={{ padding: 10, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>Hasta bulunamadı</div>
                    ) : (
                      filteredPatients.map((p) => (
                        <div key={p.id} onClick={() => handleSelectPatient(p)} style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{p.fullName}</span>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Ad Soyad</label>
              <input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Telefon</label>
              <PhoneInput value={form.phone} onChange={(val) => setForm({ ...form, phone: val })} />
            </div>
          </div>
        )}

        {/* ─── İŞLEM TÜRÜ (aratmalı, geçmişten türeyen) ─── */}
        <div style={{ position: 'relative' }} ref={treatmentTypeWrapperRef}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
            İşlem Türü
          </label>
          <input
            value={form.treatmentType}
            onChange={(e) => {
              setForm({ ...form, treatmentType: e.target.value });
              setIsTreatmentTypeDropdownOpen(true);
            }}
            onFocus={() => setIsTreatmentTypeDropdownOpen(true)}
            placeholder="Örn: Dudak Dolgusu (yeni bir tür de yazabilirsiniz)"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
          />
          {isTreatmentTypeDropdownOpen && filteredTreatmentTypes.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, marginTop: 4, maxHeight: 180, overflowY: 'auto', zIndex: 50 }}>
              {filteredTreatmentTypes.map((t) => (
                <div
                  key={t}
                  onClick={() => {
                    setForm((f) => ({ ...f, treatmentType: t }));
                    setIsTreatmentTypeDropdownOpen(false);
                  }}
                  style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#0f172a' }}
                >
                  {t}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Ek Not / Marka (opsiyonel)</label>
          <input value={form.productBrand} onChange={(e) => setForm({ ...form, productBrand: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Onam Formu Seçimi</label>
          <select value={form.templateFile} onChange={(e) => setForm({ ...form, templateFile: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}>
            {TEMPLATES.map((t) => (
              <option key={t.file} value={t.file}>{t.label}</option>
            ))}
          </select>
        </div>
        </div>

        {/* SAĞ SÜTUN: FİYAT */}
        <div style={{ background: T.white, border: `1px solid ${T.purple}30`, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Fiyat (₺, opsiyonel)</label>
            <input type="number" min="0" step="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Ödenen (₺, opsiyonel)</label>
            <input type="number" min="0" step="1" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} placeholder="0" style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{ marginTop: 6, background: '#4A2859', color: '#C9A45C', border: 'none', padding: 12, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? 'Oluşturuluyor...' : 'İmzaya Gönder (QR Oluştur)'}
        </button>
        </div>
      </form>

      <style jsx>{`
        @media (max-width: 800px) {
          .new-session-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}