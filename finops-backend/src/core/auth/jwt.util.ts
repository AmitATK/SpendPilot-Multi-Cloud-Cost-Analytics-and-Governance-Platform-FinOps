import { createHmac } from 'crypto';

const b64url = (buf: Buffer | string) =>
  Buffer.from(typeof buf === 'string' ? buf : buf)
    .toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

export function signJwt(payload: any, secret: string, opts?: { expiresInSec?: number }) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, ...(opts?.expiresInSec ? { exp: now + opts.expiresInSec } : {}), ...payload };
  const token = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(body))}`;
  const sig = b64url(createHmac('sha256', secret).update(token).digest());
  return `${token}.${sig}`;
}

export function verifyJwt(token: string, secret: string): any | null {
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return null;
  const expect = b64url(createHmac('sha256', secret).update(`${h}.${p}`).digest());
  if (expect !== s) return null;
  const payload = JSON.parse(Buffer.from(p, 'base64').toString('utf8'));
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
  return payload;
}
