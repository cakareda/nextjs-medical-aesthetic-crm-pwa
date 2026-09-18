'use client';

import { useState, useEffect } from 'react';

const COUNTRIES = [
  { dial: '90', flag: '🇹🇷', name: 'Türkiye', format: '5XX XXX XX XX' },
  { dial: '994', flag: '🇦🇿', name: 'Azerbaycan', format: 'XX XXX XX XX' },
  { dial: '49', flag: '🇩🇪', name: 'Almanya', format: 'XXX XXXXXXX' },
  { dial: '44', flag: '🇬🇧', name: 'İngiltere', format: 'XXXX XXXXXX' },
  { dial: '1', flag: '🇺🇸', name: 'ABD/Kanada', format: 'XXX XXX XXXX' },
  { dial: '33', flag: '🇫🇷', name: 'Fransa', format: 'X XX XX XX XX' },
  { dial: '31', flag: '🇳🇱', name: 'Hollanda', format: 'X XXXX XXXX' },
  { dial: '7', flag: '🇷🇺', name: 'Rusya', format: 'XXX XXX XX XX' },
  { dial: '966', flag: '🇸🇦', name: 'Suudi Arabistan', format: 'XX XXX XXXX' },
  { dial: '971', flag: '🇦🇪', name: 'BAE', format: 'XX XXX XXXX' },
];

export default function PhoneInput({ value, onChange, required }) {
  const [dial, setDial] = useState('90');
  const [localNumber, setLocalNumber] = useState('');

  useEffect(() => {
    if (!value) {
      setDial('90');
      setLocalNumber('');
      return;
    }
    const digits = String(value).replace(/\D/g, '');
    const match = COUNTRIES.find((c) => digits.startsWith(c.dial));
    if (match) {
      setDial(match.dial);
      setLocalNumber(digits.slice(match.dial.length));
    } else {
      setDial('90');
      setLocalNumber(digits);
    }
  }, [value]);
  const emit = (newDial, rawLocal) => {
    let digits = rawLocal.replace(/\D/g, '');
    if (newDial === '90' && digits.startsWith('0')) digits = digits.slice(1);
    onChange(digits ? `${newDial}${digits}` : '');
    };

  const currentFormat = COUNTRIES.find((c) => c.dial === dial)?.format || '5XX XXX XX XX';

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <select
        value={dial}
        onChange={(e) => {
          const newDial = e.target.value;
          setDial(newDial);
          emit(newDial, localNumber);
        }}
        style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #E5D5C5', fontSize: 13, color: '#24152F', background: '#FFFFFF', boxSizing: 'border-box', outline: 'none' }}
      >
        {COUNTRIES.map((country) => (
          <option key={country.dial} value={country.dial}>
            {country.flag} {country.name}
          </option>
        ))}
      </select>
      <input
        type="tel"
        value={localNumber}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '');
          setLocalNumber(digits);
          emit(dial, digits);
        }}
        placeholder={currentFormat}
        required={required}
        style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #E5D5C5', fontSize: 13, color: '#24152F', background: '#FFFFFF', boxSizing: 'border-box', outline: 'none' }}
      />
    </div>
  );
}