import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

const REQUIRED_KEYS = ['owner', 'env', 'team', 'cost_center'];
const VALID_ENVS = ['prod', 'staging', 'dev', 'qa'];

@Injectable()
export class TagsService {
  constructor(private readonly pg: Pool) {}

  async score(orgId: string, days = 30) {
    const requiredClause = REQUIRED_KEYS.map(k => `(tags ? '${k}')`).join(' and ');
    const missingSelect = REQUIRED_KEYS
      .map(k => `count(*) filter (where not (tags ? '${k}'))::int as missing_${k}`)
      .join(', ');

    const sql = `
      with u as (
        select coalesce(tags, '{}'::jsonb) as tags
          from resource_usage_daily
         where org_id = $1
           and usage_date >= current_date - $2::int
      )
      select
        count(*)::int as total,
        count(*) filter (where ${requiredClause})::int as fully_tagged,
        ${missingSelect},
        count(*) filter (where (tags ? 'env') and lower(tags->>'env') not in (${VALID_ENVS.map(v => `'${v}'`).join(', ')}))::int as invalid_env,
        count(*) filter (where (tags ? 'owner') and position('@' in tags->>'owner') = 0)::int as invalid_owner
      from u
    `;
    const { rows } = await this.pg.query(sql, [orgId, days]);
    const r: any = rows[0] || { total: 0, fully_tagged: 0 };
    const pct = r.total ? Math.round((r.fully_tagged / r.total) * 100) : 0;

    return {
      lookbackDays: days,
      required: REQUIRED_KEYS,
      coverage: { total: Number(r.total), fully_tagged: Number(r.fully_tagged), pct },
      missingByKey: Object.fromEntries(REQUIRED_KEYS.map(k => [k, Number(r[`missing_${k}`] || 0)])),
      invalid: { env: Number(r.invalid_env || 0), owner: Number(r.invalid_owner || 0) },
    };
  }
}
