// Randevu oluştururken hızlı seçim için işlem kategorileri. Serbest metin
// başlık alanı zaten "elle yaz" ihtiyacını karşılıyor — bunlar sadece kısayol.
export const APPOINTMENT_PROCEDURE_OPTIONS = ['Botoks', 'Dolgu', 'Mezoterapi'];

// Randevu başlığını "<kategori/serbest metin> – <ürün adı>" biçiminde kurar.
// Her iki randevu formunda da (Ajanda ve hasta profili) aynı davranışı
// garanti etmek için tek kaynak — daha önce ürün eklenmişse önce onu
// temizleyip yeniden ekler, böylece ürün değiştirildiğinde başlık birikmez.
export function buildAppointmentTitle(currentTitle, productName) {
  const base = String(currentTitle || '').split(' – ')[0].trim();
  const product = String(productName || '').trim();
  if (!base) return product;
  if (!product) return base;
  return `${base} – ${product}`;
}
