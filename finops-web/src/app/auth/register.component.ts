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
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule
  ],
  styles: [`
    .wrap{display:grid;place-items:center;height:100vh;}
    mat-card{width:420px}
    .full{width:100%}
  `],
  template: `
    <div class="wrap">
      <mat-card appearance="outlined">
        <mat-card-header>
          <mat-card-title>Create your account</mat-card-title>
          <mat-card-subtitle>Start tracking cloud spend</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form (submit)="signup($event)">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Name</mat-label>
              <input matInput [(ngModel)]="name" name="name" required />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full">
              <mat-label>Email</mat-label>
              <input matInput [(ngModel)]="email" name="email" type="email" required />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full">
              <mat-label>Password</mat-label>
              <input matInput type="password" [(ngModel)]="password" name="password" required minlength="6" />
            </mat-form-field>

            <button mat-flat-button color="primary" class="full" style="margin-top:8px">Create account</button>
          </form>
        </mat-card-content>

        <mat-card-actions align="end">
          <a routerLink="/login">Have an account? Login</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `
})
export class RegisterComponent {
  private auth = inject(AuthService);
  name='Me'; email='me@example.com'; password='pass123';
  async signup(e: Event){ e.preventDefault(); await this.auth.register(this.email,this.password,this.name); location.href='/'; }
}
