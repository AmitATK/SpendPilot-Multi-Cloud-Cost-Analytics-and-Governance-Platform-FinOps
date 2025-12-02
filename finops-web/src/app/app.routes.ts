// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'budgets', loadComponent: () => import('./features/budgets.component').then(m => m.BudgetsComponent), canActivate: [authGuard] },
  { path: 'cleanup', loadComponent: () => import('./features/cleanup.component').then(m => m.CleanupComponent), canActivate: [authGuard] },
  { path: 'forecast', loadComponent: () => import('./features/forecast.component').then(m => m.ForecastComponent), canActivate: [authGuard] },
  { path: 'anomalies', loadComponent: () => import('./features/anomalies.component').then(m => m.AnomaliesComponent), canActivate: [authGuard] },
  { path: 'ingest', loadComponent: () => import('./features/ingest.component').then(m => m.IngestComponent), canActivate: [authGuard] },
  { path: 'tags-hygiene', loadComponent: () => import('./features/tags-hygiene.component').then(m => m.TagHygieneComponent), canActivate: [authGuard] },
  { path: 'statements', loadComponent: () => import('./features/statements.component').then(m => m.StatementsComponent), canActivate: [authGuard] },
  { path: 'alerts', loadComponent: () => import('./features/alerts.component').then(m => m.AlertsComponent), canActivate: [authGuard] },
  { path: 'settings', loadComponent: () => import('./features/settings.component').then(m => m.SettingsComponent), canActivate: [authGuard] },

  // public
  { path: 'login', loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./auth/register.component').then(m => m.RegisterComponent) },

  // profile is authed (view account)
  { path: 'profile', loadComponent: () => import('./features/profile.component').then(m => m.ProfileComponent), canActivate: [authGuard] },
  { path: 'policies', loadComponent: () => import('./features/alert-policies.component').then(m => m.AlertPoliciesComponent), canActivate: [authGuard] },
  { path: 'rightsizing', loadComponent: () => import('./features/rightsizing.component').then(m => m.RightsizingComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
