'use client';

import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const FILES = [
  'dolgu_uygulama_onam_fromu.pdf',
  'mezoterapi_onam_formu.pdf',
  'botilinum_toksin_uygulamalari_onam_formu.pdf',
];

export default function CoordPicker() {
  const [file, setFile] = useState(FILES[0]);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [points, setPoints] = useState([]);
  const canvasRef = useRef(null);
  const infoRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        // 'url' parametresini nesne içerisinde gönderiyoruz (Hatayı çözen kısım)
        const pdf = await pdfjsLib.getDocument({ url: `/${file}` }).promise;
        if (cancelled) return;
        setNumPages(pdf.numPages);
        const page = await pdf.getPage(pageNum);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        infoRef.current = { scale, pageHeightPt: page.view[3] - page.view[1] };
      } catch (err) {
        console.error('PDF yükleme hatası:', err);
      }
    }
    render();
    return () => { cancelled = true; };
  }, [file, pageNum]);

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !infoRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
    const { scale, pageHeightPt } = infoRef.current;
    const xPt = Math.round(cx / scale);
    const yPt = Math.round(pageHeightPt - cy / scale); // PDF standartlarında Y aşağıdan yukarıya doğru artar

    setPoints(prev => [...prev, { pointIndex: prev.length + 1, page: pageNum - 1, x: xPt, y: yPt }]);
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      <h2>🎯 Tıkla-ve-Koordinat-Al Seçici</h2>
      
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 15 }}>
        <label><b>Şablon Seç:</b></label>
        <select 
          value={file} 
          onChange={e => { setFile(e.target.value); setPageNum(1); setPoints([]); }}
          style={{ padding: '8px 12px', fontSize: 14 }}
        >
          {FILES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <button onClick={() => setPageNum(p => Math.max(1, p - 1))} style={{ marginLeft: 20, padding: '6px 12px' }}>‹ Önceki Sayfa</button>
        <span><b>Sayfa {pageNum} / {numPages}</b></span>
        <button onClick={() => setPageNum(p => Math.min(numPages, p + 1))} style={{ padding: '6px 12px' }}>Sonraki Sayfa ›</button>
      </div>

      <p style={{ fontSize: 13, color: '#555' }}>
        📌 Doldurulacak her alanın (kutucukların tam ortası, isim yazılacak boşluklar, imza alanları) üzerine tıklayın. Koordinatlar anında aşağıya JSON listesi olarak eklenecektir.
      </p>

      <div style={{ display: 'flex', gap: 20, marginTop: 15 }}>
        <div style={{ border: '2px solid #333', display: 'inline-block', overflow: 'auto' }}>
          <canvas ref={canvasRef} onClick={handleClick} style={{ cursor: 'crosshair', display: 'block' }} />
        </div>

        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>📍 Tıklanan Noktalar ({points.length})</h3>
            <button onClick={() => setPoints([])} style={{ background: '#e53e3e', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer' }}>Listeyi Temizle</button>
          </div>
          <pre style={{ background: '#1e1e1e', color: '#00ff66', padding: 12, borderRadius: 6, maxHeight: 600, overflow: 'auto', fontSize: 12 }}>
            {JSON.stringify(points, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}