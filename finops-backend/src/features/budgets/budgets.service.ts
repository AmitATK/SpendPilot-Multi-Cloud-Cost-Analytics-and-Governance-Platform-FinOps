import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from '../../entities/budget.entity';
import { BudgetEvent } from '../../entities/budget-event.entity';
import { ResourceUsageDaily } from '../../entities/resource-usage-daily.entity';
import { AlertsService } from '../alerts/alerts.service';

// Accept both camelCase and snake_case from the client
type UpsertBudgetDto = {
  name: string;
  scope?: Record<string, any>;
  monthlyLimit?: number;     // preferred
  monthly_limit?: number;    // tolerated
  thresholds?: number[];
  currency?: string;
};

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget) private budgets: Repository<Budget>,
    @InjectRepository(BudgetEvent) private events: Repository<BudgetEvent>,
    @InjectRepository(ResourceUsageDaily) private usage: Repository<ResourceUsageDaily>,
    private alerts: AlertsService,
  ) {}

  list(orgId: string) {
    return this.budgets.find({ where: { orgId, active: true }, order: { createdAt: 'DESC' } });
  }

  async upsert(orgId: string, dto: UpsertBudgetDto) {
    const limit = dto.monthlyLimit ?? dto.monthly_limit ?? 0;
    const b = this.budgets.create({
      orgId,
      name: dto.name,
      scope: dto.scope ?? {},
      monthlyLimit: String(limit),
      thresholds: dto.thresholds ?? [70, 90, 100],
      currency: dto.currency ?? 'INR',
      active: true,
    });
    return this.budgets.save(b);
  }

  async evaluate(orgId: string, onDate: Date) {
    const y = onDate.getUTCFullYear();
    const m = onDate.getUTCMonth() + 1;
    const periodStart = new Date(Date.UTC(y, m - 1, 1));
    const periodEnd = new Date(Date.UTC(y, m, 1));

    const budgets = await this.budgets.find({ where: { orgId, active: true } });

    for (const b of budgets) {
      const scope = JSON.stringify(b.scope || {});
      const rows = await this.usage.query(
        `select coalesce(sum(unblended_cost::numeric),0) as spend
           from resource_usage_daily
          where org_id = $1
            and usage_date >= $2 and usage_date < $3
            and ($4::jsonb = '{}'::jsonb or tags @> $4::jsonb)`,
        [orgId, periodStart, periodEnd, scope]
      );
      const spend = Number(rows[0].spend || 0);
      const limit = Number(b.monthlyLimit);
      const pct = limit > 0 ? Math.floor((spend / limit) * 100) : 0;

      for (const t of b.thresholds) {
        if (pct >= t) {
          const exists = await this.events.findOne({
            where: {
              budgetId: b.id,
              periodStart: periodStart.toISOString().slice(0, 10),
              threshold: t,
            },
          });
          if (!exists) {
            await this.events.save(this.events.create({
              orgId,
              budgetId: b.id,
              periodStart: periodStart.toISOString().slice(0, 10),
              threshold: t,
            }));
            await this.alerts.sendBudgetAlert(orgId, b, { spend, pct, threshold: t, periodStart });
          }
        }
      }
    }
  }
}
