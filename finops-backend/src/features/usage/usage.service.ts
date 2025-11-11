import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class UsageService {
  private log = new Logger(UsageService.name);
  constructor(private readonly pg: Pool) {}

  async insertMockDaily(orgId: string, day: string) {
    const client = await this.pg.connect();
    try {
      await client.query('begin');

      // Ensure we have a cloud account to attach costs to
      const { rows: acct } = await client.query(
        'select id from cloud_accounts where org_id=$1 limit 1',
        [orgId]
      );
      if (acct.length === 0) {
        throw new Error('No cloud account found for org. Seed cloud_accounts first (see migrations/002_seed.sql).');
      }
      const accountId: string = acct[0].id;

      const services = ['EC2', 'S3', 'Lambda', 'RDS'];
      for (const s of services) {
        const cost = Math.round((Math.random() * 5000 + 1000) * 100) / 100;

        // Add tags so the Tag Hygiene scorecard has data
        const tags = {
          owner: 'me@example.com',
          env: ['prod', 'staging', 'dev'][Math.floor(Math.random() * 3)],
          team: ['checkout', 'core', 'ml'][Math.floor(Math.random() * 3)],
          cost_center: 'CC-1001',
        };

        await client.query(
          `insert into resource_usage_daily
             (org_id, account_id, resource_id, service, usage_date, quantity, unit, unblended_cost, tags)
           values ($1, $2, null, $3, $4, 1, 'unit', $5, $6::jsonb)`,
          [orgId, accountId, s, day, cost, JSON.stringify(tags)]
        );
      }

      await client.query('commit');
    } catch (e) {
      await client.query('rollback');
      this.log.error(e);
      throw e;
    } finally {
      client.release();
    }
  }

  // Placeholder to import AWS CUR later
  async importAwsCur() { /* TODO */ }
}
