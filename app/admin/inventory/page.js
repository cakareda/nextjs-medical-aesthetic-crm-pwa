'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Playfair_Display, Inter } from 'next/font/google';
import { T } from '@/lib/theme';
import Drawer from '@/components/Drawer';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-playfair',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

const serif = 'var(--font-playfair), Georgia, serif';
const sans = 'var(--font-inter), sans-serif';

const IconArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconLeaf = ({ size = 18, color = T.gold }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21c0-6 3-10 8-12-2 7-5 11-8 12z" />
    <path d="M12 21c0-6-3-10-8-12 2 7 5 11 8 12z" />
    <path d="M12 21V9" />
  </svg>
);

const UNIT_LABELS = {
  ML: 'ml',
  UNIT: 'Ünite',
  PIECE: 'Adet',
  UNSPECIFIED: 'Belirtilmedi',
};

// Bu birimlerde "birim başına miktar × kaç tane" mantığı anlamlı (ml şişe, ünite flakon vb.)
const PACKAGE_AWARE_UNITS = ['ML', 'UNIT'];

const emptyProduct = {
  name: '',
  category: '',
  unit: 'UNSPECIFIED',
  unitSize: '',
  packageCount: '',
  stockQuantity: '', // sadece PIECE/UNSPECIFIED için kullanılır
  minStockAlert: '0',
};

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkSeeding, setBulkSeeding] = useState(false);

  const [newProduct, setNewProduct] = useState(emptyProduct);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const [movementProduct, setMovementProduct] = useState(null);
  const [movementQuantity, setMovementQuantity] = useState('');
  const [movementPackageCount, setMovementPackageCount] = useState('');
  const [movementNote, setMovementNote] = useState('');
  const [movementSaving, setMovementSaving] = useState(false);

  const [editProduct, setEditProduct] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', category: '', unit: 'UNSPECIFIED', unitSize: '', stockQuantity: '' });
  const [editSaving, setEditSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory/products');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ürünler alınamadı');
      setProducts(data);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Ürünler alınamadı');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const categorySuggestions = useMemo(() => {
    const set = new Set(products.map((p) => (p.category || '').trim()).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  // ─────────────────────────────────────────────
  // TOPLU YÜKLEME
  // ─────────────────────────────────────────────

  const handleBulkSeed = async () => {
    if (!confirm("Ürün isim listesi bir kerelik yüklenecek (kategori/birim/stok boş gelir, sonradan tek tek düzenlenmeli). Devam edilsin mi?")) return;
    try {
      setBulkSeeding(true);
      const res = await fetch('/api/inventory/products/bulk-seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Yüklenemedi'); return; }
      alert(`${data.created.length} ürün eklendi, ${data.skipped.length} ürün zaten vardı.`);
      await fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Toplu yükleme sırasında hata oluştu');
    } finally {
      setBulkSeeding(false);
    }
  };

  // ─────────────────────────────────────────────
  // YENİ ÜRÜN
  // ─────────────────────────────────────────────

  const isNewProductPackageAware = PACKAGE_AWARE_UNITS.includes(newProduct.unit);

  const newProductComputedTotal = useMemo(() => {
    if (!isNewProductPackageAware) return null;
    const size = Number(newProduct.unitSize);
    const count = Number(newProduct.packageCount);
    if (!Number.isFinite(size) || !Number.isFinite(count) || size <= 0 || count < 0) return null;
    return size * count;
  }, [isNewProductPackageAware, newProduct.unitSize, newProduct.packageCount]);

  const handleAddProduct = async (e) => {
    e.preventDefault();

    const name = newProduct.name.trim();
    if (!name) return alert('Lütfen ürün adı girin.');

    let stockQuantity;
    let unitSize = '';

    if (isNewProductPackageAware) {
      const size = Number(newProduct.unitSize);
      const count = Number(newProduct.packageCount);

      if (newProduct.unitSize === '' || !Number.isFinite(size) || size <= 0) {
        return alert('Lütfen birim başına miktarı girin (örn: 1 ml).');
      }
      if (newProduct.packageCount === '' || !Number.isFinite(count) || count < 0) {
        return alert('Lütfen kaç adet/şişe olduğunu girin.');
      }

      unitSize = String(size);
      stockQuantity = size * count;
    } else {
      if (newProduct.stockQuantity === '') return alert('Lütfen mevcut stok miktarını girin.');
      const qty = Number(newProduct.stockQuantity);
      if (!Number.isFinite(qty) || qty < 0) return alert('Geçerli bir stok miktarı girin.');
      stockQuantity = qty;
    }

    const minStockAlert = Number(newProduct.minStockAlert);
    if (!Number.isFinite(minStockAlert) || minStockAlert < 0) return alert('Geçerli bir kritik stok sınırı girin.');

    try {
      setSaving(true);
      const res = await fetch('/api/inventory/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category: newProduct.category.trim(),
          unit: newProduct.unit,
          unitSize: unitSize || '',
          stockQuantity,
          minStockAlert,
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Ürün eklenemedi'); return; }
      setNewProduct(emptyProduct);
      setIsAddDrawerOpen(false);
      await fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Ürün eklenemedi');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────
  // ÜRÜN DÜZENLE
  // ─────────────────────────────────────────────

  const openEdit = (product) => {
    setEditProduct(product);
    setEditForm({
      name: product.name,
      category: product.category || '',
      unit: product.unit || 'UNSPECIFIED',
      unitSize: product.unitSize !== null && product.unitSize !== undefined ? String(product.unitSize) : '',
      stockQuantity: String(product.stockQuantity ?? '0'),
    });
  };

  const closeEdit = () => { if (!editSaving) setEditProduct(null); };

  const isEditPackageAware = PACKAGE_AWARE_UNITS.includes(editForm.unit);

  const editApproxPackageCount = useMemo(() => {
    if (!isEditPackageAware) return null;
    const size = Number(editForm.unitSize);
    const total = Number(editForm.stockQuantity);
    if (!Number.isFinite(size) || size <= 0 || !Number.isFinite(total)) return null;
    return total / size;
  }, [isEditPackageAware, editForm.unitSize, editForm.stockQuantity]);

  const handleSaveEdit = async () => {
    const name = editForm.name.trim();
    if (!name) return alert('Ürün adı boş olamaz.');

    if (editForm.stockQuantity === '' || editForm.stockQuantity === null) {
      return alert('Stok miktarı boş olamaz. Değiştirmek istemiyorsanız mevcut değeri koruyun.');
    }

    const stockQuantity = Number(editForm.stockQuantity);
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) return alert('Geçerli bir stok miktarı girin.');

    if (isEditPackageAware && editForm.unitSize !== '') {
      const size = Number(editForm.unitSize);
      if (!Number.isFinite(size) || size <= 0) return alert('Geçerli bir birim başına miktar girin.');
    }

    try {
      setEditSaving(true);
      const res = await fetch(`/api/inventory/products?id=${editProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category: editForm.category.trim(),
          unit: editForm.unit,
          unitSize: isEditPackageAware ? editForm.unitSize : '',
          stockQuantity,
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Güncellenemedi'); return; }
      closeEdit();
      await fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Güncellenemedi');
    } finally {
      setEditSaving(false);
    }
  };

  // ─────────────────────────────────────────────
  // STOK HAREKETİ
  // ─────────────────────────────────────────────

  const openMovement = (product) => {
    setMovementProduct(product);
    setMovementQuantity('');
    setMovementPackageCount('');
    setMovementNote('');
  };

  const closeMovement = () => {
    if (movementSaving) return;
    setMovementProduct(null);
    setMovementQuantity('');
    setMovementPackageCount('');
    setMovementNote('');
  };

  const movementHasUnitSize =
    movementProduct &&
    PACKAGE_AWARE_UNITS.includes(movementProduct.unit) &&
    movementProduct.unitSize !== null &&
    movementProduct.unitSize !== undefined &&
    Number(movementProduct.unitSize) > 0;

  const handleMovementPackageCountChange = (value) => {
    setMovementPackageCount(value);
    const count = Number(value);
    if (movementHasUnitSize && Number.isFinite(count) && count >= 0) {
      const total = Number(movementProduct.unitSize) * count;
      setMovementQuantity(String(total));
    }
  };

  const handleInventoryMovement = async (type) => {
    if (!movementProduct) return;
    const quantity = Number(movementQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return alert('0’dan büyük geçerli bir miktar girin.');
    if (type === 'OUT' && quantity > Number(movementProduct.stockQuantity)) {
      return alert(`Yetersiz stok. Mevcut stok: ${movementProduct.stockQuantity} ${UNIT_LABELS[movementProduct.unit]}`);
    }
    try {
      setMovementSaving(true);
      const res = await fetch('/api/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: movementProduct.id, type, quantity, note: movementNote.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Stok hareketi oluşturulamadı'); return; }
      closeMovement();
      await fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Stok hareketi oluşturulamadı');
    } finally {
      setMovementSaving(false);
    }
  };

  // ─────────────────────────────────────────────
  // ÜRÜNÜ PASİFLEŞTİR
  // ─────────────────────────────────────────────

  const handleDeleteProduct = async (id, productName) => {
    if (!confirm(`"${productName}" ürününü pasifleştirmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/inventory/products?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Ürün pasifleştirilemedi'); return; }
      await fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Ürün pasifleştirilemedi');
    }
  };

  return (
    <div className={`${playfair.variable} ${inter.variable}`} style={{ fontFamily: sans }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>

        {/* ÜST BAR (koyu mürdüm) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 24, background: T.bg, borderRadius: 16, padding: '20px 26px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <IconLeaf size={16} />
              <span style={{ color: T.gold, fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Novantis
              </span>
            </div>
            <h1 style={{ margin: 0, fontFamily: serif, fontSize: 30, fontWeight: 600, color: T.white, letterSpacing: '0.01em' }}>
              Stok &amp; Envanter
            </h1>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={handleBulkSeed} disabled={bulkSeeding} style={btnStyle('#789681', '#fff', bulkSeeding)}>
              {bulkSeeding ? 'Yükleniyor...' : 'Ürün İsim Listesini Yükle'}
            </button>
            <button type="button" onClick={() => setIsAddDrawerOpen(true)} style={btnStyle(T.gold, T.bg)}>
              + Yeni Ürün Ekle
            </button>
            <Link href="/admin" style={{ ...btnStyle(T.purpleDark, T.gold), textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconArrowLeft /> Anasayfa
            </Link>
          </div>
        </div>

        {/* ARAMA */}
        <div style={{ marginBottom: 14, position: 'relative', maxWidth: 360 }}>
          <input
            type="text"
            placeholder="Ürün adı ara..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 14 }}
          />
        </div>

        {/* ÜRÜN TABLOSU */}
        <div style={{ background: T.white, border: '1px solid rgba(90,58,112,0.16)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: T.cream, borderBottom: '1px solid rgba(90,58,112,0.16)' }}>
                <th style={thStyle}>Ürün Adı</th>
                <th style={thStyle}>Kategori</th>
                <th style={thStyle}>Birim</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Stok Adedi</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Stok Hareketi</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Eylemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: T.purple, fontWeight: 600 }}>Yükleniyor...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: T.purple }}>
                  {productSearch ? 'Aramanıza uygun ürün bulunamadı.' : 'Kayıtlı ürün bulunmuyor.'}
                </td></tr>
              ) : (
                filteredProducts.map((prod) => {
                  const stock = Number(prod.stockQuantity);
                  const minStock = Number(prod.minStockAlert);
                  const isCritical = stock <= minStock;
                  const hasCategory = Boolean(prod.category && prod.category.trim());
                  const hasUnit = prod.unit !== 'UNSPECIFIED';
                  const unitLabel = UNIT_LABELS[prod.unit] || prod.unit;
                  const hasUnitSize = PACKAGE_AWARE_UNITS.includes(prod.unit) && prod.unitSize !== null && prod.unitSize !== undefined && Number(prod.unitSize) > 0;
                  const approxCount = hasUnitSize ? (stock / Number(prod.unitSize)) : null;

                  return (
                    <tr key={prod.id} style={{ borderBottom: '1px solid rgba(90,58,112,0.10)' }}>
                      <td style={tdStyle}>
                        <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 600, color: T.bg }}>{prod.name}</div>
                        {hasUnitSize && (
                          <div style={{ fontSize: 11, color: T.purple, marginTop: 4 }}>
                            Şişe: {prod.unitSize} {unitLabel} · ≈ {approxCount.toFixed(1)} adet/şişe
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <span style={hasCategory ? chipStyle : chipMutedStyle}>{hasCategory ? prod.category : '—'}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={hasUnit ? chipStyle : chipMutedStyle}>{hasUnit ? unitLabel : '—'}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <span style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, color: isCritical ? T.errorText : T.success }}>
                          {prod.stockQuantity}
                        </span>
                        <span style={{ fontSize: 11, color: T.purple, marginLeft: 4 }}>{unitLabel}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button type="button" onClick={() => openMovement(prod)} style={ghostBtnStyle(T.success)}>+ Ekle</button>
                          <button type="button" onClick={() => openMovement(prod)} style={ghostBtnStyle(T.purpleDark)}>− Azalt</button>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <IconBtn onClick={() => openEdit(prod)} title="Düzenle" bg="#EFE3F3" color={T.purpleDark}><IconEdit /></IconBtn>
                          <IconBtn onClick={() => handleDeleteProduct(prod.id, prod.name)} title="Pasifleştir" bg={T.error} color={T.errorText}><IconTrash /></IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={isAddDrawerOpen} onClose={() => setIsAddDrawerOpen(false)} title="Yeni Ürün Ekle">
        <form onSubmit={handleAddProduct}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Ürün Adı">
              <input placeholder="Örn: Elasty D plus" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} style={inputStyle} />
            </Field>

            <Field label="Kategori (istediğinizi yazın)">
              <input list="category-suggestions" placeholder="Örn: Dolgu, Botoks, Mezoterapi..." value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} style={inputStyle} />
              <datalist id="category-suggestions">
                {categorySuggestions.map((c) => <option key={c} value={c} />)}
              </datalist>
            </Field>

            <Field label="Birim">
              <select
                value={newProduct.unit}
                onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value, unitSize: '', packageCount: '', stockQuantity: '' })}
                style={inputStyle}
              >
                <option value="UNSPECIFIED">Seçiniz</option>
                <option value="ML">ml</option>
                <option value="UNIT">Ünite</option>
                <option value="PIECE">Adet</option>
              </select>
            </Field>

            {isNewProductPackageAware ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label={newProduct.unit === 'ML' ? 'Şişe Başına Kaç ml' : 'Flakon Başına Kaç Ünite'}>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      placeholder={newProduct.unit === 'ML' ? 'Örn: 1' : 'Örn: 100'}
                      value={newProduct.unitSize}
                      onChange={(e) => setNewProduct({ ...newProduct, unitSize: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Kaç Adet / Şişe Var">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Örn: 5"
                      value={newProduct.packageCount}
                      onChange={(e) => setNewProduct({ ...newProduct, packageCount: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>
                </div>
                {newProductComputedTotal !== null && (
                  <div style={{ fontSize: 12, color: T.purple, fontWeight: 600 }}>
                    Toplam stok: {newProductComputedTotal} {UNIT_LABELS[newProduct.unit]}
                  </div>
                )}
              </>
            ) : (
              <Field label="Başlangıç Stoku">
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="Örn: 10 veya 2.5"
                  value={newProduct.stockQuantity}
                  onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: e.target.value })}
                  style={inputStyle}
                />
              </Field>
            )}

            <Field label="Kritik Stok Uyarısı (toplam üzerinden)">
              <input type="number" min="0" step="0.001" placeholder="Örn: 2" value={newProduct.minStockAlert} onChange={(e) => setNewProduct({ ...newProduct, minStockAlert: e.target.value })} style={inputStyle} />
            </Field>

            <button type="submit" disabled={saving} style={{ ...btnStyle(T.purpleDark, T.gold, saving), marginTop: 4, padding: '13px', fontSize: 14 }}>
              {saving ? 'Kaydediliyor...' : 'Ürünü Kaydet'}
            </button>
          </div>
        </form>
      </Drawer>

      {/* DÜZENLEME MODALI */}
      {editProduct && (
        <ModalShell onClose={closeEdit}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <IconLeaf size={15} color={T.purpleDark} />
            <h3 style={{ margin: 0, fontFamily: serif, fontSize: 20, fontWeight: 600, color: T.bg }}>Ürünü Düzenle</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Ürün Adı">
              <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} />
            </Field>

            <Field label="Kategori">
              <input list="category-suggestions" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} placeholder="Örn: Dolgu, Botoks, Mezoterapi..." style={inputStyle} />
            </Field>

            <Field label="Birim">
              <select value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} style={inputStyle}>
                <option value="UNSPECIFIED">Seçiniz</option>
                <option value="ML">ml</option>
                <option value="UNIT">Ünite</option>
                <option value="PIECE">Adet</option>
              </select>
            </Field>

            {isEditPackageAware && (
              <Field label={editForm.unit === 'ML' ? 'Şişe Başına Kaç ml' : 'Flakon Başına Kaç Ünite'}>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder={editForm.unit === 'ML' ? 'Örn: 1' : 'Örn: 100'}
                  value={editForm.unitSize}
                  onChange={(e) => setEditForm({ ...editForm, unitSize: e.target.value })}
                  style={inputStyle}
                />
              </Field>
            )}

            <Field label="Mevcut Stok Miktarı (toplam)">
              <input type="number" min="0" step="0.001" value={editForm.stockQuantity} onChange={(e) => setEditForm({ ...editForm, stockQuantity: e.target.value })} style={inputStyle} />
            </Field>

            <p style={{ margin: '2px 0 4px', fontSize: 11.5, color: T.purple, lineHeight: 1.5 }}>
              {isEditPackageAware && editApproxPackageCount !== null
                ? `Bu toplam ≈ ${editApproxPackageCount.toFixed(1)} adet/şişeye karşılık geliyor.`
                : `Bu ürünün şu an elinizde gerçekte kaç ${UNIT_LABELS[editForm.unit] === 'Belirtilmedi' ? 'birim' : UNIT_LABELS[editForm.unit].toLowerCase()} olduğunu buraya yazın.`}
            </p>

            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button type="button" onClick={handleSaveEdit} disabled={editSaving} style={{ ...btnStyle(T.purpleDark, T.gold, editSaving), flex: 1 }}>
                {editSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button type="button" onClick={closeEdit} disabled={editSaving} style={{ background: 'transparent', border: `1px solid ${T.purple}55`, color: T.bg, borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600 }}>
                Vazgeç
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* STOK HAREKETİ MODALI */}
      {movementProduct && (
        <ModalShell onClose={closeMovement}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <IconLeaf size={15} color={T.purpleDark} />
            <h3 style={{ margin: 0, fontFamily: serif, fontSize: 20, fontWeight: 600, color: T.bg }}>Stok Hareketi</h3>
          </div>
          <p style={{ margin: '0 0 18px', color: T.purple, fontSize: 13, lineHeight: 1.5 }}>
            <b style={{ fontFamily: serif, fontSize: 15, color: T.bg }}>{movementProduct.name}</b>
            <br />
            Mevcut stok: <b>{movementProduct.stockQuantity} {UNIT_LABELS[movementProduct.unit]}</b>
            {movementHasUnitSize && (
              <>
                <br />
                Şişe boyutu: {movementProduct.unitSize} {UNIT_LABELS[movementProduct.unit]}
              </>
            )}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {movementHasUnitSize && (
              <Field label="Kaç Adet / Şişe (opsiyonel — miktarı otomatik hesaplar)">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={movementPackageCount}
                  onChange={(e) => handleMovementPackageCountChange(e.target.value)}
                  style={inputStyle}
                  placeholder="Örn: 3"
                />
              </Field>
            )}

            <Field label={`Miktar (${UNIT_LABELS[movementProduct.unit]})`}>
              <input type="number" min="0.001" step="0.001" value={movementQuantity} onChange={(e) => setMovementQuantity(e.target.value)} style={inputStyle} placeholder="Örn: 2.5" />
            </Field>
            <Field label="Not">
              <textarea value={movementNote} onChange={(e) => setMovementNote(e.target.value)} placeholder="Örn: Yeni stok girişi" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" onClick={() => handleInventoryMovement('IN')} disabled={movementSaving} style={{ ...btnStyle(T.success, '#fff', movementSaving), flex: 1 }}>+ Stok Girişi</button>
              <button type="button" onClick={() => handleInventoryMovement('OUT')} disabled={movementSaving} style={{ ...btnStyle(T.purpleDark, T.gold, movementSaving), flex: 1 }}>− Stok Çıkışı</button>
            </div>
            <button type="button" onClick={closeMovement} disabled={movementSaving} style={{ background: 'transparent', border: `1px solid ${T.purple}55`, color: T.bg, borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 600 }}>
              Vazgeç
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 11.5, fontWeight: 700, color: T.purple, display: 'block', marginBottom: 5, letterSpacing: '0.01em' }}>{label}</label>
      {children}
    </div>
  );
}

