import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthGuard } from '../../core/auth/auth.guard';

type DailyRow = { day: string; service: string; cost: number };
type HistPt = { day: string; cost: number };
type FcstPt = { day: string; pred: number; low80: number; high80: number; low95: number; high95: number };

function toISODate(d: Date) { return d.toISOString().slice(0, 10); }

function computeSeasonality(history: HistPt[]) {
  if (!history.length) return new Array(7).fill(1);
  const sums = new Array(7).fill(0);
  const counts = new Array(7).fill(0);
  const globAvg = history.reduce((a, b) => a + b.cost, 0) / history.length || 1;
  for (const p of history) {
    const dow = new Date(p.day + 'T00:00:00Z').getUTCDay();
    sums[dow] += p.cost; counts[dow] += 1;
  }
  let s = sums.map((sum, i) => {
    const avg = counts[i] ? sum / counts[i] : globAvg;
    return globAvg ? avg / globAvg : 1;
  });
  const mean = s.reduce((a, b) => a + b, 0) / 7 || 1;
  return s.map(x => x / mean);
}

function ewmaForecastWithBands(history: HistPt[], alpha: number, h: number, baseDate?: Date) {
  const seasonal = computeSeasonality(history);

  // EWMA on deseasonalized values; collect residuals against seasonalized prediction
  let level = history.length ? history[0].cost : 0;
  const residuals: number[] = [];
  for (const p of history) {
    const dow = new Date(p.day + 'T00:00:00Z').getUTCDay();
    const predPrev = level * seasonal[dow];
    residuals.push(p.cost - predPrev);
    const deseasoned = seasonal[dow] ? p.cost / seasonal[dow] : p.cost;
    level = alpha * deseasoned + (1 - alpha) * level;
  }

  const meanRes = residuals.length ? residuals.reduce((a,b)=>a+b,0) / residuals.length : 0;
  const varRes  = residuals.length ? residuals.reduce((a,b)=>a+Math.pow(b-meanRes,2),0)/residuals.length : 0;
  const sigma   = Math.sqrt(varRes) || 0;

  const z80 = 1.2816, z95 = 1.96;

  const start = baseDate
    ? new Date(baseDate)
    : (history.length ? new Date(history[history.length-1].day + 'T00:00:00Z') : new Date());

  const forecast: FcstPt[] = [];
  for (let i=1; i<=h; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const dow = d.getUTCDay();
    const pred  = +(level * seasonal[dow]).toFixed(2);
    const low80 = Math.max(0, +(pred - z80 * sigma).toFixed(2));
    const high80= +(pred + z80 * sigma).toFixed(2);
    const low95 = Math.max(0, +(pred - z95 * sigma).toFixed(2));
    const high95= +(pred + z95 * sigma).toFixed(2);
    forecast.push({ day: toISODate(d), pred, low80, high80, low95, high95 });
  }

  return { seasonal, sigma, level, forecast };
}

@Controller('v1/overview')
@UseGuards(AuthGuard)
export class OverviewController {
  constructor(private readonly pg: Pool) {}

  @Get('daily')
  async daily(
    @Req() req,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('service') service?: string,
  ) {
    const args: any[] = [req.orgId, from, to];
    let sql = `select usage_date as day, service, sum(unblended_cost) as cost
                 from resource_usage_daily
                where org_id=$1 and usage_date between $2 and $3`;
    if (service) { sql += ` and service = $4`; args.push(service); }
    sql += ' group by day, service order by day';
    const { rows } = await this.pg.query(sql, args);
    return { series: rows as DailyRow[] };
  }

  @Get('services')
  async services(@Req() req) {
    const { rows } = await this.pg.query(
      `select distinct service from resource_usage_daily where org_id=$1 order by 1`,
      [req.orgId],
    );
    return rows.map(r => r.service as string);
  }

  /** Total forecast (optionally for a single service) with bands */
  @Get('forecast')
  async forecast(
    @Req() req,
    @Query('alpha') alphaStr = '0.3',
    @Query('h') hStr = '30',
    @Query('service') service?: string,
  ) {
    const alpha = Math.max(0.01, Math.min(0.99, Number(alphaStr) || 0.3));
    const h = Math.max(1, Math.min(90, parseInt(hStr, 10) || 30));

    const daysBack = 180;
    const args: any[] = [req.orgId, daysBack];
    let where = `where org_id=$1 and usage_date >= current_date - $2::int`;
    if (service) { where += ` and service=$3`; args.push(service); }

    const { rows } = await this.pg.query(
      `select usage_date as day, sum(unblended_cost) as cost
         from resource_usage_daily
         ${where}
        group by day
        order by day`,
      args,
    );

    const history: HistPt[] = rows.map(r => ({
      day: toISODate(r.day instanceof Date ? r.day : new Date(r.day)),
      cost: Number(r.cost || 0),
    }));

    const baseDate = history.length ? new Date(history[history.length-1].day + 'T00:00:00Z') : new Date();
    const { seasonal, sigma, forecast } = ewmaForecastWithBands(history, alpha, h, baseDate);
    return { alpha, h, service: service || null, seasonal, sigma, history, forecast };
  }

  /** NEW: per-service multi-series forecast (top services by recent spend) */
  @Get('forecast/services')
  async forecastByService(
    @Req() req,
    @Query('alpha') alphaStr = '0.3',
    @Query('h') hStr = '30',
    @Query('limit') limitStr = '6',         // top N services
    @Query('daysBack') daysBackStr = '180', // history window
  ) {
    const alpha = Math.max(0.01, Math.min(0.99, Number(alphaStr) || 0.3));
    const h = Math.max(1, Math.min(90, parseInt(hStr, 10) || 30));
    const limit = Math.max(1, Math.min(20, parseInt(limitStr, 10) || 6));
    const daysBack = Math.max(30, Math.min(365, parseInt(daysBackStr, 10) || 180));

    // Pick top services by spend in last 30 days
    const top = await this.pg.query(
      `with recent as (
         select service, sum(unblended_cost) as spend
           from resource_usage_daily
          where org_id=$1 and usage_date >= current_date - 30
          group by service
       )
       select service from recent order by spend desc nulls last limit $2`,
      [req.orgId, limit]
    );
    const services: string[] = top.rows.map(r => r.service).filter(Boolean);

    // Fetch history for each service
    const series: { service: string; history: HistPt[]; forecast: FcstPt[] }[] = [];
    const baseDates: Record<string, Date> = {};
    for (const svc of services) {
      const { rows } = await this.pg.query(
        `select usage_date as day, sum(unblended_cost) as cost
           from resource_usage_daily
          where org_id=$1
            and service=$2
            and usage_date >= current_date - $3::int
          group by day
          order by day`,
        [req.orgId, svc, daysBack]
      );
      const history: HistPt[] = rows.map(r => ({
        day: toISODate(r.day instanceof Date ? r.day : new Date(r.day)),
        cost: Number(r.cost || 0),
      }));
      baseDates[svc] = history.length ? new Date(history[history.length-1].day + 'T00:00:00Z') : new Date();
      const { forecast } = ewmaForecastWithBands(history, alpha, h, baseDates[svc]);
      series.push({ service: svc, history, forecast });
    }

    // Build totals for next h days by summing per-service preds (bands omitted for totals)
    const labels = new Set<string>();
    for (const s of series) s.forecast.forEach(p => labels.add(p.day));
    const days = Array.from(labels).sort();
    const totals = days.map(day => ({
      day,
      totalPred: series.reduce((acc, s) => acc + (s.forecast.find(p => p.day === day)?.pred ?? 0), 0),
    }));

    return { alpha, h, services, series, totals };
  }
}
