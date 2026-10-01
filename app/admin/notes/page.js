'use client';

import { useEffect, useState } from 'react';
import { T } from '@/lib/theme';

function getIstanbulDateString(dateInput = new Date()) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getApiArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.notes)) return data.notes;
  return [];
}

export default function ClinicNotesPage() {
  const [selectedNoteDate, setSelectedNoteDate] = useState(() => getIstanbulDateString());
  const [noteContent, setNoteContent] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [pastNotesList, setPastNotesList] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchNotesList() {
      try {
        const res = await fetch('/api/daily-notes', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Notlar alınamadı.');
        if (!cancelled) setPastNotesList(getApiArray(data));
      } catch (err) {
        if (!cancelled) console.error('Not listesi alınamadı:', err);
      }
    }

    fetchNotesList();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedNoteDate) {
      setNoteContent('');
      return;
    }

    let cancelled = false;

    async function fetchSelectedNote() {
      try {
        const res = await fetch(`/api/daily-notes?date=${encodeURIComponent(selectedNoteDate)}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Not alınamadı.');
        if (!cancelled) setNoteContent(data?.content || '');
      } catch (err) {
        if (!cancelled) {
          console.error('Not getirme hatası:', err);
          setNoteContent('');
        }
      }
    }

    fetchSelectedNote();
    return () => { cancelled = true; };
  }, [selectedNoteDate]);

  const handleSaveNote = async () => {
    if (!selectedNoteDate) return;
    setNoteSaving(true);
    try {
      const res = await fetch('/api/daily-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedNoteDate, content: noteContent }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Not kaydedilemedi.');

      const notesRes = await fetch('/api/daily-notes', { cache: 'no-store' });
      const notesData = await notesRes.json();
      if (notesRes.ok) setPastNotesList(getApiArray(notesData));
    } catch (err) {
      console.error('Not kaydetme hatası:', err);
      alert(err?.message || 'Not kaydedilemedi.');
    } finally {
      setNoteSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', color: T.bg }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: '0 0 4px 0', fontSize: 13, fontWeight: 700, color: T.purpleDark, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Klinik Notları
        </p>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.bg }}>Günün Notları</h1>
      </div>

      <div style={{ background: T.white, border: `1px solid ${T.purple}30`, borderRadius: 16, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 12.5, color: T.purple }}>
            Seçilen gün için özel notlar alın, geçmiş günlerin arşivine göz atın.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="note-date" style={{ fontSize: 12.5, fontWeight: 700, color: T.purple }}>
              Tarih:
            </label>
            <input
              id="note-date"
              type="date"
              value={selectedNoteDate}
              onChange={(event) => setSelectedNoteDate(event.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${T.purple}`, fontSize: 13, background: T.white, color: T.bg }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <textarea
            rows={8}
            value={noteContent}
            onChange={(event) => setNoteContent(event.target.value)}
            placeholder={`${selectedNoteDate} tarihi için klinik notlarını buraya yazın...`}
            style={{
              width: '100%',
              padding: 13,
              borderRadius: 8,
              border: `1px solid ${T.purple}`,
              fontSize: 14,
              boxSizing: 'border-box',
              outline: 'none',
              resize: 'vertical',
              color: T.bg,
              background: T.white,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={noteSaving}
              style={{
                background: T.purpleDark,
                color: T.gold,
                border: 'none',
                padding: '10px 22px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: noteSaving ? 'default' : 'pointer',
                opacity: noteSaving ? 0.7 : 1,
              }}
            >
              {noteSaving ? 'Kaydediliyor...' : 'Notu kaydet'}
            </button>
          </div>

          <details style={{ background: '#F0E7F2', border: `1px solid ${T.purple}30`, borderRadius: 8, padding: '10px 14px' }}>
            <summary style={{ fontSize: 12, fontWeight: 700, color: T.purple, cursor: 'pointer' }}>
              Geçmiş notlar arşivi {pastNotesList.length > 0 ? `(${pastNotesList.length})` : ''}
            </summary>

            {pastNotesList.length === 0 ? (
              <div style={{ fontSize: 11.5, color: T.purple, marginTop: 10 }}>
                Henüz geçmiş kayıt yok.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {pastNotesList.map((note) => (
                  <button
                    type="button"
                    key={note.id}
                    onClick={() => setSelectedNoteDate(note.date)}
                    style={{
                      background: selectedNoteDate === note.date ? T.purpleDark : T.white,
                      border: `1px solid ${selectedNoteDate === note.date ? T.purpleDark : T.purple}40`,
                      padding: '6px 12px',
                      borderRadius: 999,
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: selectedNoteDate === note.date ? 700 : 500,
                      color: selectedNoteDate === note.date ? T.gold : T.bg,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {note.date}
                  </button>
                ))}
              </div>
            )}
          </details>
        </div>
      </div>
    </div>
  );
}
