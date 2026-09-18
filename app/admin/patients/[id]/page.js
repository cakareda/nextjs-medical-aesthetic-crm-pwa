'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { T } from '@/lib/theme';
import { UNIT_LABELS, getQuantityOptions } from '@/lib/quantity-options';

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function calculateAge(birthDateStr) {
  if (!birthDateStr) return null;
  const birthDate = new Date(birthDateStr);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [patient, setPatient] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [editingPatient, setEditingPatient] = useState(false);
  const [patientForm, setPatientForm] = useState({ fullName: '', phone: '', birthDate: '', gender: '', allergies: '', notes: '' });

  const [showAddTreatment, setShowAddTreatment] = useState(false);
  const [treatmentForm, setTreatmentForm] = useState({
    treatmentType: '', applicationArea: '', price: '', paidAmount: '', notes: '',
  });
  const [productUsages, setProductUsages] = useState([]); // {productId, name, unit, quantity}
  const [pendingProduct, setPendingProduct] = useState(null);
  const [pendingQuantity, setPendingQuantity] = useState('1');
  const [productSearch, setProductSearch] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productSearchRef = useRef(null);
  const [savingTreatment, setSavingTreatment] = useState(false);

  const [showAddAppointment, setShowAddAppointment] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({ title: 'Rötuş / Kontrol Randevusu', date: '', type: 'TOUCH_UP', notes: '' });

  const [uploadingKey, setUploadingKey] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [patRes, prodRes] = await Promise.all([
        fetch(`/api/patients/${id}`, { cache: 'no-store' }),
        fetch('/api/inventory/products', { cache: 'no-store' }),
      ]);

      const patData = await patRes.json();
      if (!patRes.ok) throw new Error(patData.error || 'Hasta bilgileri alınamadı.');
      setPatient(patData);
      setPatientForm({
        fullName: patData.fullName || '',
        phone: patData.phone || '',
        birthDate: patData.birthDate ? patData.birthDate.split('T')[0] : '',
        gender: patData.gender || '',
        allergies: patData.allergies || '',
        notes: patData.notes || '',
      });

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(Array.isArray(prodData) ? prodData : []);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (productSearchRef.current && !productSearchRef.current.contains(e.target)) {
        setIsProductDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSavePatient = async () => {
    try {
      const res = await fetch(`/api/patients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientForm),
      });
      const data = await res.json();
      if (!res.ok) return alert('Hata: ' + (data.error || 'Güncellenemedi'));
      setEditingPatient(false);
      fetchAll();
    } catch (err) {
      alert('Güncellenirken hata oluştu: ' + err.message);
    }
  };

  const handleArchivePatient = async () => {
    if (!confirm('Bu hastayı arşivlemek istediğinize emin misiniz? Geçmiş kayıtlar silinmez, sadece listeden gizlenir.')) return;
    try {
      const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Arşivlenemedi');
      router.push('/admin/patients');
    } catch (err) {
      alert('Arşivlenemedi: ' + err.message);
    }
  };

  const resetTreatmentForm = () => {
    setTreatmentForm({ treatmentType: '', applicationArea: '', price: '', paidAmount: '', notes: '' });
    setProductUsages([]);
    setPendingProduct(null);
    setPendingQuantity('1');
    setProductSearch('');
  };

  const handleSelectProduct = (p) => {
    setPendingProduct(p);
    setProductSearch(p.name);
    setIsProductDropdownOpen(false);
    setPendingQuantity(getQuantityOptions(p.unit)[0]);
  };

  const handleAddProductUsage = () => {
    if (!pendingProduct) {
      alert('Lütfen önce bir ürün seçin.');
      return;
    }
    const qty = Number(pendingQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      alert('Geçerli bir miktar girin.');
      return;
    }

    setProductUsages((prev) => [
      ...prev,
      { productId: pendingProduct.id, name: pendingProduct.name, unit: pendingProduct.unit, quantity: qty },
    ]);

    setPendingProduct(null);
    setProductSearch('');
    setPendingQuantity('1');
  };

  const handleRemoveProductUsage = (index) => {
    setProductUsages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateTreatment = async () => {
    if (!treatmentForm.treatmentType.trim()) return alert('Lütfen tedavi türünü girin.');

    setSavingTreatment(true);
    try {
      const res = await fetch('/api/treatments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: id,
          treatmentType: treatmentForm.treatmentType.trim(),
          applicationArea: treatmentForm.applicationArea,
          notes: treatmentForm.notes,
          price: treatmentForm.price,
          paidAmount: treatmentForm.paidAmount,
          productUsages: productUsages.map((u) => ({ productId: u.productId, quantity: u.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) return alert('Hata: ' + (data.error || 'Tedavi eklenemedi'));

      setShowAddTreatment(false);
      resetTreatmentForm();
      fetchAll();
    } catch (err) {
      alert('Tedavi eklenemedi: ' + err.message);
    } finally {
      setSavingTreatment(false);
    }
  };

  const handleDeleteTreatment = async (treatmentId) => {
    if (!confirm('Bu tedaviyi silmek istediğinize emin misiniz? Kullanılan stok otomatik iade edilecek.')) return;
    try {
      const res = await fetch(`/api/treatments/${treatmentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Silinemedi');
      fetchAll();
    } catch (err) {
      alert('Silinemedi: ' + err.message);
    }
  };

  const handleUpdateTouchUpStatus = async (treatmentId, touchUpStatus) => {
    try {
      const res = await fetch(`/api/treatments/${treatmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ touchUpStatus }),
      });
      if (res.ok) fetchAll();
    } catch (err) {
      alert('Güncellenemedi: ' + err.message);
    }
  };

  const handlePhotoUpload = async (treatmentId, file, type) => {
    if (!file) return;
    const key = `${treatmentId}-${type}`;
    setUploadingKey(key);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);

      const patchRes = await fetch(`/api/treatments/${treatmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [type === 'before' ? 'beforePhotoUrl' : 'afterPhotoUrl']: uploadData.url }),
      });
      if (patchRes.ok) fetchAll();
    } catch (err) {
      alert('Fotoğraf yüklenemedi: ' + err.message);
    } finally {
      setUploadingKey(null);
    }
  };

  const [uploadingDocument, setUploadingDocument] = useState(false);

  const handleDocumentUpload = async (file) => {
    if (!file) return;
    setUploadingDocument(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);

      const docRes = await fetch(`/api/patients/${id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: uploadData.url, label: file.name }),
      });
      const docData = await docRes.json();
      if (!docRes.ok) throw new Error(docData.error);
      fetchAll();
    } catch (err) {
      alert('Belge yüklenemedi: ' + err.message);
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Bu belgeyi silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/patients/${id}/documents/${docId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Belge silinemedi');
      fetchAll();
    } catch (err) {
      alert('Belge silinemedi: ' + err.message);
    }
  };

  const handleCreateAppointment = async () => {
    if (!appointmentForm.date) return alert('Lütfen tarih ve saat seçin.');
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...appointmentForm, patientId: id }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Randevu eklenemedi');
      setShowAddAppointment(false);
      setAppointmentForm({ title: 'Rötuş / Kontrol Randevusu', date: '', type: 'TOUCH_UP', notes: '' });
      fetchAll();
    } catch (err) {
      alert('Randevu eklenemedi: ' + err.message);
    }
  };

  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()));

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', color: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        Hasta verileri yükleniyor...
      </div>
    );
  }

  if (errorMsg || !patient) {
    return (
      <div style={{ minHeight: '60vh', color: T.errorText, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', gap: 12 }}>
        <div>{errorMsg || 'Hasta bulunamadı.'}</div>
        <Link href="/admin/patients" style={{ color: T.purpleDark }}>Hasta listesine dön</Link>
      </div>
    );
  }

  const calculatedAge = calculateAge(patient.birthDate);
  const totalPrice = patient.treatments?.reduce((sum, t) => sum + (t.price || 0), 0) || 0;
  const totalPaid = patient.treatments?.reduce((sum, t) => sum + (t.paidAmount || 0), 0) || 0;
  const totalDebt = totalPrice - totalPaid;
  const pendingTouchUps = patient.treatments?.filter((t) => t.touchUpStatus === 'PENDING') || [];

  return (
    <main style={{ color: T.bg, fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>

        {/* ÜST NAV */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <Link href="/admin/patients" style={{ color: T.purpleDark, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>
            ← Hasta Listesine Dön
          </Link>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href={`/api/patients/${id}/pdf-summary`}
              target="_blank"
              rel="noreferrer"
              style={{ ...btnStyle('#F0E7F2', T.purpleDark), textDecoration: 'none' }}
            >
              PDF Özet
            </a>
            <button onClick={() => setShowAddAppointment(!showAddAppointment)} style={btnStyle(T.purpleDark, T.gold)}>
              Randevu Oluştur
            </button>
            <button onClick={handleArchivePatient} style={btnStyle(T.error, '#5A2030')}>
              Arşivle
            </button>
          </div>
        </div>

        {/* RANDEVU FORMU */}
        {showAddAppointment && (
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 700, color: T.purpleDark }}>Yeni Randevu</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Randevu Tanımı</label>
                <input value={appointmentForm.title} onChange={(e) => setAppointmentForm({ ...appointmentForm, title: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tarih & Saat</label>
                <input type="datetime-local" value={appointmentForm.date} onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Randevu Tipi</label>
                <select value={appointmentForm.type} onChange={(e) => setAppointmentForm({ ...appointmentForm, type: e.target.value })} style={inputStyle}>
                  <option value="TOUCH_UP">Rötuş / Kontrol</option>
                  <option value="ROUTINE">Rutin Seans</option>
                  <option value="INITIAL">İlk Muayene</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowAddAppointment(false)} style={btnStyle('#F0E7F2', T.purpleDark)}>İptal</button>
              <button onClick={handleCreateAppointment} style={btnStyle(T.purpleDark, T.gold)}>Randevuyu Kaydet</button>
            </div>
          </div>
        )}

        {/* RÖTUŞ UYARISI */}
        {pendingTouchUps.length > 0 && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', padding: '14px 18px', borderRadius: 10, marginBottom: 24, color: '#92400E', fontSize: 13, fontWeight: 700 }}>
            Kontrol / Rötuş Zamanı Geldi: {pendingTouchUps.map((t) => t.treatmentType).join(', ')}
          </div>
        )}

        {/* HASTA KARTI */}
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.bg }}>{patient.fullName}</h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 8, color: T.purple, fontSize: 13, fontWeight: 600 }}>
                <span>{patient.phone || 'Telefon yok'}</span>
                {patient.birthDate && <span>Doğum: {new Date(patient.birthDate).toLocaleDateString('tr-TR')}</span>}
                {calculatedAge !== null && <span>Yaş: {calculatedAge}</span>}
                {patient.gender && <span>Cinsiyet: {patient.gender}</span>}
              </div>
            </div>
            <button onClick={() => setEditingPatient(!editingPatient)} style={btnStyle('#F0E7F2', T.purpleDark)}>
              {editingPatient ? 'Kapat' : 'Düzenle'}
            </button>
          </div>

          {editingPatient && (
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid #E2D5E5', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Ad Soyad</label>
                <input value={patientForm.fullName} onChange={(e) => setPatientForm({ ...patientForm, fullName: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Telefon</label>
                <input value={patientForm.phone} onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Doğum Tarihi</label>
                <input type="date" value={patientForm.birthDate} onChange={(e) => setPatientForm({ ...patientForm, birthDate: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Cinsiyet</label>
                <select value={patientForm.gender} onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })} style={inputStyle}>
                  <option value="">Seçiniz</option>
                  <option value="Kadın">Kadın</option>
                  <option value="Erkek">Erkek</option>
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Alerjiler / Hassasiyet</label>
                <input value={patientForm.allergies} onChange={(e) => setPatientForm({ ...patientForm, allergies: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleSavePatient} style={btnStyle(T.success, '#fff')}>Güncelle ve Kaydet</button>
              </div>
            </div>
          )}

          {patient.allergies && !editingPatient && (
            <div style={{ marginTop: 16, display: 'inline-block', background: T.error, color: '#5A2030', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
              Alerji / Hassasiyet: {patient.allergies}
            </div>
          )}
        </div>

        {/* ONAM / KONSÜLTASYON BELGELERİ */}
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.purpleDark }}>
              Onam / Konsültasyon Belgeleri
            </h3>
            <label style={{ ...btnStyle(T.purpleDark, T.gold), cursor: uploadingDocument ? 'not-allowed' : 'pointer', opacity: uploadingDocument ? 0.7 : 1 }}>
              {uploadingDocument ? 'Yükleniyor...' : '+ Belge Yükle (Fotoğraf / PDF)'}
              <input
                type="file"
                accept="image/*,application/pdf"
                style={{ display: 'none' }}
                disabled={uploadingDocument}
                onChange={(e) => { handleDocumentUpload(e.target.files[0]); e.target.value = ''; }}
              />
            </label>
          </div>

          {(!patient.documents || patient.documents.length === 0) ? (
            <p style={{ margin: 0, fontSize: 13, color: T.purple }}>
              Henüz belge eklenmedi. Kağıt üzerinde imzalanmış eski onam formlarının
              taranmış halini veya fotoğrafını buraya ekleyebilirsiniz.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {patient.documents.map((doc) => {
                const isPdf = doc.url.toLowerCase().endsWith('.pdf');
                return (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '8px 10px' }}>
                    <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#0369A1', textDecoration: 'none' }}>
                      {isPdf ? '📄' : '🖼️'} {doc.label || 'Belge'}
                    </a>
                    <button onClick={() => handleDeleteDocument(doc.id)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      Sil
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FİNANS KARTLARI */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 28 }}>
          <div style={{ ...cardStyle, background: '#EFF6FF' }}>
            <div style={{ fontSize: 12, color: '#1E40AF', fontWeight: 700 }}>TOPLAM İŞLEM HACMİ</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1E3A8A', marginTop: 4 }}>₺{totalPrice.toLocaleString('tr-TR')}</div>
          </div>
          <div style={{ ...cardStyle, background: '#E9F0EB' }}>
            <div style={{ fontSize: 12, color: '#365A45', fontWeight: 700 }}>ÖDENEN</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.success, marginTop: 4 }}>₺{totalPaid.toLocaleString('tr-TR')}</div>
          </div>
          <div style={{ ...cardStyle, background: totalDebt > 0 ? T.error : '#F0F0F0' }}>
            <div style={{ fontSize: 12, color: '#5A2030', fontWeight: 700 }}>KALAN BAKİYE</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: totalDebt > 0 ? '#8B4A5A' : T.bg, marginTop: 4 }}>₺{totalDebt.toLocaleString('tr-TR')}</div>
          </div>
        </div>

        {/* TEDAVİ EKLEME */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>İşlem Geçmişi ({patient.treatments?.length || 0})</h2>
          <button onClick={() => setShowAddTreatment(!showAddTreatment)} style={btnStyle(T.gold, T.bg)}>
            + Yeni İşlem Ekle
          </button>
        </div>

        {showAddTreatment && (
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700, color: T.purpleDark }}>İşlem Kaydı & Stok Düşümü</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>İşlem Türü</label>
                <input placeholder="Örn: Dudak Dolgusu" value={treatmentForm.treatmentType} onChange={(e) => setTreatmentForm({ ...treatmentForm, treatmentType: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Uygulama Bölgesi</label>
                <input placeholder="Örn: Dudak" value={treatmentForm.applicationArea} onChange={(e) => setTreatmentForm({ ...treatmentForm, applicationArea: e.target.value })} style={inputStyle} />
              </div>
            </div>

            {/* ÜRÜN SEÇİMİ (birden fazla ürün eklenebilir) */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Kullanılan Ürün(ler) — opsiyonel</label>

              {productUsages.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, marginBottom: 10 }}>
                  {productUsages.map((u, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 6, padding: '6px 10px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>
                        {u.name} — {u.quantity} {UNIT_LABELS[u.unit] || u.unit}
                      </span>
                      <button type="button" onClick={() => handleRemoveProductUsage(idx)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        Kaldır
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ position: 'relative', display: 'flex', gap: 8, flexWrap: 'wrap' }} ref={productSearchRef}>
                <div style={{ position: 'relative', flex: '1 1 200px' }}>
                  <input
                    type="text"
                    placeholder="Ürün ara..."
                    value={productSearch}
                    onChange={(e) => { setProductSearch(e.target.value); setPendingProduct(null); setIsProductDropdownOpen(true); }}
                    onFocus={() => setIsProductDropdownOpen(true)}
                    style={inputStyle}
                  />
                  {isProductDropdownOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: T.white, border: '1px solid #cbd5e1', borderRadius: 6, marginTop: 4, maxHeight: 200, overflowY: 'auto', zIndex: 50 }}>
                      {filteredProducts.length === 0 ? (
                        <div style={{ padding: 10, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>Ürün bulunamadı</div>
                      ) : (
                        filteredProducts.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => handleSelectProduct(p)}
                            style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}
                          >
                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                            <span style={{ fontSize: 11, color: '#64748b' }}>{Number(p.stockQuantity).toFixed(2)} {UNIT_LABELS[p.unit]}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {pendingProduct && (
                  <select value={pendingQuantity} onChange={(e) => setPendingQuantity(e.target.value)} style={{ ...inputStyle, width: 'auto', border: '1px solid #0284C7' }}>
                    {getQuantityOptions(pendingProduct.unit).map((q) => (
                      <option key={q} value={q}>{q} {UNIT_LABELS[pendingProduct.unit]}</option>
                    ))}
                  </select>
                )}

                <button type="button" onClick={handleAddProductUsage} style={btnStyle(T.purpleDark, T.gold)}>
                  Ekle
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Ücret (₺)</label>
                <input type="number" placeholder="0" value={treatmentForm.price} onChange={(e) => setTreatmentForm({ ...treatmentForm, price: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Ödenen (₺)</label>
                <input type="number" placeholder="0" value={treatmentForm.paidAmount} onChange={(e) => setTreatmentForm({ ...treatmentForm, paidAmount: e.target.value })} style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Not</label>
              <input value={treatmentForm.notes} onChange={(e) => setTreatmentForm({ ...treatmentForm, notes: e.target.value })} style={inputStyle} />
            </div>

            <button onClick={handleCreateTreatment} disabled={savingTreatment} style={btnStyle(T.purpleDark, T.gold)}>
              {savingTreatment ? 'Kaydediliyor...' : 'İşlemi Kaydet'}
            </button>
          </div>
        )}

        {/* İŞLEM LİSTESİ */}
        {(!patient.treatments || patient.treatments.length === 0) ? (
          <div style={{ ...cardStyle, textAlign: 'center', color: T.purple }}>Kayıtlı işlem bulunmuyor.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {patient.treatments.map((t) => {
              const signedSession = t.signSessions?.find((s) => s.signedPdfUrl);
              return (
                <div key={t.id} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 16, fontWeight: 800, color: T.purpleDark }}>{t.treatmentType}</span>
                      {t.applicationArea && (
                        <span style={{ marginLeft: 8, fontSize: 12, color: T.purple }}>({t.applicationArea})</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, color: T.purple, fontWeight: 700 }}>{formatDateTime(t.performedAt)}</span>
                      <button onClick={() => handleDeleteTreatment(t.id)} style={{ background: T.error, border: 'none', color: '#5A2030', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>
                        Sil
                      </button>
                    </div>
                  </div>

                  {t.productUsages && t.productUsages.length > 0 && (
                    <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {t.productUsages.map((u) => (
                        <span key={u.id} style={{ background: '#F0E7F2', color: T.purpleDark, padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                          {u.product?.name} — {Number(u.quantity).toFixed(2)} {UNIT_LABELS[u.product?.unit]}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: 13, color: T.bg, display: 'flex', gap: 18, marginBottom: 16, fontWeight: 600 }}>
                    <span>Toplam Ücret: <b>₺{t.price || 0}</b></span>
                    <span>Ödenen: <b style={{ color: T.success }}>₺{t.paidAmount || 0}</b></span>
                  </div>

                  <div style={{ background: '#F8F5F6', border: '1px solid #E2D5E5', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: T.bg, marginBottom: 12 }}>Görsel Karşılaştırma (Before / After)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {['before', 'after'].map((type) => {
                        const url = type === 'before' ? t.beforePhotoUrl : t.afterPhotoUrl;
                        const key = `${t.id}-${type}`;
                        return (
                          <div key={type} style={{ background: T.white, border: '1px solid #CBD5E1', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: type === 'before' ? '#0284C7' : T.success, display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
                              {type === 'before' ? 'ÖNCESİ' : 'SONRASI'}
                            </span>
                            {url ? (
                              <img src={url} alt={type} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} />
                            ) : (
                              <div style={{ height: 120, background: '#F1F5F9', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 12, marginBottom: 8 }}>
                                Fotoğraf Yok
                              </div>
                            )}
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: type === 'before' ? '#0284C7' : T.success, color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                              {uploadingKey === key ? 'Yükleniyor...' : 'Fotoğraf Seç'}
                              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handlePhotoUpload(t.id, e.target.files[0], type)} />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #EEE5F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.purple }}>Rötuş Durumu:</span>
                      <select value={t.touchUpStatus || 'NONE'} onChange={(e) => handleUpdateTouchUpStatus(t.id, e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, fontWeight: 700 }}>
                        <option value="NONE">Planlanmadı</option>
                        <option value="PENDING">Kontrol Bekleniyor</option>
                        <option value="COMPLETED">Tamamlandı</option>
                        <option value="CANCELED">İptal</option>
                      </select>
                    </div>
                    {signedSession && (
                      <a href={signedSession.signedPdfUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E9F0EB', color: T.success, border: '1px solid #A7C4AF', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                        Dijital Onam Formu (PDF)
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

const cardStyle = {
  background: T.cream,
  border: `1px solid ${T.purple}`,
  borderRadius: 14,
  padding: 22,
  color: T.bg,
};

const inputStyle = {
  width: '100%',
  padding: '9px',
  borderRadius: 6,
  border: `1px solid ${T.purple}`,
  marginTop: 3,
  fontSize: 13,
  boxSizing: 'border-box',
  background: T.white,
  color: T.bg,
};

const labelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: T.bg,
  display: 'block',
  marginBottom: 3,
};

function btnStyle(bg, color) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: bg,
    color,
    border: 'none',
    padding: '9px 16px',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
  };
}