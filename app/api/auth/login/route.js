import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Sabit zamanlı string karşılaştırma fonksiyonu (Timing Attack önlemi)
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA); // yanıltıcı süre için kukla karşılaştırma
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// Basit ve güvenli session token üretici (HMAC imzalama)
function generateSessionToken(username, secret) {
  const payload = `${username}:${Date.now()}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    const ADMIN_USER = process.env.ADMIN_USER;
    const ADMIN_PASS = process.env.ADMIN_PASS;
    const SESSION_SECRET = process.env.SESSION_SECRET;

    if (!ADMIN_USER || !ADMIN_PASS || !SESSION_SECRET) {
      console.error('Güvenlik Uyarısı: ADMIN_USER, ADMIN_PASS veya SESSION_SECRET .env dosyasında eksik!');
      return NextResponse.json({ error: 'Sunucu yapılandırma hatası' }, { status: 500 });
    }

    const isUserValid = safeCompare(username, ADMIN_USER);
    const isPassValid = safeCompare(password, ADMIN_PASS);

    if (isUserValid && isPassValid) {
      const token = generateSessionToken(username, SESSION_SECRET);
      const response = NextResponse.json({ success: true });

      response.cookies.set('admin_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 saat
        path: '/',
      });

      return response;
    }

    return NextResponse.json({ error: 'Kullanıcı adı veya şifre hatalı!' }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ error: 'Giriş yapılırken hata oluştu' }, { status: 500 });
  }
}