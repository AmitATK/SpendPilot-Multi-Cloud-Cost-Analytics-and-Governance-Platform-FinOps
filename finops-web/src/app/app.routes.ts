import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard.component';
import { BudgetsComponent } from './features/budgets.component';
import { AlertsComponent } from './features/alerts.component';
import { CleanupComponent } from './features/cleanup.component';
import { AnomaliesComponent } from './features/anomalies.component';
import { IngestComponent } from './features/ingest.component';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { ForecastComponent } from './features/forecast.component';

export const routes: Routes = [  
   { path: '',          loadComponent: () => import('./features/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'budgets',   loadComponent: () => import('./features/budgets.component').then(m => m.BudgetsComponent) },
  { path: 'alerts',    loadComponent: () => import('./features/alerts.component').then(m => m.AlertsComponent) },
  { path: 'cleanup',   loadComponent: () => import('./features/cleanup.component').then(m => m.CleanupComponent) },
  { path: 'forecast', loadComponent: () => import('./features/forecast.component').then(m => m.ForecastComponent) },
  { path: 'anomalies', loadComponent: () => import('./features/anomalies.component').then(m => m.AnomaliesComponent) },
  { path: 'ingest',    loadComponent: () => import('./features/ingest.component').then(m => m.IngestComponent) },
  { path: 'login',     loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent) },
  { path: 'register',  loadComponent: () => import('./auth/register.component').then(m => m.RegisterComponent) },
  { path: 'profile',   loadComponent: () => import('./features/profile.component').then(m => m.ProfileComponent) },
  { path: 'tags-hygiene', loadComponent: () => import('./features/tags-hygiene.component').then(m => m.TagsHygieneComponent) },
  { path: 'statements', loadComponent: () => import('./features/statements.component').then(m => m.StatementsComponent) },
  { path: '**', redirectTo: '' },

];
