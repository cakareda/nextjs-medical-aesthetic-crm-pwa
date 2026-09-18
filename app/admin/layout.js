'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

const T = {
  bg: '#24152F',
  purple: '#5A3A70',
  purpleDark: '#4A2859',
  gold: '#C9A45C',
  cream: '#FFF0E8',
  white: '#FFFFFF',
  success: '#789681',
  error: '#E8C9D1',
};

const sans = 'var(--font-inter), sans-serif';

const IconLayoutDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9"></rect>
    <rect x="14" y="3" width="7" height="5"></rect>
    <rect x="14" y="12" width="7" height="9"></rect>
    <rect x="3" y="16" width="7" height="5"></rect>
  </svg>
);

const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const IconPackage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);

const IconFilePlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="12" y1="18" x2="12" y2="12"></line>
    <line x1="9" y1="15" x2="15" y2="15"></line>
  </svg>
);

const IconLogOut = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    if (!confirm('Oturumu kapatmak istediğinize emin misiniz?')) return;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { label: 'Anasayfa', href: '/admin', icon: <IconLayoutDashboard /> },
    { label: 'Yeni Onam Gönder', href: '/admin/new-session', icon: <IconFilePlus /> },
    { label: 'Hasta Kayıtları', href: '/admin/patients', icon: <IconUsers /> },
    { label: 'Ajanda', href: '/admin/appointments', icon: <IconCalendar /> },
    { label: 'Stok & Envanter', href: '/admin/inventory', icon: <IconPackage /> },
  ];

  return (
    <div className={inter.variable} style={{ display: 'flex', minHeight: '100vh', background: T.bg, fontFamily: sans }}>

      {/* SOL SABİT SIDEBAR */}
      <aside
        style={{
          width: 240,
          background: T.bg,
          borderRight: '1px solid rgba(255,255,255,0.08)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          height: '100vh',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        <div>
          {/* LOGO & BAŞLIK */}
          <div style={{ padding: '0 8px 20px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.gold, letterSpacing: '0.06em', fontFamily: sans }}>
              NOVANTİS
            </h2>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>Sağlık & Güzellik</span>
          </div>

          {/* MENÜ LİSTESİ */}
          <nav style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 6,
                    borderLeft: isActive ? `2px solid ${T.gold}` : '2px solid transparent',
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? T.gold : 'rgba(255,255,255,0.75)',
                    background: isActive ? 'rgba(201,164,92,0.12)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', color: isActive ? T.gold : 'rgba(255,255,255,0.55)' }}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* OTURUMU KAPAT */}
        <div style={{ paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent',
              color: T.error,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: sans,
            }}
          >
            <IconLogOut /> Oturumu Kapat
          </button>
        </div>
      </aside>

      {/* SAĞ ANA İÇERİK */}
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', background: T.bg }}>
        {children}
      </main>

    </div>
  );
}