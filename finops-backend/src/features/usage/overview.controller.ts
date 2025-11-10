import { BadRequestException, Controller, Get, Inject, Query, Req, UseGuards } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthGuard } from '../../core/auth/auth.guard';

type DailyRow = { day: string; service: string; cost: number };

function toISODate(d: Date) { return d.toISOString().slice(0, 10); }

@Controller('v1/overview')
@UseGuards(AuthGuard)
export class OverviewController {
  // If your DatabaseModule provides the pool as token 'PG' (as in our pack), keep @Inject('PG').
  // If you provide Pool directly, change to: constructor(@Inject(Pool) private readonly pg: Pool) {}
  constructor(@Inject('PG') private readonly pg: Pool) {}

  @Get('daily')
  async daily(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('service') service?: string,
  ) {
    // defaults: last 7 days (inclusive)
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 6 * 86_400_000);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid from/to date (use YYYY-MM-DD).');
    }

    const args: any[] = [req.orgId, toISODate(fromDate), toISODate(toDate)];
    let sql = `
      select usage_date as day, service, sum(unblended_cost)::numeric as cost
        from resource_usage_daily
       where org_id = $1
         and usage_date between $2::date and $3::date
    `;
    if (service) { sql += ` and service = $4`; args.push(service); }
    sql += ` group by day, service order by day`;

    const { rows } = await this.pg.query(sql, args);
    const series: DailyRow[] = rows.map((r: any) => ({
      day: (r.day instanceof Date ? r.day : new Date(r.day)).toISOString().slice(0, 10),
      service: r.service,
      cost: Number(r.cost || 0),
    }));
    return { series };
  }

  /** Simple EWMA + weekly seasonality forecast */
  @Get('forecast')
  async forecast(
    @Req() req: any,
    @Query('alpha') alphaStr = '0.3',
    @Query('h') hStr = '30',
  ) {
    const alpha = Math.max(0.01, Math.min(0.99, Number(alphaStr) || 0.3));
    const h = Math.max(1, Math.min(90, parseInt(hStr, 10) || 30));

    // Pull decent history for seasonality
    const lookbackDays = 180;
    const { rows } = await this.pg.query(
      `
      select usage_date as day, sum(unblended_cost) as cost
        from resource_usage_daily
       where org_id = $1
         and usage_date >= current_date - $2::int
       group by day
       order by day
      `,
      [req.orgId, lookbackDays],
    );

    type HistoryPoint = { day: string; cost: number };
    const history:HistoryPoint[] = rows.map((r: any) => ({
      day: (r.day instanceof Date ? r.day : new Date(r.day)).toISOString().slice(0, 10),
      cost: Number(r.cost || 0),
    }));

    // If no data, return zeros (prevents 404s / UI errors)
    if (history.length === 0) {
      const today = new Date();
      const forecast = Array.from({ length: h }, (_, i) => {
        const d = new Date(today); d.setUTCDate(d.getUTCDate() + (i + 1));
        return { day: toISODate(d), pred: 0 };
      });
      return { alpha, h, seasonal: [1, 1, 1, 1, 1, 1, 1], history, forecast };
    }

    // Weekly seasonality (Sun..Sat), normalized to mean==1.0
    const globalAvg = history.reduce((a, b) => a + b.cost, 0) / history.length || 0;
    const sums = new Array(7).fill(0);
    const counts = new Array(7).fill(0);
    for (const p of history) {
      const dow = new Date(p.day + 'T00:00:00Z').getUTCDay();
      sums[dow] += p.cost; counts[dow] += 1;
    }
    let seasonal = sums.map((sum, i) => {
      const mean = counts[i] ? sum / counts[i] : (globalAvg || 1);
      return globalAvg ? mean / globalAvg : 1;
    });
    const sMean = seasonal.reduce((a, b) => a + b, 0) / 7 || 1;
    seasonal = seasonal.map(x => x / sMean);

    // EWMA level
    let level = history[0].cost;
    for (let i = 1; i < history.length; i++) {
      level = alpha * history[i].cost + (1 - alpha) * level;
    }

    // Forecast next h days using level * seasonal[dow]
    type ForecastPoint = { day: string; pred: number };

    const lastDay = new Date(history[history.length - 1].day + 'T00:00:00Z');
    const forecast: ForecastPoint[] = [];
    for (let i = 1; i <= h; i++) {
      const d = new Date(lastDay); d.setUTCDate(d.getUTCDate() + i);
      const dow = d.getUTCDay();
      const pred = Math.round((level * seasonal[dow]) * 100) / 100;
      forecast.push({ day: toISODate(d), pred });
    }

    return { alpha, h, seasonal, history, forecast };
  }
}
