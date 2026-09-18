'use client';

import { useState, useEffect } from 'react';

const COUNTRIES_RAW = [
  { dial: '90', flag: '🇹🇷', name: 'Türkiye', format: '5XX XXX XX XX' },
  { dial: '93', flag: '🇦🇫', name: 'Afganistan', format: 'XX XXX XXXX' },
  { dial: '49', flag: '🇩🇪', name: 'Almanya', format: 'XXX XXXXXXX' },
  { dial: '1', flag: '🇺🇸', name: 'ABD/Kanada', format: 'XXX XXX XXXX' },
  { dial: '355', flag: '🇦🇱', name: 'Arnavutluk', format: 'XX XXX XXXX' },
  { dial: '374', flag: '🇦🇲', name: 'Ermenistan', format: 'XX XXX XXX' },
  { dial: '61', flag: '🇦🇺', name: 'Avustralya', format: 'XXX XXX XXX' },
  { dial: '43', flag: '🇦🇹', name: 'Avusturya', format: 'XXX XXXXXXX' },
  { dial: '994', flag: '🇦🇿', name: 'Azerbaycan', format: 'XX XXX XX XX' },
  { dial: '973', flag: '🇧🇭', name: 'Bahreyn', format: 'XXXX XXXX' },
  { dial: '32', flag: '🇧🇪', name: 'Belçika', format: 'XXX XX XX XX' },
  { dial: '387', flag: '🇧🇦', name: 'Bosna Hersek', format: 'XX XXXX XXX' },
  { dial: '359', flag: '🇧🇬', name: 'Bulgaristan', format: 'XX XXX XXXX' },
  { dial: '420', flag: '🇨🇿', name: 'Çekya', format: 'XXX XXX XXX' },
  { dial: '86', flag: '🇨🇳', name: 'Çin', format: 'XXX XXXX XXXX' },
  { dial: '45', flag: '🇩🇰', name: 'Danimarka', format: 'XX XX XX XX' },
  { dial: '20', flag: '🇪🇬', name: 'Mısır', format: 'XXX XXX XXXX' },
  { dial: '358', flag: '🇫🇮', name: 'Finlandiya', format: 'XX XXX XXXX' },
  { dial: '33', flag: '🇫🇷', name: 'Fransa', format: 'X XX XX XX XX' },
  { dial: '995', flag: '🇬🇪', name: 'Gürcistan', format: 'XXX XXX XXX' },
  { dial: '82', flag: '🇰🇷', name: 'Güney Kore', format: 'XX XXXX XXXX' },
  { dial: '91', flag: '🇮🇳', name: 'Hindistan', format: 'XXXXX XXXXX' },
  { dial: '31', flag: '🇳🇱', name: 'Hollanda', format: 'X XXXX XXXX' },
  { dial: '964', flag: '🇮🇶', name: 'Irak', format: 'XXX XXX XXXX' },
  { dial: '353', flag: '🇮🇪', name: 'İrlanda', format: 'XX XXX XXXX' },
  { dial: '98', flag: '🇮🇷', name: 'İran', format: 'XXX XXX XXXX' },
  { dial: '44', flag: '🇬🇧', name: 'İngiltere', format: 'XXXX XXXXXX' },
  { dial: '34', flag: '🇪🇸', name: 'İspanya', format: 'XXX XXX XXX' },
  { dial: '972', flag: '🇮🇱', name: 'İsrail', format: 'XX XXX XXXX' },
  { dial: '46', flag: '🇸🇪', name: 'İsveç', format: 'XX XXX XX XX' },
  { dial: '41', flag: '🇨🇭', name: 'İsviçre', format: 'XX XXX XX XX' },
  { dial: '39', flag: '🇮🇹', name: 'İtalya', format: 'XXX XXX XXXX' },
  { dial: '81', flag: '🇯🇵', name: 'Japonya', format: 'XX XXXX XXXX' },
  { dial: '962', flag: '🇯🇴', name: 'Ürdün', format: 'X XXXX XXXX' },
  { dial: '996', flag: '🇰🇬', name: 'Kırgızistan', format: 'XXX XXX XXX' },
  { dial: '965', flag: '🇰🇼', name: 'Kuveyt', format: 'XXXX XXXX' },
  { dial: '961', flag: '🇱🇧', name: 'Lübnan', format: 'XX XXX XXX' },
  { dial: '36', flag: '🇭🇺', name: 'Macaristan', format: 'XX XXX XXXX' },
  { dial: '382', flag: '🇲🇪', name: 'Karadağ', format: 'XX XXX XXX' },
  { dial: '212', flag: '🇲🇦', name: 'Fas', format: 'XXX XXX XXX' },
  { dial: '47', flag: '🇳🇴', name: 'Norveç', format: 'XXX XX XXX' },
  { dial: '968', flag: '🇴🇲', name: 'Umman', format: 'XXXX XXXX' },
  { dial: '92', flag: '🇵🇰', name: 'Pakistan', format: 'XXX XXXXXXX' },
  { dial: '48', flag: '🇵🇱', name: 'Polonya', format: 'XXX XXX XXX' },
  { dial: '351', flag: '🇵🇹', name: 'Portekiz', format: 'XXX XXX XXX' },
  { dial: '974', flag: '🇶🇦', name: 'Katar', format: 'XXXX XXXX' },
  { dial: '40', flag: '🇷🇴', name: 'Romanya', format: 'XXX XXX XXX' },
  { dial: '7', flag: '🇷🇺', name: 'Rusya / Kazakistan', format: 'XXX XXX XX XX' },
  { dial: '966', flag: '🇸🇦', name: 'Suudi Arabistan', format: 'XX XXX XXXX' },
  { dial: '381', flag: '🇷🇸', name: 'Sırbistan', format: 'XX XXX XXXX' },
  { dial: '421', flag: '🇸🇰', name: 'Slovakya', format: 'XXX XXX XXX' },
  { dial: '992', flag: '🇹🇯', name: 'Tacikistan', format: 'XX XXX XXXX' },
  { dial: '993', flag: '🇹🇲', name: 'Türkmenistan', format: 'XX XXXXXX' },
  { dial: '380', flag: '🇺🇦', name: 'Ukrayna', format: 'XX XXX XX XX' },
  { dial: '998', flag: '🇺🇿', name: 'Özbekistan', format: 'XX XXX XX XX' },
  { dial: '971', flag: '🇦🇪', name: 'BAE', format: 'XX XXX XXXX' },
  { dial: '30', flag: '🇬🇷', name: 'Yunanistan', format: 'XXX XXX XXXX' },
];

// Türkiye her zaman ilk sırada ve varsayılan seçili; geri kalanı Türkçe
// alfabetik sıraya göre dizilir.
const COUNTRIES = [
  COUNTRIES_RAW.find((c) => c.dial === '90'),
  ...COUNTRIES_RAW.filter((c) => c.dial !== '90').sort((a, b) => a.name.localeCompare(b.name, 'tr')),
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