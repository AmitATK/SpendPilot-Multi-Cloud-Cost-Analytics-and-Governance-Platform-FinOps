import { HttpInterceptorFn } from '@angular/common/http';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('finops_token');
  const orgId = '00000000-0000-0000-0000-000000000000';
  const headers: Record<string, string> = { 'X-Org': orgId };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Optional demo role header for RBAC samples:
  // headers['X-Role'] = 'ADMIN';
  return next(req.clone({ setHeaders: headers }));
};
