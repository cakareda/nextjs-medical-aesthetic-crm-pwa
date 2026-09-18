// Telefonlar DB'de "ülke kodu + numara" birleşik, sadece rakam olarak saklanmalı
// Örn. Türkiye: 905551234567  (başında + yok, boşluk yok, 0 yok)

export function buildWhatsAppUrl(phone, message) {
  if (!phone) return null;
  const digitsOnly = String(phone).replace(/\D/g, '');
  if (!digitsOnly) return null;
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
}

export function formatPhoneDisplay(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return `+${digits}`;
}