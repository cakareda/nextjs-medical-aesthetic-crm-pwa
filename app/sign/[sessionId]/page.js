'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import SignaturePad from 'signature_pad';
import { CONSENT_QUESTIONS } from '@/lib/consent-questions';
import { Inter } from 'next/font/google';
import { T } from '@/lib/theme';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

const sans = 'var(--font-inter), sans-serif';

export default function SignPage() {
  const { sessionId } = useParams();

  const [session, setSession] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [step, setStep] = useState('loading');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');

  const [answers, setAnswers] = useState({});
  const [qIndex, setQIndex] = useState(0);
  const [patientSignature, setPatientSignature] = useState(null);
  const [error, setError] = useState(null);

  const canvasRef = useRef(null);
  const padRef = useRef(null);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setNotFound(true);
          return;
        }

        setSession(data);

        const patient = data.treatment?.patient;

        if (patient?.birthDate) {
          setBirthDate(patient.birthDate.split('T')[0]);
        }

        if (patient?.gender) {
          setGender(patient.gender);
        }

        if (patient?.birthDate && patient?.gender) {
          setStep('questions');
        } else if (patient?.birthDate) {
          setStep('gender');
        } else {
          setStep('birthdate');
        }
      })
      .catch(() => setNotFound(true));
  }, [sessionId]);

  const currentQuestions = session?.templateFile
    ? CONSENT_QUESTIONS[session.templateFile] ||
      CONSENT_QUESTIONS['dolgu_uygulama_onam_fromu.pdf']
    : [];

  useEffect(() => {
    if (canvasRef.current && step === 'patientSign') {
      padRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: T.bg,
      });
    }

    return () => {
      if (padRef.current) {
        padRef.current.off();
        padRef.current = null;
      }
    };
  }, [step]);

  const answerQuestion = (value) => {
    const q = currentQuestions[qIndex];

    if (!q) return;

    setAnswers((prev) => ({
      ...prev,
      [q.id]: value,
    }));

    if (qIndex + 1 < currentQuestions.length) {
      setQIndex((prev) => prev + 1);
    } else {
      setStep('patientSign');
    }
  };

  const captureSignatureAndSubmit = () => {
    if (!padRef.current || padRef.current.isEmpty()) {
      alert('Lütfen kutucuk içerisine imzanızı atınız.');
      return;
    }

    const dataUrl = padRef.current.toDataURL('image/png');

    setPatientSignature(dataUrl);
    submitAll(dataUrl);
  };

  const submitAll = async (patientSig) => {
    setStep('submitting');
    setError(null);

    try {
      const res = await fetch('/api/sign-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          birthDate,
          gender,
          answers,
          patientSignature: patientSig,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || 'Bilinmeyen bir hata oluştu.'
        );
      }

      setStep('done');
    } catch (err) {
      setError(err.message);
      setStep('patientSign');
    }
  };

  if (notFound) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: T.cream,
          color: T.textDark,
          fontFamily: sans,
          textAlign: 'center',
        }}
      >
        Bağlantı geçersiz veya oturum bulunamadı.
      </main>
    );
  }

  if (!session || step === 'loading') {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: T.cream,
          color: T.textDark,
          fontFamily: sans,
        }}
      >
        Yükleniyor...
      </main>
    );
  }

  const patientName = session.treatment?.patient?.fullName;

  return (
    <main
      className={inter.className}
      style={{
        minHeight: '100vh',
        background: T.cream,
        padding: '24px 16px',
        boxSizing: 'border-box',
        fontFamily: sans,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          margin: '0 auto',
          background: T.white,
          borderRadius: 14,
          padding: 24,
          boxSizing: 'border-box',
          boxShadow: '0 8px 30px rgba(36, 21, 47, 0.10)',
        }}
      >
        {/* MARKA / HASTA BAŞLIĞI */}
        <header
          style={{
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          <img src="/logo.png" alt="Novantis" style={{ height: 64, width: 'auto', display: 'block', margin: '0 auto 12px' }} />

          <h1
            style={{
              margin: 0,
              color: T.textDark,
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            {patientName}
          </h1>

          <p
            style={{
              margin: '8px 0 0',
              color: T.textSoft,
              fontSize: 14,
            }}
          >
            {session.treatment?.treatmentType} — Onam Formu
          </p>
        </header>

        {/* HATA */}
        {error && (
          <div
            style={{
              marginBottom: 18,
              padding: 12,
              borderRadius: 8,
              background: T.error,
              color: T.textDark,
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* ADIM 1: DOĞUM TARİHİ */}
        {step === 'birthdate' && (
          <section>
            <h2
              style={{
                margin: '0 0 16px',
                color: T.textDark,
                fontSize: 18,
              }}
            >
              Lütfen doğum tarihinizi giriniz
            </h2>

            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              style={{
                padding: 12,
                fontSize: 16,
                borderRadius: 8,
                border: `1px solid ${T.purple}40`,
                width: '100%',
                boxSizing: 'border-box',
                fontFamily: sans,
                color: T.textDark,
                background: T.white,
              }}
            />

            <button
              type="button"
              onClick={() => {
                if (birthDate) {
                  setStep('gender');
                } else {
                  alert('Lütfen doğum tarihinizi giriniz.');
                }
              }}
              style={{
                marginTop: 18,
                width: '100%',
                padding: '13px 24px',
                background: T.purpleDark,
                color: T.white,
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                fontFamily: sans,
              }}
            >
              Devam Et
            </button>
          </section>
        )}

        {/* ADIM 2: CİNSİYET SEÇİMİ */}
        {step === 'gender' && (
          <section>
            <h2
              style={{
                margin: '0 0 16px',
                color: T.textDark,
                fontSize: 18,
              }}
            >
              Cinsiyetinizi seçiniz
            </h2>

            <div
              style={{
                display: 'flex',
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setGender('Kadın');
                  setStep('questions');
                }}
                style={{
                  flex: 1,
                  padding: '16px 10px',
                  fontSize: 15,
                  background: T.white,
                  color: T.purpleDark,
                  border: `1px solid ${T.purple}40`,
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: sans,
                }}
              >
                Kadın
              </button>

              <button
                type="button"
                onClick={() => {
                  setGender('Erkek');
                  setStep('questions');
                }}
                style={{
                  flex: 1,
                  padding: '16px 10px',
                  fontSize: 15,
                  background: T.white,
                  color: T.purpleDark,
                  border: `1px solid ${T.purple}40`,
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: sans,
                }}
              >
                Erkek
              </button>
            </div>
          </section>
        )}

        {/* ADIM 3: SORULAR */}
        {step === 'questions' && currentQuestions.length > 0 && (
          <section>
            <div
              style={{
                marginBottom: 12,
                color: T.textSoft,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Soru {qIndex + 1} / {currentQuestions.length}
            </div>

            <h2
              style={{
                margin: '0 0 24px',
                color: T.textDark,
                fontSize: 18,
                lineHeight: 1.5,
              }}
            >
              {currentQuestions[qIndex].text}
            </h2>

            <div
              style={{
                display: 'flex',
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() => answerQuestion('evet')}
                style={{
                  flex: 1,
                  padding: '14px 10px',
                  fontSize: 15,
                  background: T.purpleDark,
                  color: T.white,
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: sans,
                }}
              >
                Evet
              </button>

              <button
                type="button"
                onClick={() => answerQuestion('hayir')}
                style={{
                  flex: 1,
                  padding: '14px 10px',
                  fontSize: 15,
                  background: T.white,
                  color: T.textDark,
                  border: `1px solid ${T.purple}40`,
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: sans,
                }}
              >
                Hayır
              </button>
            </div>
          </section>
        )}

        {/* ADIM 4: HASTA İMZA */}
        {step === 'patientSign' && (
          <section>
            <h2
              style={{
                margin: '0 0 16px',
                color: T.textDark,
                fontSize: 18,
              }}
            >
              Hasta İmzası
            </h2>

            <p
              style={{
                margin: '0 0 12px',
                color: T.textSoft,
                fontSize: 14,
              }}
            >
              Lütfen aşağıdaki alana imzanızı atınız.
            </p>

            <div
              style={{
                width: '100%',
                overflow: 'hidden',
                border: `1px solid ${T.purple}40`,
                borderRadius: 8,
                background: T.white,
              }}
            >
              <canvas
                ref={canvasRef}
                width={340}
                height={160}
                style={{
                  display: 'block',
                  width: '100%',
                  height: 160,
                  touchAction: 'none',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: 10,
              }}
            >
              <button
                type="button"
                onClick={() => padRef.current?.clear()}
                style={{
                  padding: '11px 18px',
                  borderRadius: 8,
                  border: `1px solid ${T.purple}40`,
                  background: T.white,
                  color: T.textDark,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: sans,
                }}
              >
                Temizle
              </button>
            </div>

            <button
              type="button"
              onClick={captureSignatureAndSubmit}
              style={{
                marginTop: 18,
                width: '100%',
                padding: '14px 20px',
                background: T.purpleDark,
                color: T.white,
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                fontFamily: sans,
              }}
            >
              İmzayı Onayla ve Bitir
            </button>
          </section>
        )}

        {/* GÖNDERİLİYOR */}
        {step === 'submitting' && (
          <section
            style={{
              textAlign: 'center',
              padding: '30px 10px',
              color: T.textDark,
            }}
          >
            Tüm veriler ve imza PDF&apos;e işleniyor...
          </section>
        )}

        {/* TAMAMLANDI */}
        {step === 'done' && (
          <section
            style={{
              textAlign: 'center',
              padding: '20px 10px',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                margin: '0 auto 16px',
                borderRadius: '50%',
                background: T.success,
                color: T.white,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              ✓
            </div>

            <h2
              style={{
                margin: '0 0 8px',
                color: T.textDark,
                fontSize: 20,
              }}
            >
              İşlem başarıyla tamamlandı
            </h2>

            <p
              style={{
                margin: 0,
                color: T.textSoft,
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              Form kaydedildi, bu sayfayı kapatabilirsiniz.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}