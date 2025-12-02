import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../auth.service';

@Component({
  standalone: true,
  selector: 'app-profile',
  imports: [CommonModule, MatCardModule, MatButtonModule],
  template: `
    <h2 class="page-title">Profile</h2>
    <mat-card>
      <div style="display:grid;grid-template-columns:160px 1fr;row-gap:8px;column-gap:16px;align-items:center;">
        <div>Org ID</div><div><code>{{ orgId || '—' }}</code></div>
        <div>Role</div><div>{{ role || '—' }}</div>
        <div>JWT</div><div style="overflow:auto;"><code>{{ tokenShort() }}</code></div>
      </div>

      <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap;">
        <button mat-stroked-button (click)="copyToken()">Copy JWT</button>
        <button mat-button color="primary" (click)="logout()">Logout</button>
      </div>
    </mat-card>
  `
})
export class ProfileComponent {
  private auth = inject(AuthService);
  orgId = this.auth.orgId();
  role = this.auth.role();
  token = this.auth.token();

  tokenShort = () => this.token ? this.token.slice(0, 16) + '…' : '—';

  copyToken() {
    if (this.token) navigator.clipboard.writeText(this.token);
  }
  logout() {
    this.auth.clear();
    location.href = '/login';
  }
}
