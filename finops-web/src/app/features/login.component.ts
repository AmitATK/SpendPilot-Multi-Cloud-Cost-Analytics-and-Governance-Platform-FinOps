import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <h2 class="title">Login</h2>
  <form (submit)="submit($event)" class="card">
    <label>Email <input class="input" name="email" [(ngModel)]="email" required></label>
    <label>Password <input class="input" name="password" [(ngModel)]="password" type="password" required></label>
    <button class="btn">Login</button>
    <a routerLink="/register" class="link">Need an account?</a>
  </form>
  `,
  styles: [`.title{font-weight:600}.card{display:flex;gap:8px;flex-direction:column;max-width:360px}
  .input{border:1px solid #ddd;border-radius:6px;padding:6px 8px}
  .btn{padding:6px 12px;border-radius:8px;border:1px solid #ddd;background:#fafafa;cursor:pointer}
  .link{margin-top:6px;display:inline-block}`]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  email = ''; password = '';
  submit(ev: Event) {
    ev.preventDefault();
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: err => alert(err?.error?.message || 'Login failed')
    });
  }
}
