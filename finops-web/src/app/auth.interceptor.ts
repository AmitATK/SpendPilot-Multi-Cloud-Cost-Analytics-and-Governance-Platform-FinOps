import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.token();
  const orgId = auth.orgId();

  let headers = req.headers;
  if (token) headers = headers.set('Authorization', `Bearer ${token}`);
  if (orgId) headers = headers.set('X-Org', orgId);

  const authedReq = req.clone({ headers });

  return next(authedReq).pipe({
    error: (err:any, _caught:any) => {
      // If backend says 401, clear session & send to login
      if (err?.status === 401) {
        auth.clear();
        router.navigateByUrl('/login');
      }
      throw err;
    }
  } as any);
};
