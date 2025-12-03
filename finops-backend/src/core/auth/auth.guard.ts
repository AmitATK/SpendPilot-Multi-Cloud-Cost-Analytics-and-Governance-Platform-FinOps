import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { verifyJwt } from './jwt.util';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const auth = (req.headers['authorization'] as string) || '';
    const allowHeaderFallback =
      process.env.ALLOW_DEMO_HEADER === 'true' && process.env.NODE_ENV !== 'production';

    // Bearer token path (preferred)
    if (auth.startsWith('Bearer ')) {
      const token = auth.slice(7);
      const payload = verifyJwt(token, process.env.JWT_SECRET || 'dev-secret');
      if (!payload) throw new UnauthorizedException('Invalid token');

      // Expect orgId in JWT
      if (!payload.orgId) throw new ForbiddenException('Missing org in token');

      req.user = { id: payload.sub, email: payload.email, role: payload.role };
      req.orgId = payload.orgId;
      return true;
    }

    // Optional dev-only fallback (X-Org header)
    if (allowHeaderFallback) {
      const orgHeader =
        (req.headers['x-org'] as string) || '00000000-0000-0000-0000-000000000000';
      req.user = { id: 'demo-user', role: 'ADMIN' };
      req.orgId = orgHeader;
      return true;
    }

    throw new UnauthorizedException('Missing bearer token');
  }
}
