// src/app/auth.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

export type UserRole = 'ADMIN' | 'USER' | 'VIEWER' | string;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);

  // reactive state (Angular signals)
  token = signal<string | null>(localStorage.getItem('token'));
  orgId = signal<string | null>(localStorage.getItem('orgId'));
  role  = signal<UserRole | null>((localStorage.getItem('role') as UserRole) || null);

  /** Template helpers */
  isAuthed(): boolean {
    return !!this.token();
  }
  isAdmin(): boolean {
    return (this.role() ?? '').toUpperCase() === 'ADMIN';
  }

  /** Auth flows */
  async login(email: string, password: string): Promise<void> {
    const r = await firstValueFrom(this.api.login({ email, password }));
    this.setSession(r.token, r.orgId, r.role);
  }

  async register(email: string, password: string, name?: string, orgName?: string): Promise<void> {
    const r = await firstValueFrom(this.api.register({ email, password, name, orgName }));
    this.setSession(r.token, r.orgId, r.role);
  }

  clear(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('orgId');
    localStorage.removeItem('role');
    this.token.set(null);
    this.orgId.set(null);
    this.role.set(null);
  }

  /** Internal */
  private setSession(token: string, orgId: string, role?: string) {
    localStorage.setItem('token', token);
    localStorage.setItem('orgId', orgId);

    let finalRole = role;
    if (!finalRole) {
      finalRole = this.decodeRoleFromJwt(token) ?? 'USER';
    }
    localStorage.setItem('role', finalRole);

    this.token.set(token);
    this.orgId.set(orgId);
    this.role.set(finalRole as UserRole);
  }

  private decodeRoleFromJwt(token: string): string | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role ?? payload.roles?.[0] ?? null;
    } catch {
      return null;
    }
  }
}
