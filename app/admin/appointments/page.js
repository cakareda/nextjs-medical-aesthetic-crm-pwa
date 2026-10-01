'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Ajanda artık anasayfada (/admin) gösteriliyor — eski linkler/yer
// imleri kırılmasın diye buraya gelen biri sessizce yönlendirilsin.
export default function AppointmentsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/admin${window.location.search}`);
  }, [router]);

  return null;
}
