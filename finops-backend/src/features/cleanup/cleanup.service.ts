import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceUsageDaily } from '../../entities/resource-usage-daily.entity';
import { CleanupSuggestion } from '../../entities/cleanup-suggestion.entity';

@Injectable()
export class CleanupService {
  constructor(
    @InjectRepository(ResourceUsageDaily) private usage: Repository<ResourceUsageDaily>,
    @InjectRepository(CleanupSuggestion) private suggestions: Repository<CleanupSuggestion>,
  ) {}

  /** Heuristic: services with zero cost in last N days -> 'unused' suggestions */
  async scanUnused(orgId: string, lookbackDays = 14) {
    const rows: { service: string }[] = await this.usage.query(
      `with svc as (
         select service, sum(unblended_cost::numeric) as c
           from resource_usage_daily
          where org_id=$1 and usage_date >= current_date - $2::int
          group by service
       ) select service from svc where coalesce(c,0) = 0`,
      [orgId, lookbackDays]
    );

    const toSave = rows.map((r) =>
      this.suggestions.create({
        orgId,
        // resourceId: undefined, // omit instead of null
        kind: 'unused',
        current: { service: r.service },
        proposed: { action: 'review-disable', service: r.service },
        estSavings: '0',
        status: 'open',
      }),
    );

    if (toSave.length) await this.suggestions.save(toSave);
    return { created: toSave.length };
  }
}
