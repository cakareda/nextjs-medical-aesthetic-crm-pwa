export function computePaymentStatus(price, paidAmount) {
  const p = Number(price) || 0;
  const paid = Number(paidAmount) || 0;

  if (paid <= 0) {
    return 'UNPAID';
  }

  if (paid >= p) {
    return 'PAID';
  }

  return 'PARTIAL';
}