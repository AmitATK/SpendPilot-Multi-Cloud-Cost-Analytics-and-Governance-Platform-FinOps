import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

type StatementLine = {
  key: Record<string, string>;
  total: number;
  services: Record<string, number>;
};

type Statement = {
  month: string;
  currency: string;
  by: string[];
  totals: {
    grand: number;
    allocated: number;
    unallocated: number;
    coverage_pct: number;
  };
  lines: StatementLine[];
};

const SAFE_KEY = /^[a-zA-Z0-9_]{1,30}$/;
const DEFAULT_BY = ['team'];
const ALLOWED_BY = new Set(['team','cost_center','env','project','owner']);

@Injectable()
export class ShowbackService {
  constructor(private readonly pg: Pool) {}

  async statement(orgId: string, month: string, byKeys: string[]): Promise<Statement> {
    // sanitize by-keys (only allowed + safe)
    const by = (byKeys?.length ? byKeys : DEFAULT_BY)
      .filter(k => SAFE_KEY.test(k) && ALLOWED_BY.has(k));
    if (by.length === 0) by.push('team');

    // range for YYYY-MM
    const start = new Date(`${month}-01T00:00:00Z`);
    if (isNaN(start.getTime())) throw new Error('Invalid month format. Expected YYYY-MM');
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));

    // pull currency (first seen) and totals/coverage
    const totalsSql = `
      select
        coalesce(max(currency), 'INR') as currency,
        sum(unblended_cost)::numeric as grand,
        sum(unblended_cost) filter (where ${by.map(k => `(coalesce(tags->>'${k}','') <> '')`).join(' and ')})::numeric as allocated
      from resource_usage_daily
      where org_id = $1 and usage_date >= $2 and usage_date < $3
    `;
    const totalsRes = await this.pg.query(totalsSql, [orgId, start, end]);
    const currency = String(totalsRes.rows[0]?.currency || 'INR');
    const grand = Number(totalsRes.rows[0]?.grand || 0);
    const allocated = Number(totalsRes.rows[0]?.allocated || 0);
    const unallocated = Math.max(0, grand - allocated);
    const coverage_pct = grand > 0 ? Math.round((allocated / grand) * 1000) / 10 : 0; // one decimal

    // group-by rows (by-keys + service)
    const byExprAliased = by
      .map(k => `coalesce(tags->>'${k}','UNALLOCATED') as "${k}"`)
      .join(', ');
    const byExprRaw = by
      .map(k => `coalesce(tags->>'${k}','UNALLOCATED')`)
      .join(', ');

    const sql = `
      with base as (
        select service, unblended_cost::numeric as cost, tags
          from resource_usage_daily
         where org_id=$1 and usage_date >= $2 and usage_date < $3
      )
      select ${byExprAliased}${by.length ? ',' : ''} service, sum(cost)::numeric as cost
        from base
       group by ${byExprRaw}${by.length ? ',' : ''} service
       order by ${by.map((_,i) => (i+1)).join(', ')}, ${by.length ? by.length+1 : 1}
    `;
    const { rows } = await this.pg.query(sql, [orgId, start, end]);

    // shape into lines
    const map = new Map<string, StatementLine>();
    for (const r of rows as any[]) {
      const keyObj: Record<string, string> = {};
      for (const k of by) keyObj[k] = r[k];
      const service = String(r.service);
      const cost = Number(r.cost || 0);
      const key = JSON.stringify(keyObj);
      if (!map.has(key)) map.set(key, { key: keyObj, total: 0, services: {} });
      const line = map.get(key)!;
      line.total += cost;
      line.services[service] = (line.services[service] || 0) + cost;
    }
    const lines = Array.from(map.values()).sort((a,b) => b.total - a.total);

    return { month, currency, by, totals: { grand, allocated, unallocated, coverage_pct }, lines };
  }
}
