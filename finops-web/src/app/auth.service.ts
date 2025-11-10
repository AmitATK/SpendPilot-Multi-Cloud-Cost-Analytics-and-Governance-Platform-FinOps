import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

type LoginRes = { token: string; user: { id: string; email: string; name?: string }, orgId: string, role: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private key = 'finops_jwt';
  private _authed = signal<boolean>(!!localStorage.getItem(this.key));
  user = signal<LoginRes['user'] | null>(null);
  orgId = signal<string>('00000000-0000-0000-0000-000000000000');

  constructor(private http: HttpClient) {}

  token(): string | null { return localStorage.getItem(this.key); }
  isAuthed() { return this._authed(); }

  async register(email: string, password: string, name?: string) {
    const res = await this.http.post<LoginRes>('/auth/register', { email, password, name }).toPromise();
    this.setSession(res!);
  }

  async login(email: string, password: string) {
    const res = await this.http.post<LoginRes>('/auth/login', { email, password }).toPromise();
    this.setSession(res!);
  }

  clear() {
    localStorage.removeItem(this.key);
    this._authed.set(false);
    this.user.set(null);
  }

  private setSession(res: LoginRes) {
    localStorage.setItem(this.key, res.token);
    this._authed.set(true);
    this.user.set(res.user);
    this.orgId.set(res.orgId);
  }
}
