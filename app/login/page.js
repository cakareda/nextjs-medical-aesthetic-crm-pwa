'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

// NOVANTİS marka renk paleti
const T = {
  bgMurjum: '#24152F',
  ametist: '#5A3A70',
  altin: '#C9A45C',
  krem: '#F5F0E8',
  beyaz: '#FFFFFF',
  btnMurjum: '#4A2859',
  basari: '#789681',
  hata: '#E8C9D1',
  textDark: '#24152F',
  textSoft: '#5A3A70',
  textMuted: '#766A7D',
};

const sans = 'var(--font-inter), sans-serif';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // React state async olduğu için çift submit'i ayrıca engelliyoruz.
  const isSubmittingRef = useRef(false);

  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/admin');
        router.refresh();
        return;
      }

      setError(data.error || 'Kullanıcı adı veya şifre hatalı.');
    } catch (err) {
      setError('Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 6,
    border: `1px solid ${T.ametist}40`,
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: sans,
    color: T.textDark,
    background: T.beyaz,
    transition: 'border-color 160ms ease, box-shadow 160ms ease',
  };

  return (
    <div
      className={inter.variable}
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        boxSizing: 'border-box',
        fontFamily: sans,
        background: T.bgMurjum,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Dekoratif arka plan ışıkları */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: T.ametist,
          opacity: 0.22,
          filter: 'blur(80px)',
          top: '-180px',
          right: '-140px',
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: T.altin,
          opacity: 0.08,
          filter: 'blur(90px)',
          bottom: '-160px',
          left: '-120px',
        }}
      />

      {/* Login kartı */}
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 420,
          background: T.krem,
          borderRadius: 10,
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.28)',
          overflow: 'hidden',
        }}
      >
        {/* Üst marka alanı */}
        <div
          style={{
            background: T.bgMurjum,
            padding: '34px 32px 30px',
            textAlign: 'center',
            borderBottom: `1px solid ${T.altin}55`,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                color: T.krem,
                fontSize: 30,
                lineHeight: 1,
                fontWeight: 700,
                letterSpacing: '0.16em',
                marginLeft: '0.16em',
              }}
            >
              NOVANTİS
            </div>

            <div
              style={{
                width: 48,
                height: 1,
                background: T.altin,
                margin: '12px 0 9px',
              }}
            />

            <div
              style={{
                color: T.altin,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.22em',
                marginLeft: '0.22em',
              }}
            >
              SAĞLIK & GÜZELLİK
            </div>
          </div>

          <p
            style={{
              margin: '20px 0 0',
              color: '#D9D0DE',
              fontSize: 13,
              fontWeight: 400,
            }}
          >
            Klinik Yönetim Paneli
          </p>
        </div>

        {/* Form alanı */}
        <div
          style={{
            padding: '32px',
          }}
        >
          {error && (
            <div
              role="alert"
              style={{
                background: T.hata,
                borderLeft: `3px solid ${T.hata}`,
                color: T.textDark,
                padding: '11px 13px',
                borderRadius: 5,
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 22,
                lineHeight: 1.45,
              }}
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleLogin}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            {/* Kullanıcı adı */}
            <div>
              <label
                htmlFor="username"
                style={{
                  display: 'block',
                  marginBottom: 7,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: T.textSoft,
                }}
              >
                Kullanıcı Adı
              </label>

              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Kullanıcı adınızı giriniz"
                autoComplete="username"
                required
                disabled={loading}
                style={{
                  ...inputStyle,
                  opacity: loading ? 0.75 : 1,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = T.altin;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${T.altin}18`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = `${T.ametist}40`;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Şifre */}
            <div>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  marginBottom: 7,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: T.textSoft,
                }}
              >
                Şifre
              </label>

              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={loading}
                style={{
                  ...inputStyle,
                  opacity: loading ? 0.75 : 1,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = T.altin;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${T.altin}18`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = `${T.ametist}40`;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Giriş butonu */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 5,
                width: '100%',
                border: 'none',
                borderRadius: 6,
                padding: '13px 16px',
                background: loading ? T.ametist : T.btnMurjum,
                color: T.beyaz,
                fontFamily: sans,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.01em',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.75 : 1,
                transition: 'background 160ms ease, transform 160ms ease',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = T.bgMurjum;
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = T.btnMurjum;
                }
              }}
              onMouseDown={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(1px)';
                }
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {loading ? 'Giriş Yapılıyor...' : 'Sisteme Giriş Yap'}
            </button>
          </form>

          {/* Alt bilgi */}
          <div
            style={{
              marginTop: 28,
              paddingTop: 18,
              borderTop: `1px solid ${T.ametist}20`,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                color: T.textMuted,
                fontSize: 11,
                lineHeight: 1.6,
              }}
            >
              Güçlü Enerji, Güzel Yarınlar...
            </div>

            <div
              style={{
                marginTop: 4,
                color: T.textMuted,
                fontSize: 10,
                opacity: 0.8,
              }}
            >
              © 2026 NOVANTİS Sağlık & Güzellik
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}