import { Controller, Get, Header, Query, Req, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Pool } from 'pg';
import { AuthGuard } from '../../core/auth/auth.guard';

type Row = { month: string; group: string; cost: number };
type MonthBucket = {
  month: string;
  total_raw: number;
  total_tagged: number;
  total_untagged: number;
  groups: { group: string; raw: number; allocated: number; share: number }[];
};

function firstDay(yyyyMM: string) {
  const [y, m] = yyyyMM.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}
function addMonths(d: Date, k: number) {
  const nd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + k, 1));
  return nd;
}
function toYYYYMM(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

@Controller('v1/statements')
@UseGuards(AuthGuard)
export class StatementsController {
  constructor(private readonly pg: Pool) {}

  /**
   * Showback/Chargeback monthly statement
   * GET /v1/statements/monthly?from=2025-01&to=2025-06&key=team&mode=proportional
   * key = tag key to group by (e.g. team, project, owner)
   * mode:
   *   - proportional (default): distribute untagged across tagged groups by share
   *   - none: leave untagged as its own "UNALLOCATED" bucket
   */
  @Get('monthly')
  async monthly(
    @Req() req,
    @Query('from') from = toYYYYMM(addMonths(new Date(), -2)), // last 3 months by default
    @Query('to') to = toYYYYMM(new Date()),
    @Query('key') key = 'team',
    @Query('mode') mode: 'proportional' | 'none' = 'proportional',
  ) {
    const start = firstDay(from);
    const endExclusive = addMonths(firstDay(to), 1);

    const { rows } = await this.pg.query<Row>(
      `
      with base as (
        select
          date_trunc('month', usage_date)::date as m,
          nullif(trim((tags->>$3)::text), '') as grp,
          sum(unblended_cost)::numeric as cost
        from resource_usage_daily
        where org_id = $1
          and usage_date >= $2
          and usage_date <  $4
        group by 1, 2
      )
      select to_char(m, 'YYYY-MM') as month,
             coalesce(grp, 'UNALLOCATED') as "group",
             cost::float as cost
      from base
      order by 1, 2
      `,
      [req.orgId, start, key, endExclusive],
    );

    // Build complete month range
    const months: string[] = [];
    for (let d = new Date(start); d < endExclusive; d = addMonths(d, 1)) {
      months.push(toYYYYMM(d));
    }

    // Index by month
    const byMonth = new Map<string, Row[]>();
    for (const r of rows) {
      if (!byMonth.has(r.month)) byMonth.set(r.month, []);
      byMonth.get(r.month)!.push(r);
    }

    const out: MonthBucket[] = [];
    for (const m of months) {
      const items = byMonth.get(m) || [];
      const groupsRaw = items.map(i => ({ group: i.group, raw: i.cost }));
      const total_raw = groupsRaw.reduce((a, b) => a + b.raw, 0);

      // Separate tagged vs untagged
      const tagged = groupsRaw.filter(g => g.group !== 'UNALLOCATED');
      const untagged = groupsRaw.find(g => g.group === 'UNALLOCATED')?.raw ?? 0;
      const total_tagged = tagged.reduce((a, b) => a + b.raw, 0);
      const total_untagged = untagged;

      const result: MonthBucket['groups'] = [];

      if (mode === 'proportional' && total_tagged > 0 && total_untagged > 0) {
        for (const g of tagged) {
          const share = g.raw / total_tagged;
          const allocated = g.raw + share * total_untagged;
          result.push({
            group: g.group,
            raw: g.raw,
            allocated: Math.round(allocated * 100) / 100,
            share: Math.round(share * 10000) / 10000,
          });
        }
        // Optionally expose the left-over "UNALLOCATED" line as 0 (fully distributed)
      } else {
        // No distribution; keep UNALLOCATED as-is
        for (const g of groupsRaw) {
          result.push({
            group: g.group,
            raw: g.raw,
            allocated: Math.round(g.raw * 100) / 100,
            share: g.group === 'UNALLOCATED' || total_tagged === 0 ? 0 : Math.round((g.raw / total_tagged) * 10000) / 10000,
          });
        }
      }

      out.push({
        month: m,
        total_raw: Math.round(total_raw * 100) / 100,
        total_tagged: Math.round(total_tagged * 100) / 100,
        total_untagged: Math.round(total_untagged * 100) / 100,
        groups: result.sort((a, b) => b.allocated - a.allocated),
      });
    }

    return {
      key,
      mode,
      from,
      to,
      months: out,
    };
  }

  /** CSV export */
  @Get('monthly.csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="statements.csv"')
  async monthlyCsv(
    @Req() req,
    @Res() res: Response,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('key') key = 'team',
    @Query('mode') mode: 'proportional' | 'none' = 'proportional',
  ) {
    const json = await this.monthly(req, from, to, key, mode);
    const rows = ['month,group,raw,allocated,total_raw,total_untagged'];
    for (const m of json.months as MonthBucket[]) {
      for (const g of m.groups) {
        rows.push(
          [m.month, g.group.replaceAll(',', ';'), g.raw, g.allocated, m.total_raw, m.total_untagged].join(','),
        );
      }
    }
    res.send(rows.join('\n'));
  }
}
