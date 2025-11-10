import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { verifyJwt } from './jwt.util';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const auth = (req.headers['authorization'] as string) || '';
    const orgHeader = (req.headers['x-org'] as string) || '00000000-0000-0000-0000-000000000000';

    if (auth.startsWith('Bearer ')) {
      const token = auth.slice(7);
      const payload = verifyJwt(token, process.env.JWT_SECRET || 'dev-secret');
      if (payload) {
        req.user = { id: payload.sub, email: payload.email, role: payload.role };
        req.orgId = payload.orgId || orgHeader;
        return true;
      }
    }
    // demo fallback: header only
    req.user = { id: 'demo-user' };
    req.orgId = orgHeader;
    return true;
  }
}
