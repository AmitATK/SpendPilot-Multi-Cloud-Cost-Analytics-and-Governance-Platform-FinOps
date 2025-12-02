import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthGuard } from '../../core/auth/auth.guard';

type DailyPoint = { day: string; cost: number };
type ForecastPoint = {
  day: string;
  pred: number;
  up95: number;
  lo95: number;
  up80: number;
  lo80: number;
};

function toISODate(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

@Controller('v1/overview')
@UseGuards(AuthGuard)
export class OverviewController {
  constructor(private readonly pg: Pool) {}

  @Get('daily')
  async daily(
    @Req() req: any,
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
    return { series: rows };
  }

  /** Distinct cloud services for filter dropdown */
  @Get('services')
  async services(@Req() req: any) {
    const { rows } = await this.pg.query(
      `select distinct service
         from resource_usage_daily
        where org_id=$1
        order by service`,
      [req.orgId],
    );
    return rows.map(r => r.service).filter((s: string) => !!s);
  }

  /** EWMA + weekly multiplicative seasonality, with 80/95% bands */
  @Get('forecast')
  async forecast(
    @Req() req: any,
    @Query('alpha') alphaStr = '0.3',
    @Query('h') hStr = '30',
    @Query('service') service?: string, // optional single service; absent == aggregate
  ) {
    const alpha = Math.max(0.01, Math.min(0.99, Number(alphaStr) || 0.3));
    const h = Math.max(1, Math.min(90, parseInt(hStr, 10) || 30));

    const lookbackDays = 120;

    // history (aggregate vs single service)
    let rows;
    if (service && service.trim() !== '') {
      ({ rows } = await this.pg.query(
        `select usage_date as day, sum(unblended_cost) as cost
           from resource_usage_daily
          where org_id=$1 and service=$3
            and usage_date >= current_date - $2::int
          group by day
          order by day`,
        [req.orgId, lookbackDays, service],
      ));
    } else {
      ({ rows } = await this.pg.query(
        `select usage_date as day, sum(unblended_cost) as cost
           from resource_usage_daily
          where org_id=$1
            and usage_date >= current_date - $2::int
          group by day
          order by day`,
        [req.orgId, lookbackDays],
      ));
    }

    const history: DailyPoint[] = rows.map((r: any) => ({
      day: toISODate(r.day instanceof Date ? r.day : new Date(r.day)),
      cost: Number(r.cost || 0),
    }));

    // If no history, return empty forecast
    if (history.length === 0) {
      const today = new Date();
      const forecast: ForecastPoint[] = Array.from({ length: h }).map((_, i) => {
        const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        d.setUTCDate(d.getUTCDate() + i + 1);
        const day = toISODate(d);
        return { day, pred: 0, up95: 0, lo95: 0, up80: 0, lo80: 0 };
      });
      return { alpha, h, service: service || '', seasonal: [1,1,1,1,1,1,1], history, forecast };
    }

    // Weekly seasonality (Sun..Sat), normalized to mean 1.0
    const globalAvg = history.reduce((a, b) => a + b.cost, 0) / history.length;
    const sums = new Array<number>(7).fill(0);
    const counts = new Array<number>(7).fill(0);
    for (const p of history) {
      const dow = new Date(p.day + 'T00:00:00Z').getUTCDay();
      sums[dow] += p.cost; counts[dow] += 1;
    }
    let seasonal = sums.map((sum, i) => {
      const avg = counts[i] ? sum / counts[i] : globalAvg || 1;
      return globalAvg ? avg / globalAvg : 1;
    });
    const mean = seasonal.reduce((a, b) => a + b, 0) / 7 || 1;
    seasonal = seasonal.map(x => x / mean);

    // Multiplicative seasonal EWMA level + residuals
    let level = (() => {
      const firstDow = new Date(history[0].day + 'T00:00:00Z').getUTCDay();
      const denom = seasonal[firstDow] || 1;
      return history[0].cost / denom;
    })();

    const residuals: number[] = [];
    for (const p of history) {
      const dow = new Date(p.day + 'T00:00:00Z').getUTCDay();
      const expected = level * (seasonal[dow] || 1);
      residuals.push(p.cost - expected);
      // update level using de-seasonalized observation
      const x = p.cost / (seasonal[dow] || 1);
      level = alpha * x + (1 - alpha) * level;
    }

    // Residual sigma (fallback if too small)
    const meanRes = residuals.reduce((a, b) => a + b, 0) / residuals.length;
    const varRes = residuals.reduce((a, b) => a + (b - meanRes) ** 2, 0) / Math.max(1, residuals.length - 1);
    const sigma = Math.max(Math.sqrt(varRes), globalAvg * 0.05); // >= 5% of avg

    const z95 = 1.96;
    const z80 = 1.28;

    // Forecast next h days
    const start = new Date(history[history.length - 1].day + 'T00:00:00Z');
    const forecast: ForecastPoint[] = [];
    for (let i = 1; i <= h; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      const dow = d.getUTCDay();
      const pred = Math.max(0, Math.round(level * (seasonal[dow] || 1) * 100) / 100);
      const up95 = Math.max(0, Math.round((pred + z95 * sigma) * 100) / 100);
      const lo95 = Math.max(0, Math.round((pred - z95 * sigma) * 100) / 100);
      const up80 = Math.max(0, Math.round((pred + z80 * sigma) * 100) / 100);
      const lo80 = Math.max(0, Math.round((pred - z80 * sigma) * 100) / 100);
      forecast.push({ day: toISODate(d), pred, up95, lo95, up80, lo80 });
    }

    return {
      alpha,
      h,
      service: service || '',
      seasonal,
      history,
      forecast,
    };
  }
}
