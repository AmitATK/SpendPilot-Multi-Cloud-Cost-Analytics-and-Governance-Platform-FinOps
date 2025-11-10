import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptorFn: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const org = auth.orgId();

  const headers: Record<string, string> = { ...(org ? { 'X-Org': org } : {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const cloned = req.clone({ setHeaders: headers });
  return next(cloned);
};
