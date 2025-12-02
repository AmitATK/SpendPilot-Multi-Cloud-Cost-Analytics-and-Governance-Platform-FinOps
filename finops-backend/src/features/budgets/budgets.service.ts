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
  monthlyLimit?: number;
  monthly_limit?: number;
  thresholds?: number[];
  currency?: string;
};

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget) private readonly budgets: Repository<Budget>,
    @InjectRepository(BudgetEvent)
    private readonly events: Repository<BudgetEvent>,
    @InjectRepository(ResourceUsageDaily)
    private readonly usage: Repository<ResourceUsageDaily>,
    private readonly alerts: AlertsService,
  ) {}

  list(orgId: string) {
    return this.budgets.find({
      where: { orgId, active: true },
      order: { createdAt: 'DESC' },
    });
  }

  async upsert(orgId: string, dto: UpsertBudgetDto) {
    const limitNum = Number(dto.monthlyLimit ?? dto.monthly_limit ?? 0) || 0;

    const budget = this.budgets.create({
      orgId,
      name: dto.name,
      scope: dto.scope ?? {},
      monthlyLimit: (typeof ({} as Budget).monthlyLimit === 'string')
        ? (String(limitNum) as any)
          : (limitNum as any),
      thresholds: (dto.thresholds && dto.thresholds.length ? dto.thresholds : [70, 90, 100]).sort((a, b) => a - b),
      currency: dto.currency ?? 'INR',
      active: true,
    });

    return this.budgets.save(budget);
  }

  /**
   * Evaluate all active budgets for the current month of `onDate`.
   * Emits a BudgetEvent once per (budget, month, threshold) and sends an alert.
   */
  async evaluate(orgId: string, onDate: Date) {
    const y = onDate.getUTCFullYear();
    const m = onDate.getUTCMonth();               // 0-based
    const periodStart = new Date(Date.UTC(y, m, 1));
    const periodEnd = new Date(Date.UTC(y, m + 1, 1));
    const periodKey = toYMD(periodStart);       // 'YYYY-MM-DD'

    const budgets = await this.budgets.find({ where: { orgId, active: true } });

    for (const b of budgets) {
      // Build dynamic SQL for scope:
      // - scope.service → filter by `service` column
      // - remaining keys → treated as tag filters: `tags @> jsonb`
      const scope = (b.scope ?? {}) as Record<string, any>;
      const args: any[] = [orgId, periodStart, periodEnd];
      const where: string[] = [
        `org_id = $1`,
        `usage_date >= $2`,
        `usage_date < $3`,
      ];

      // Service filter (if provided)
      let serviceIdx: number | null = null;
      if (scope.service) {
        serviceIdx = args.length + 1;
        where.push(`service = $${serviceIdx}`);
        args.push(String(scope.service));
      }

      // Tag filter (remaining keys)
      const tagScope = { ...scope };
      delete tagScope.service;
      if (Object.keys(tagScope).length > 0) {
        const jsonIdx = args.length + 1;
        where.push(`tags @> $${jsonIdx}::jsonb`);
        args.push(JSON.stringify(tagScope));
      }

      const sql = `
        SELECT COALESCE(SUM(unblended_cost::numeric), 0) AS spend
          FROM resource_usage_daily
         WHERE ${where.join(' AND ')}
      `;

      const { rows } = await this.usage.query(sql, args);
      const mtdSpend = Number(rows?.[0]?.spend ?? 0);
      const limit = Number(b.monthlyLimit as any) || 0;
      const pct = limit > 0 ? Math.floor((mtdSpend / limit) * 100) : 0;

      // Fire events once per threshold per period
      for (const t of (b.thresholds ?? [])) {
        if (pct >= t) {
          const exists = await this.events.findOne({
            where: {
              budgetId: b.id,
              periodStart: periodKey,
              threshold: t,
            },
          });
          if (!exists) {
            await this.events.save(
              this.events.create({
                orgId,
                budgetId: b.id,
                periodStart: periodKey,
                threshold: t,
              }),
            );

            // Use AlertsService signature from our alerts implementation
            await this.alerts.sendBudgetAlert(orgId, {
              name: b.name,
              mtd: mtdSpend,
              limit,
              pct,
              threshold: t,
            });
          }
        }
      }
    }
  }
}

/* ------------------------------ helpers --------------------------------- */

function toYMD(d: Date): string {
  // Always UTC date key
  return d.toISOString().slice(0, 10);
}
