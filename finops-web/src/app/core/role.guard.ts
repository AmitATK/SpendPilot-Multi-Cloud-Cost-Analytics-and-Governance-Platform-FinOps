import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return false;
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    return payload?.role === 'ADMIN';
  } catch { return false; }
};
