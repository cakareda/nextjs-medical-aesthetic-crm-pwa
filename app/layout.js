import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'Novantis Yönetim Sistemi',
  description: 'Medikal Estetik & Hasta Onam Yönetimi',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#24152F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className={inter.className}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#F5F0E8', color: '#24152F' }}>
        {children}
      </body>
    </html>
  );
}