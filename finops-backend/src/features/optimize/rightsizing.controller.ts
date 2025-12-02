import { Controller, Get, Query, Req, UseGuards, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthGuard } from '../../core/auth/auth.guard';

@Controller('v1/optimize')
@UseGuards(AuthGuard)
export class RightsizingController {
    constructor(@Inject(Pool) private readonly pg: Pool) { }


    @Get('rightsizing')
    async rightsizing(
        @Req() req,
        @Query('from') from: string,
        @Query('to') to: string,
        @Query('minP95') minP95Str = '50' // USD
    ) {
        const minP95 = Math.max(0, Number(minP95Str) || 50);


        // Aggregate daily cost by service within window
        const sql = `with daily as (
select usage_date as day, service, sum(unblended_cost) as cost
from resource_usage_daily
where org_id=$1 and usage_date between $2 and $3
group by 1,2
)
select service,
percentile_cont(0.50) within group (order by cost) as p50,
percentile_cont(0.95) within group (order by cost) as p95,
avg(cost) as avg
from daily
group by service
order by p95 desc nulls last`;


        const { rows } = await this.pg.query(sql, [req.orgId, from, to]);


        const suggestions = rows
            .filter(r => Number(r.p95 || 0) >= minP95)
            .map(r => {
                const p50 = Number(r.p50 || 0); const p95 = Number(r.p95 || 0);
                const ratio = p95 ? p50 / p95 : 0; // utilization proxy
                let action = 'observe'; let reason = 'Stable spend';
                if (ratio < 0.3) { action = 'rightsize'; reason = 'Median << peak spend'; }
                else if (ratio < 0.15) { action = 'potentially idle'; reason = 'Very low median vs peak'; }
                return {
                    service: r.service,
                    p50: Math.round(p50 * 100) / 100,
                    p95: Math.round(p95 * 100) / 100,
                    avg: Math.round(Number(r.avg || 0) * 100) / 100,
                    utilization_ratio: Math.round(ratio * 100) / 100,
                    recommendation: action,
                    reason
                };
            });


        return { from, to, suggestions };
    }
}