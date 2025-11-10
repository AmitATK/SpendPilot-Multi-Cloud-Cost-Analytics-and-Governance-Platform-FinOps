import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  styles: [`.row{display:flex;align-items:center;gap:16px}.spacer{flex:1 1 auto}`],
  template: `
    <h2 class="page-title">Profile</h2>
    <mat-card class="card">
      <div class="row">
        <mat-icon>account_circle</mat-icon>
        <div>
          <div style="font-weight:600">{{ name }}</div>
          <div style="color:#666">{{ email }}</div>
        </div>
        <span class="spacer"></span>
        <button mat-stroked-button (click)="logout()"><mat-icon>logout</mat-icon> Logout</button>
      </div>
    </mat-card>
  `
})
export class ProfileComponent {
  private auth = inject(AuthService);
  name = JSON.parse(localStorage.getItem('user') || '{}')?.name ?? 'User';
  email = JSON.parse(localStorage.getItem('user') || '{}')?.email ?? '—';
  logout(){ this.auth.clear(); location.href = '/login'; }
}
