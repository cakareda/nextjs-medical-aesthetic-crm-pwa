// Google Takvim'in kendi renk kimlikleri (colorId) ile eşleşir, böylece
// ileride Google Calendar entegrasyonu eklendiğinde aynı renkler karşılıklı
// senkronize edilebilir. Nurlana'nın tanımladığı anlamlar:
//   lavanta (Lavender)    -> ilk randevu
//   sarı (Banana)         -> kontrol / rötuş randevusu
//   flamingo              -> hasta geldi
//   domates (Tomato)      -> hasta haber vermeden gelmedi
export const APPOINTMENT_COLORS = {
  LAVENDER: { id: '1', hex: '#7986CB', label: 'Lavanta (İlk Randevu)' },
  BANANA: { id: '5', hex: '#F6BF26', label: 'Sarı (Kontrol)' },
  FLAMINGO: { id: '4', hex: '#E67C73', label: 'Flamingo (Geldi)' },
  TOMATO: { id: '11', hex: '#D50000', label: 'Domates (Haber Vermeden Gelmedi)' },
};

export function getColorIdForType(type) {
  return type === 'INITIAL' ? APPOINTMENT_COLORS.LAVENDER.id : APPOINTMENT_COLORS.BANANA.id;
}

export function getColorIdForStatus(status) {
  if (status === 'ATTENDED') return APPOINTMENT_COLORS.FLAMINGO.id;
  if (status === 'NO_SHOW') return APPOINTMENT_COLORS.TOMATO.id;
  return null;
}

export function getColorHex(colorId) {
  const match = Object.values(APPOINTMENT_COLORS).find((c) => c.id === colorId);
  return match?.hex || '#94a3b8';
}

// Ters yön: Google Takvim'de rengi Tomato/Flamingo yapılırsa CRM durumu buna göre
// güncellenir. Diğer renkler (Lavender/Banana) durumu etkilemez — sadece randevu
// türünün başlangıç rengidir, "geldi/gelmedi" anlamı taşımaz.
export function getStatusForColorId(colorId) {
  if (colorId === APPOINTMENT_COLORS.FLAMINGO.id) return 'ATTENDED';
  if (colorId === APPOINTMENT_COLORS.TOMATO.id) return 'NO_SHOW';
  return null;
}
