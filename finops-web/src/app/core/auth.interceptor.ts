// src/app/core/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environments';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Prefix base URL if request is relative
  let url = req.url;
  if (!/^https?:\/\//i.test(url)) {
    const base = environment.apiBase.replace(/\/$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    url = `${base}${path}`;
  }

  // Attach bearer token if present
  const token = localStorage.getItem('token'); // <— single source of truth
  const headers = token ? req.headers.set('Authorization', `Bearer ${token}`) : req.headers;

  return next(req.clone({ url, headers }));
};
