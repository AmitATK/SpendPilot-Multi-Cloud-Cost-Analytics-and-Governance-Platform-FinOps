import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule
  ],
  styles: [`
    .wrap{display:grid;place-items:center;height:100vh;}
    mat-card{width:380px}
    .full{width:100%}
  `],
  template: `
    <div class="wrap">
      <mat-card appearance="outlined">
        <mat-card-header>
          <mat-card-title>Welcome back</mat-card-title>
          <mat-card-subtitle>Sign in to continue</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form (submit)="login($event)">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Email</mat-label>
              <input matInput [(ngModel)]="email" name="email" placeholder="you@company.com" required />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full">
              <mat-label>Password</mat-label>
              <input matInput type="password" [(ngModel)]="password" name="password" required />
            </mat-form-field>

            <button mat-flat-button color="primary" class="full" style="margin-top:8px">Login</button>
          </form>
        </mat-card-content>

        <mat-card-actions align="end">
          <a routerLink="/register">Create account</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);
  email = 'me@example.com';
  password = 'pass123';
  async login(e: Event){ e.preventDefault(); await this.auth.login(this.email,this.password); location.href='/'; }
}
