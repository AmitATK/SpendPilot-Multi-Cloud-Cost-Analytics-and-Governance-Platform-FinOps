import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const token = auth.token();
    const headers: Record<string, string> = { 'X-Org': '00000000-0000-0000-0000-000000000000' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return next(req.clone({ setHeaders: headers }));
};
