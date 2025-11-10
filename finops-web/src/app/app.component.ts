import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';

// Angular Material
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatSidenavModule, MatListModule,
    MatIconModule, MatButtonModule, MatMenuModule
  ],
  styles: [`
    .brand{font-weight:700;letter-spacing:.2px}
    .spacer{flex:1 1 auto}
    .sidenav{width:240px;border-right:0}
    .nav-link{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;margin:4px 8px;color:#2b2f38;text-decoration:none}
    .nav-link.active,.nav-link:hover{background:#eef2ff;color:#1a237e}
    .content{padding:20px}
    .topbar{position:sticky;top:0;z-index:10}
  `],
  template: `
    <mat-sidenav-container style="height:100vh;">
      <mat-sidenav class="sidenav" mode="side" opened>
        <div style="padding:16px 12px;font-weight:700">FinOps</div>
        <nav>
          <a class="nav-link" routerLink="" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">
            <mat-icon>query_stats</mat-icon><span>Dashboard</span>
          </a>
          <a class="nav-link" routerLink="budgets" routerLinkActive="active">
            <mat-icon>pie_chart</mat-icon><span>Budgets</span>
          </a>
          <a class="nav-link" routerLink="cleanup" routerLinkActive="active">
            <mat-icon>cleaning_services</mat-icon><span>Cleanup</span>
          </a>
        <a class="nav-link" routerLink="forecast" routerLinkActive="active">
  <mat-icon>show_chart</mat-icon> <span>Forecast</span>
</a>
          <a class="nav-link" routerLink="anomalies" routerLinkActive="active">
            <mat-icon>warning</mat-icon><span>Anomalies</span>
          </a>
          <a class="nav-link" routerLink="ingest" routerLinkActive="active">
            <mat-icon>cloud_upload</mat-icon><span>Ingest</span>
          </a>  
          

          <a class="nav-link" routerLink="alerts" routerLinkActive="active">
            <mat-icon>notifications</mat-icon><span>Alerts</span>
          </a>
        </nav>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar color="primary" class="topbar">
          <span class="brand">FinOps Cloud Cost</span>
          <span class="spacer"></span>

          <ng-container *ngIf="auth.isAuthed(); else anon">
            <button mat-button [matMenuTriggerFor]="userMenu">
              <mat-icon>account_circle</mat-icon>&nbsp;Account
            </button>
            <mat-menu #userMenu="matMenu">
              <button mat-menu-item routerLink="/profile">
                <mat-icon>person</mat-icon><span>Profile</span>
              </button>
              <button mat-menu-item (click)="logout()">
                <mat-icon>logout</mat-icon><span>Logout</span>
              </button>
            </mat-menu>
          </ng-container>
          <ng-template #anon>
            <a mat-button routerLink="/login">Login</a>
            <a mat-stroked-button routerLink="/register">Register</a>
          </ng-template>
        </mat-toolbar>

        <div class="content">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `
})
export class AppComponent {
  public auth = inject(AuthService);
  logout() { this.auth.clear(); location.href = '/login'; }
}
