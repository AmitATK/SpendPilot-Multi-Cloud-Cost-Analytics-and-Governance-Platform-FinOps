import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';

type Row = { day: string; service: string; cost: number };

@Injectable()
export class AnomaliesService {
  constructor(@Inject('PG') private pg: Pool) {}

  /**
   * Wrapper for legacy callers (jobs/scripts) that expect detectDaily(orgId, day).
   * We compute a baseline window before the given day, run detect(), then return only that day's anomalies.
   */
  async detectDaily(orgId: string, day: string, opts?: { window?: number; z?: number }) {
    const window = opts?.window ?? 14;     // look back 14 days by default
    const z = opts?.z ?? 2.0;              // default z-score cutoff
    const from = new Date(Date.parse(day) - (window - 1) * 24 * 3600_000).toISOString().slice(0, 10);
    const { anomalies } = await this.detect(orgId, from, day, z);
    return { anomalies: (anomalies || []).filter(a => a.day === day) };
  }

  /**
   * Main anomaly detection over a date range.
   */
  async detect(orgId: string, from: string, to: string, zCutoff = 2.0) {
    const { rows } = await this.pg.query<Row>(
      `select usage_date::text as day, service, sum(unblended_cost)::float as cost
         from resource_usage_daily
        where org_id=$1 and usage_date between $2 and $3
        group by usage_date, service
        order by usage_date asc`,
      [orgId, from, to]
    );

    const bySvc = new Map<string, Row[]>();
    for (const r of rows) {
      if (!bySvc.has(r.service)) bySvc.set(r.service, []);
      bySvc.get(r.service)!.push(r);
    }

    const anomalies: any[] = [];
    for (const [svc, series] of bySvc) {
      series.sort((a, b) => a.day.localeCompare(b.day));
      for (let i = 0; i < series.length; i++) {
        const prev = series.slice(Math.max(0, i - 7), i);
        if (prev.length < 3) continue;
        const mean = avg(prev.map(p => p.cost));
        const sd = stdev(prev.map(p => p.cost));
        const today = series[i];
        const yday = series[i - 1];
        const z = sd > 0 ? (today.cost - mean) / sd : 0;
        const yoy = yday ? (yday.cost > 0 ? (today.cost - yday.cost) / yday.cost : 0) : 0;

        if (z >= zCutoff || (yoy >= 0.8 && today.cost - (yday?.cost ?? 0) > 500)) {
          anomalies.push({
            day: today.day,
            service: svc,
            cost: today.cost,
            baseline_mean: round(mean),
            baseline_sd: round(sd),
            z: round(z, 2),
            jump_vs_prev: round(yoy * 100, 1),
          });
        }
      }
    }
    anomalies.sort((a, b) => b.day.localeCompare(a.day));
    return { anomalies };
  }
}

function avg(xs: number[]) { return xs.reduce((a, b) => a + b, 0) / xs.length; }
function stdev(xs: number[]) {
  const m = avg(xs);
  const v = xs.reduce((a, x) => a + (x - m) * (x - m), 0) / xs.length;
  return Math.sqrt(v);
}
function round(n: number, d = 0) { const k = Math.pow(10, d); return Math.round(n * k) / k; }