function IconBtn({ onClick, title, bg, color, children }) {
  return (
    <button type="button" onClick={onClick} title={title} style={{ width: 34, height: 34, background: bg, border: 'none', color, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </button>
  );
}

function ModalShell({ onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(36,21,47,0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 430, background: T.cream, borderRadius: 18, padding: 26, boxShadow: '0 20px 60px rgba(36,21,47,0.35)' }}>
        {children}
      </div>
    </div>
  );
}

const thStyle = {
  padding: '14px 18px',
  fontSize: 11.5,
  fontWeight: 700,
  color: T.purple,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const tdStyle = {
  padding: '14px 18px',
  verticalAlign: 'middle',
  color: T.bg,
};

function ghostBtnStyle(color) {
  return {
    background: 'transparent',
    border: `1px solid ${color}`,
    color,
    borderRadius: 7,
    padding: '6px 11px',
    fontWeight: 700,
    fontSize: 11.5,
    cursor: 'pointer',
  };
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 9,
  border: '1px solid rgba(90,58,112,0.28)',
  fontSize: 13.5,
  boxSizing: 'border-box',
  background: T.white,
  color: T.bg,
  fontFamily: sans,
  outline: 'none',
};

const chipStyle = {
  fontSize: 11,
  padding: '3px 10px',
  borderRadius: 20,
  background: '#EFE3F3',
  fontWeight: 700,
  color: T.purpleDark,
};

const chipMutedStyle = {
  ...chipStyle,
  background: 'transparent',
  border: '1px dashed rgba(90,58,112,0.4)',
  color: T.purple,
  fontWeight: 600,
};

function btnStyle(bg, color, disabled) {
  return {
    background: bg,
    color,
    border: 'none',
    padding: '9px 16px',
    borderRadius: 9,
    fontWeight: 700,
    fontSize: 12.5,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    fontFamily: sans,
  };
}