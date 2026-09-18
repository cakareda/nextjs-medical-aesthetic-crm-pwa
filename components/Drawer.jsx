'use client';

import { T } from '@/lib/theme';

export default function Drawer({ open, onClose, title, children, width = 420 }) {
  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(36,21,47,0.45)' }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          height: '100%',
          width: `min(${width}px, 100vw)`,
          background: T.white,
          boxShadow: '-8px 0 30px rgba(36,21,47,0.25)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'drawer-slide-in 200ms ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${T.purple}30`, background: T.bg }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.gold }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            style={{ background: 'transparent', border: 'none', color: T.white, fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </div>
      </div>

      <style jsx>{`
        @keyframes drawer-slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
