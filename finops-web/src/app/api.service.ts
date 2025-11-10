import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Budget {
  id: string; name: string;
  monthly_limit?: number | string; monthlyLimit?: number | string;
  thresholds: number[]; scope: any; currency: string;
}
export interface Anomaly {
  id: string; scope: any; detectedAt: string; granularity: string;
  forDate: string; expected: string; actual: string; zScore: string; severity: 'low'|'medium'|'high'; method: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  // Fallback header for old endpoints if used without JWT (still supported by backend)
  private headers = { 'X-Org': '00000000-0000-0000-0000-000000000000' };

  // Auth
  register(p: { email: string; password: string; name?: string; orgName?: string }) {
    return this.http.post<{ token: string; orgId: string; role: string }>('/auth/register', p);
  }
  login(p: { email: string; password: string }) {
    return this.http.post<{ token: string; orgId: string; role: string }>('/auth/login', p);
  }

  // Overview / Costs
  dailyCost(params: { from: string; to: string; service?: string }) {
    return this.http.get<any>('/v1/overview/daily', { params: params as any, headers: this.headers });
  }

  // Budgets
  listBudgets() { return this.http.get<Budget[]>('/v1/budgets'); }
  createBudget(b: Partial<Budget>) { return this.http.post<Budget>('/v1/budgets', b); }

  // Mock & Cleanup
  triggerMock(day: string) { return this.http.post('/v1/usage/mock', { day }, { headers: this.headers }); }
  triggerCleanupScan() { return this.http.post('/v1/cleanup/scan', {}, { headers: this.headers }); }

  // Anomalies
  anomaliesList() {
    return this.http.get<any>('/v1/anomalies', { headers: this.headers });
  }
    anomaliesDetect(params: { from?: string; to?: string; z?: number }) {
    return this.http.post<any>('/v1/anomalies/detect', params, { headers: this.headers });
  }

  // Ingest
  ingestCur(file: File) {
    const fd = new FormData(); fd.append('file', file);
    return this.http.post<{ rows: number }>('/v1/ingest/aws/cur', fd);
  }


  ingestAwsCur(payload: any) {
    return this.http.post('/v1/ingest/aws/cur', payload, { headers: this.headers });
  }
 listAnomalies(params?: { from?: string; to?: string }) {
    return this.http.get<any>('/v1/anomalies', { params: params as any, headers: this.headers });
  }
  detectAnomalies(day: string) {
    return this.http.post<any>('/v1/anomalies/detect', { day }, { headers: this.headers });
  }

forecast(params: { alpha: number; h: number }) {
  return this.http.get<any>('/v1/overview/forecast', {
    params: { alpha: String(params.alpha), h: String(params.h) },
    headers: this.headers
  });
}




}
