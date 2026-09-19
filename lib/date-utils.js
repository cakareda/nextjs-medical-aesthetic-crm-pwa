export function getLocalDateString(dateInput) {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Türkiye 2016'dan beri DST uygulamıyor, yıl boyu sabit UTC+3. Randevu
// formları saat dilimi belirtmeden "2026-09-20T15:00" gibi bir string
// gönderiyor; sunucu (Vercel) UTC çalıştığından bunu doğrudan `new Date()`'e
// vermek 3 saatlik kaymaya yol açıyordu (15:00 girilen randevu 18:00 olarak
// kaydediliyordu). String'de zaten bir saat dilimi yoksa İstanbul ofsetini
// burada ekliyoruz.
export function parseIstanbulDateTime(dateStr) {
  if (!dateStr) return new Date(NaN);
  const hasOffset = /Z$|[+-]\d{2}:?\d{2}$/.test(dateStr);
  return new Date(hasOffset ? dateStr : `${dateStr}+03:00`);
}

export function calculateAge(birthDateStr) {
  if (!birthDateStr) return null;
  const birthDate = new Date(birthDateStr);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}