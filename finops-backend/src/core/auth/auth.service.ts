import { Injectable, Inject, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { Pool } from 'pg';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored || typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':', 2);
  const calc = scryptSync(password, salt, 32).toString('hex');
  // constant-time compare
  try {
    return timingSafeEqual(Buffer.from(calc, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

@Injectable()
export class AuthService {
  constructor(@Inject(Pool) private readonly pg: Pool) {}

  async register(email: string, password: string, name?: string) {
   const pwHash = hashPassword(password);
const { rows } = await this.pg.query(
  `insert into users(email, name, password_hash)
   values($1,$2,$3)
   on conflict (email) do update
     set name = excluded.name,
         password_hash = excluded.password_hash
   returning id, email, name`,
  [email, name ?? null, pwHash]
);
    // Static org/role for MVP
    const orgId = '00000000-0000-0000-0000-000000000000';
    const role = 'ADMIN';
    const token = this.sign({ sub: rows[0].id, email: rows[0].email, orgId, role });
    return { token, user: { id: rows[0].id, email: rows[0].email, name: rows[0].name }, orgId, role };
  }

  async login(email: string, password: string) {
    try {
      const { rows } = await this.pg.query(
        `select id, email, name, password_hash from users where email=$1`,
        [email]
      );
      const u = rows[0];
      if (!u || !verifyPassword(password, u.password_hash)) {
        throw new UnauthorizedException('Invalid credentials');
      }
      const orgId = '00000000-0000-0000-0000-000000000000';
      const role = 'ADMIN';
      const token = this.sign({ sub: u.id, email: u.email, orgId, role });
      return { token, user: { id: u.id, email: u.email, name: u.name }, orgId, role };
    } catch (e: any) {
      // Helpful message if schema is missing columns
      if (e?.code === '42703') { // undefined_column
        throw new InternalServerErrorException('Column password_hash missing. Run migrations/003_auth.sql');
      }
      // bubble UnauthorizedException as 401; others as 500
      throw e;
    }
  }

  private sign(payload: any) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body   = Buffer.from(JSON.stringify({ iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+7*24*3600, ...payload })).toString('base64url');
    const secret = (process.env.JWT_SECRET || 'dev-secret');
    const sig = require('crypto').createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
  }
}
