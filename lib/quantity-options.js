export const UNIT_LABELS = { ML: 'ml', UNIT: 'Ünite', PIECE: 'Adet' };

// 0.5 ml'den 10.0 ml'ye kadar, yarımşar artan seçenekler.
export const ML_QUANTITY_OPTIONS = Array.from({ length: 20 }, (_, i) => ((i + 1) * 0.5).toFixed(1));

export function getQuantityOptions(unit) {
  if (unit === 'ML') return ML_QUANTITY_OPTIONS;
  return Array.from({ length: 10 }, (_, i) => String(i + 1));
}
