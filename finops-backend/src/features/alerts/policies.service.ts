import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';

export type Policy = {
  id: string;
  org_id: string;
  name: string;
  scope: any;
  event_types: string[];
  channel_ids: string[];
  active: boolean;
  created_at: string;
};

@Injectable()
export class AlertPoliciesService {
  constructor(@Inject(Pool) private readonly pg: Pool) {}

  async list(orgId: string): Promise<Policy[]> {
    const { rows } = await this.pg.query(
      'select id, org_id, name, scope, event_types, channel_ids, active, created_at from alert_policies where org_id=$1 order by created_at desc',
      [orgId],
    );
    return rows;
  }

  async create(orgId: string, dto: Partial<Policy>) {
    const {
      name,
      scope = {},
      event_types = [],
      channel_ids = [],
      active = true,
    } = dto;
    const { rows } = await this.pg.query(
      `insert into alert_policies(org_id, name, scope, event_types, channel_ids, active)
values($1,$2,$3,$4,$5,$6)
returning id, org_id, name, scope, event_types, channel_ids, active, created_at`,
      [orgId, name, scope, event_types, channel_ids, active],
    );
    return rows[0];
  }

  async update(orgId: string, id: string, dto: Partial<Policy>) {
    const fields: string[] = [];
    const args: any[] = [orgId, id];
    let i = 3;
    for (const [k, v] of Object.entries(dto)) {
      fields.push(`${k}=$${i++}`);
      args.push(v);
    }
    const { rows } = await this.pg.query(
      `update alert_policies set ${fields.join(', ')} where org_id=$1 and id=$2
returning id, org_id, name, scope, event_types, channel_ids, active, created_at`,
      args,
    );
    return rows[0];
  }

  async remove(orgId: string, id: string) {
    await this.pg.query(
      'delete from alert_policies where org_id=$1 and id=$2',
      [orgId, id],
    );
    return { ok: true };
  }

  // naive scope match: all keys in policy.scope must equal the event scope
  matchesScope(policyScope: any, eventScope: any): boolean {
    if (!policyScope || Object.keys(policyScope).length === 0) return true;
    for (const [k, v] of Object.entries(policyScope)) {
      if (eventScope?.[k] !== v) return false;
    }
    return true;
  }

  async resolveChannels(
    orgId: string,
    eventType: string,
    eventScope: any,
  ): Promise<string[]> {
    const { rows } = await this.pg.query(
      'select channel_ids, scope, event_types from alert_policies where org_id=$1 and active=true',
      [orgId],
    );
    const ids = new Set<string>();
    for (const p of rows) {
      if (
        Array.isArray(p.event_types) &&
        p.event_types.includes(eventType) &&
        this.matchesScope(p.scope, eventScope)
      ) {
        for (const id of p.channel_ids || []) ids.add(id);
      }
    }
    return Array.from(ids);
  }
}
