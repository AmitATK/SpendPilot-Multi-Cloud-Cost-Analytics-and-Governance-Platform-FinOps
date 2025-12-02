import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';

export interface AuthResult {
  token: string;
  user: { id: string; email: string; name?: string };
  orgId: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private _token = signal<string | null>(localStorage.getItem('finops_token'));
  private _user = signal<AuthResult['user'] | null>(JSON.parse(localStorage.getItem('finops_user') || 'null'));

  token = computed(() => this._token());
  user  = computed(() => this._user());
  isAuthed = computed(() => !!this._token());

  register(payload: { email: string; password: string; name?: string }) {
    return this.http.post<AuthResult>('/auth/register', payload).pipe(
      tap(res => this.store(res))
    );
  }
  login(payload: { email: string; password: string }) {
    return this.http.post<AuthResult>('/auth/login', payload).pipe(
      tap(res => this.store(res))
    );
  }
  logout() {
    this._token.set(null);
    this._user.set(null);
    localStorage.removeItem('finops_token');
    localStorage.removeItem('finops_user');
  }

  private store(res: AuthResult) {
    this._token.set(res.token);
    this._user.set(res.user);
    localStorage.setItem('finops_token', res.token);
    localStorage.setItem('finops_user', JSON.stringify(res.user));
  }
  
  isAdmin(): boolean {
  try {
    const raw = localStorage.getItem('token');
    if (!raw) return false;
    const payload = JSON.parse(atob(raw.split('.')[1] || ''));
    const role = String(payload?.role ?? '').toUpperCase();
  return (role ?? '').toUpperCase() === 'ADMIN';
  } catch {
    return false;
  }
}

}
