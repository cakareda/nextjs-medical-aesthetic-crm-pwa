import { supabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase-admin';

// Yüklenen dosyayı Supabase Storage'a (private bucket) yazar ve
// admin oturumu gerektiren proxy path'ini döner — DB'de bu path saklanır,
// gerçek imzalı URL her istek anında /api/files üzerinden üretilir.
export async function uploadToStorage(path, buffer, contentType) {
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { contentType, upsert: true });

  if (error) {
    throw new Error(`Depolama yükleme hatası: ${error.message}`);
  }

  return `/api/files/${path}`;
}

export async function getSignedFileUrl(path, expiresInSeconds = 3600) {
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    throw new Error(`İmzalı URL oluşturulamadı: ${error.message}`);
  }

  return data.signedUrl;
}
