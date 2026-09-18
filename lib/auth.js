import crypto from 'crypto';

const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 1000; // 24 saat, login route'daki cookie maxAge ile aynı

export function verifySessionToken(token, secret) {
  if (typeof token !== 'string' || typeof secret !== 'string' || !secret) return false;

  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return false;

  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);

  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;

  const separatorIndex = payload.lastIndexOf(':');
  if (separatorIndex === -1) return false;
  const issuedAt = Number(payload.slice(separatorIndex + 1));
  if (!Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > SESSION_MAX_AGE_MS) return false;

  return true;
}
