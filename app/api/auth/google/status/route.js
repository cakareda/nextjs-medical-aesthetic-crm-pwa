import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/google-calendar';

export async function GET() {
  try {
    const connection = await getConnection();
    return NextResponse.json({ connected: Boolean(connection) });
  } catch (err) {
    console.error('Google Takvim bağlantı durumu alınamadı:', err);
    return NextResponse.json({ connected: false });
  }
}
