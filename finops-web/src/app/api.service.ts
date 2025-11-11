import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Budget {
  id: string; name: string;
  monthly_limit?: number | string; monthlyLimit?: number | string;
  thresholds: number[]; scope: any; currency: string;
}
export interface Anomaly {
  id: string; scope: any; detectedAt: string; granularity: string;
  forDate: string; expected: string; actual: string; zScore: string; severity: 'low' | 'medium' | 'high'; method: string;
}
export interface AlertChannel { id: string; channel: 'email' | 'slack'; target: string; scope: any; active: boolean; created_at: string; }

export interface ShowbackLine { key: Record<string, string>; total: number; services: Record<string, number>; }
export interface ShowbackStatement {
  month: string;
  currency: string;
  by: string[];
  totals: { grand: number; allocated: number; unallocated: number; coverage_pct: number; };
  lines: ShowbackLine[];
}

export interface FcPoint { day: string; pred: number; lo: number; hi: number; }

export interface DayPoint { day: string; cost: number; }



export interface StatementGroup { group: string; raw: number; allocated: number; share: number; }
export interface StatementMonth {
  month: string;
  total_raw: number;
  total_tagged: number;
  total_untagged: number;
  groups: StatementGroup[];
}
export interface StatementResp {
  key: string;
  mode: 'proportional' | 'none';
  from: string; to: string;
  months: StatementMonth[];
}

export interface ForecastResp {
  alpha: number;
  h: number;
  service: string | null;
  seasonal: number[];
  sigma: number;
  history: { day: string; cost: number }[];
  forecast: { day: string; pred: number; low80: number; high80: number; low95: number; high95: number }[];
}

export interface ForecastByServiceResp {
  alpha: number;
  h: number;
  services: string[];
  series: {
    service: string;
    history: { day: string; cost: number }[];
    forecast: { day: string; pred: number; low80: number; high80: number; low95: number; high95: number }[];
  }[];
  totals: { day: string; totalPred: number }[];
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

  tagScore(days: number) {
    return this.http.get<any>('/v1/tags/score', {
      params: { days },
      headers: this.headers
    });
  }


  // Alerts: channels CRUD + test
  listAlertChannels() { return this.http.get<AlertChannel[]>('/v1/alerts/channels', { headers: this.headers }); }

  createAlertChannel(dto: Partial<AlertChannel>) { return this.http.post<AlertChannel>('/v1/alerts/channels', dto, { headers: this.headers }); }

  updateAlertChannel(id: string, dto: Partial<AlertChannel>) { return this.http.put<AlertChannel>(`/v1/alerts/channels/${id}`, dto, { headers: this.headers }); }

  deleteAlertChannel(id: string) { return this.http.delete(`/v1/alerts/channels/${id}`, { headers: this.headers }); }

  testAlerts(message?: string) { return this.http.post<{ ok: true; sent: number }>(`/v1/alerts/test`, { message }, { headers: this.headers }); }


  showbackStatement(month: string, by: string[]) {
    const params: any = { month, by: by.join(',') };
    return this.http.get<ShowbackStatement>('/v1/showback/statement', { params, headers: this.headers });
  }


forecast(params: { alpha: number; h: number; service?: string }) {
  return this.http.get<ForecastResp>('/v1/overview/forecast', { params: params as any, headers: this.headers });
}

  statementsMonthly(params: { from: string; to: string; key: string; mode?: 'proportional' | 'none' }) {
    return this.http.get<StatementResp>('/v1/statements/monthly', { params: params as any, headers: this.headers });
  }
  downloadStatementsCsv(params: { from: string; to: string; key: string; mode?: 'proportional' | 'none' }) {
    return this.http.get('/v1/statements/monthly.csv', { params: params as any, headers: this.headers, responseType: 'blob' });
  }

listServices() {
  return this.http.get<string[]>('/v1/overview/services', { headers: this.headers });
}

forecastByService(params: { alpha: number; h: number; limit?: number; daysBack?: number }) {
  return this.http.get<ForecastByServiceResp>('/v1/overview/forecast/services', {
    params: params as any,
    headers: this.headers
  });
}

}
