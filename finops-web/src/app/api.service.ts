import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

/* === Types trimmed for brevity — keep yours as-is or these === */
export interface Budget { id: string; name: string; monthly_limit?: number | string; monthlyLimit?: number | string; thresholds: number[]; scope: any; currency: string; }
export interface AlertChannel { id: string; channel: 'email' | 'slack'; target: string; scope: any; active: boolean; created_at: string; }
export interface DayPoint { day: string; cost: number; }
export interface ForecastPoint { day: string; pred: number; up95?: number; lo95?: number; up80?: number; lo80?: number; }
export interface ForecastResponse { alpha: number; h: number; service: string | null; seasonal: number[]; history: DayPoint[]; forecast: ForecastPoint[]; }
export interface ForecastByServiceResp { alpha: number; h: number; services: string[]; series: { service: string; history: DayPoint[]; forecast: ForecastPoint[]; }[]; totals: { day: string; totalPred: number }[]; }
export interface TagCoverage { from: string; to: string; required: string[]; overall: { total: number; with_all: number; coverage_pct: number }; perTag: { tag: string; with_tag: number; total: number; coverage_pct: number }[]; byService: { service: string; with_all: number; total: number; coverage_pct: number }[]; samplesMissing: { day: string; service: string; tags: any; inferred_owner: string | null }[]; }
export interface StatementGroup { group: string; raw: number; allocated: number; share: number; }
export interface StatementMonth { month: string; total_raw: number; total_tagged: number; total_untagged: number; groups: StatementGroup[]; }
export interface StatementResp { key: string; mode: 'proportional' | 'none'; from: string; to: string; months: StatementMonth[]; }

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  /* ---------- tiny helpers used by settings/tags components ---------- */
  private toParams(params?: Record<string, unknown>): HttpParams {
    let p = new HttpParams();
    if (!params) return p;
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      p = p.set(k, String(v));
    }
    return p;
  }

  // Generic wrappers (your components call these in a few places)
  get<T>(url: string, params?: Record<string, unknown>): Observable<T> {
    return this.http.get<T>(url, { params: this.toParams(params) });
  }
  post<T>(url: string, body?: unknown): Observable<T> {
    return this.http.post<T>(url, body ?? {});
  }
  put<T>(url: string, body?: unknown): Observable<T> {
    return this.http.put<T>(url, body ?? {});
  }
  delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(url);
  }

  /* -------------------- Auth -------------------- */
  register(p: { email: string; password: string; name?: string; orgName?: string }) {
    return this.http.post<{ token: string; orgId: string; role: string }>('/auth/register', p);
  }
  login(p: { email: string; password: string }) {
    return this.http.post<{ token: string; orgId: string; role: string }>('/auth/login', p);
  }

  /* -------------------- Overview / Costs -------------------- */
  dailyCost(params: { from: string; to: string; service?: string }) {
    return this.get<any>('/v1/overview/daily', params);
  }
  listServices() { return this.get<string[]>('/v1/overview/services'); }

  /* -------------------- Budgets -------------------- */
  listBudgets() { return this.get<Budget[]>('/v1/budgets'); }
  createBudget(b: Partial<Budget>) { return this.post<Budget>('/v1/budgets', b); }

  /* -------------------- Mock & Cleanup (used by Dashboard/Cleanup) -------------------- */
  triggerMock(day: string) {              // ⬅️ restores method used by Dashboard
    return this.post('/v1/usage/mock', { day });
  }
  triggerCleanupScan() {                  // ⬅️ restores method used by Cleanup
    return this.post('/v1/cleanup/scan', {});
  }

  /* -------------------- Anomalies -------------------- */
  listAnomalies(params?: { from?: string; to?: string }) {
    return this.get<any>('/v1/anomalies', params);
  }
  anomaliesList(params?: { from?: string; to?: string }) { // alias
    return this.listAnomalies(params);
  }
  detectAnomalies(dayOrRange: { day?: string; from?: string; to?: string } | string) {
    const body = typeof dayOrRange === 'string' ? { day: dayOrRange } : dayOrRange;
    return this.post<any>('/v1/anomalies/detect', body);
  }

  /* -------------------- Ingest -------------------- */
  ingestCur(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ rows: number }>('/v1/ingest/aws/cur', fd);
  }
  ingestAwsCur(payload: any) { return this.post('/v1/ingest/aws/cur', payload); }

  /* -------------------- Tags -------------------- */
  tagScore(days: number) { return this.get<any>('/v1/tags/score', { days }); }
  tagCoverage(params: { from: string; to: string; required: string[] }) {
    return this.get<TagCoverage>('/v1/tags/coverage', {
      from: params.from, to: params.to, required: params.required.join(','),
    });
  }

  /* -------------------- Alerts: Channels -------------------- */
  listAlertChannels() { return this.get<AlertChannel[]>('/v1/alerts/channels'); }
  createAlertChannel(dto: Partial<AlertChannel>) { return this.post<AlertChannel>('/v1/alerts/channels', dto); }
  updateAlertChannel(id: string, dto: Partial<AlertChannel>) { return this.put<AlertChannel>(`/v1/alerts/channels/${id}`, dto); }
  deleteAlertChannel(id: string) { return this.delete(`/v1/alerts/channels/${id}`); }
  testAlerts(message?: string) { return this.post<{ ok: true; sent: number }>(`/v1/alerts/test`, { message }); }

  /* -------------------- Alerts: Policies -------------------- */
  listAlertPolicies() { return this.get<any[]>('/v1/alerts/policies'); }
  createAlertPolicy(dto: { name: string; rule: any; channelIds?: string[]; active?: boolean }) {
    return this.post('/v1/alerts/policies', dto);
  }
  updateAlertPolicy(id: string, dto: Partial<{ name: string; rule: any; channelIds: string[]; active: boolean }>) {
    return this.put(`/v1/alerts/policies/${id}`, dto);
  }
  deleteAlertPolicy(id: string) { return this.delete(`/v1/alerts/policies/${id}`); }
  testAlertPolicies(body: { message?: string; channelIds?: string[] }) {
    return this.post<{ ok: true; sent: number }>(`/v1/alerts/policies/test`, body);
  }
  testAlertPolicy(body: { eventType: string; scope?: any; message?: string; send?: boolean }) {
    return this.post<{ ok: boolean; channelIds: string[]; sent?: number }>(`/v1/alerts/policies/test`, body);
  }

  /* -------------------- Showback / Statements -------------------- */
  statementsMonthly(params: { from: string; to: string; key: string; mode?: 'proportional' | 'none' }) {
    return this.get<StatementResp>('/v1/statements/monthly', params);
  }
  downloadStatementsCsv(params: { from: string; to: string; key: string; mode?: 'proportional' | 'none' }) {
    return this.http.get('/v1/statements/monthly.csv', { params: this.toParams(params), responseType: 'blob' });
  }

  /* -------------------- Forecasts -------------------- */
  private normPoint(p: any): ForecastPoint {
    return {
      day: p.day,
      pred: Number(p.pred ?? p.yhat ?? 0),
      up95: p.up95 ?? p.high95 ?? p.hi95 ?? p.hi ?? p.high ?? p.upper95 ?? p.upper,
      lo95: p.lo95 ?? p.low95 ?? p.lo ?? p.low ?? p.lower95 ?? p.lower,
      up80: p.up80 ?? p.high80 ?? p.upper80,
      lo80: p.lo80 ?? p.low80 ?? p.lower80,
    };
  }

  forecast(params: { alpha: number; h: number; service?: string | null }) {
    const q: any = { alpha: params.alpha, h: params.h };
    if (params.service) q.service = params.service;
    return this.get<any>('/v1/overview/forecast', q).pipe(
      map((r: any): ForecastResponse => ({
        alpha: Number(r.alpha),
        h: Number(r.h),
        service: r.service ?? null,
        seasonal: Array.isArray(r.seasonal) ? r.seasonal : [],
        history: (Array.isArray(r.history) ? r.history : []).map((x: any) => ({ day: x.day, cost: Number(x.cost || 0) })),
        forecast: (Array.isArray(r.forecast) ? r.forecast : []).map((x: any) => this.normPoint(x)),
      }))
    );
  }

  forecastByService(params: { alpha: number; h: number; limit?: number; daysBack?: number }) {
    return this.get<any>('/v1/overview/forecast/services', params).pipe(
      map((r: any): ForecastByServiceResp => ({
        alpha: Number(r.alpha),
        h: Number(r.h),
        services: Array.isArray(r.services) ? r.services : [],
        series: (Array.isArray(r.series) ? r.series : []).map((s: any) => ({
          service: String(s.service),
          history: (Array.isArray(s.history) ? s.history : []).map((x: any) => ({ day: x.day, cost: Number(x.cost || 0) })),
          forecast: (Array.isArray(s.forecast) ? s.forecast : []).map((x: any) => this.normPoint(x)),
        })),
        totals: (Array.isArray(r.totals) ? r.totals : []).map((t: any) => ({ day: t.day, totalPred: Number(t.totalPred || 0) })),
      }))
    );
  }

  /* -------------------- Rightsizing -------------------- */
  rightsizing(params: { from: string; to: string; minP95?: number }) {
    return this.get<{ from: string; to: string; suggestions: any[] }>('/v1/optimize/rightsizing', params);
  }

  /* -------------------- Admin users -------------------- */
  listOrgUsers() { return this.get<any[]>('/v1/admin/users'); }
  updateUserRole(id: string, role: string) { return this.put<any>(`/v1/admin/users/${id}/role`, { role }); }

  /** Azure Cost export CSV */
  ingestAzure(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    // Do not set Content-Type; browser sets multipart boundary
    return this.http.post<{ rows: number }>('/v1/ingest/azure/cost', fd);
  }

  /** GCP Billing export CSV */
  ingestGcp(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ rows: number }>('/v1/ingest/gcp/billing', fd);
  }

}
