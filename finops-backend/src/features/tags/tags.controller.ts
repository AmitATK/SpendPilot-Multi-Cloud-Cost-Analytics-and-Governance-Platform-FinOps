import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthGuard } from '../../core/auth/auth.guard';

function toISO(d: Date | string) {
  const x = d instanceof Date ? d : new Date(d);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

@Controller('v1/tags')
@UseGuards(AuthGuard)
export class TagsController {
  constructor(private readonly pg: Pool) {}

  @Get('coverage')
  async coverage(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('required') requiredCsv?: string,
  ) {
    const today = new Date();
    const defTo = toISO(today);
    const defFrom = toISO(
      new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate() - 30,
        ),
      ),
    );
    const fromD = from || defFrom;
    const toD = to || defTo;

    const required = (requiredCsv || 'owner,env,team,cost_center')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // overall
    const overallQ = await this.pg.query(
      `select count(*)::int as total,
              sum(case when tags ?& $3::text[] then 1 else 0 end)::int as with_all
         from resource_usage_daily
        where org_id=$1 and usage_date between $2::date and $4::date`,
      [req.orgId, fromD, required, toD],
    );
    const overall = overallQ.rows[0] || { total: 0, with_all: 0 };
    const overallPct = overall.total
      ? (100 * overall.with_all) / overall.total
      : 0;

    // per-tag
    const perTagQ = await this.pg.query(
      `with keys as (select unnest($3::text[]) as tag)
       select k.tag,
              sum(case when r.tags ? k.tag then 1 else 0 end)::int as with_tag,
              count(*)::int as total
         from resource_usage_daily r
         cross join keys k
        where r.org_id=$1 and r.usage_date between $2::date and $4::date
        group by k.tag
        order by k.tag`,
      [req.orgId, fromD, required, toD],
    );
    const perTag = perTagQ.rows.map((r) => ({
      tag: r.tag,
      with_tag: Number(r.with_tag),
      total: Number(r.total),
      coverage_pct: r.total
        ? Math.round((10000 * r.with_tag) / r.total) / 100
        : 0,
    }));

    // by service
    const bySvcQ = await this.pg.query(
      `select coalesce(service,'(unknown)') as service,
              sum(case when tags ?& $3::text[] then 1 else 0 end)::int as with_all,
              count(*)::int as total
         from resource_usage_daily
        where org_id=$1 and usage_date between $2::date and $4::date
        group by service
        order by total desc`,
      [req.orgId, fromD, required, toD],
    );
    const byService = bySvcQ.rows.map((r) => ({
      service: r.service,
      with_all: Number(r.with_all),
      total: Number(r.total),
      coverage_pct: r.total
        ? Math.round((10000 * r.with_all) / r.total) / 100
        : 0,
    }));

    // sample rows missing at least one required tag
    const samplesQ = await this.pg.query(
      `select usage_date as day, service, tags
         from resource_usage_daily
        where org_id=$1 and usage_date between $2::date and $4::date
          and not (tags ?& $3::text[])
        order by usage_date desc
        limit 25`,
      [req.orgId, fromD, required, toD],
    );
    const samplesMissing = samplesQ.rows.map((r) => ({
      day: toISO(r.day),
      service: r.service || '(unknown)',
      tags: r.tags || {},
    }));

    // simple suggestions (infer owner if missing)
    const suggestions = samplesMissing.map((s) => {
      const t = s.tags || {};
      const inferred_owner =
        t.owner || t.created_by || t.creator || t.user || null;
      return { ...s, inferred_owner };
    });

    return {
      from: fromD,
      to: toD,
      required,
      overall: {
        total: overall.total,
        with_all: overall.with_all,
        coverage_pct: Math.round(overallPct * 100) / 100,
      },
      perTag,
      byService,
      samplesMissing: suggestions,
    };
  }
}
