import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthGuard } from '../../core/auth/auth.guard';

@Controller('v1/settings')
@UseGuards(AuthGuard)
export class SettingsController {
  constructor(private readonly pg: Pool) {}

  private async columns(): Promise<string[]> {
    const { rows } = await this.pg.query(`
      select column_name
      from information_schema.columns
      where table_schema='public' and table_name='org_settings'
    `);
    return rows.map(r => r.column_name);
  }

  @Get()
  async getAll(@Req() req) {
    const orgId = req.orgId;
    const cols = await this.columns();

    // preferred: single row JSONB
    if (cols.includes('settings')) {
      const { rows } = await this.pg.query(`select settings from org_settings where org_id=$1`, [orgId]);
      return rows[0]?.settings ?? {};
    }

    // legacy: key/value rows
    if (cols.includes('key') && cols.includes('value')) {
      const { rows } = await this.pg.query(`select key, value from org_settings where org_id=$1`, [orgId]);
      const out: any = {};
      for (const r of rows) out[r.key] = r.value;
      return out;
    }

    // no usable columns
    return {};
  }

  @Put()
  async putAll(@Req() req, @Body() body: { settings: Record<string, any> }) {
    const orgId = req.orgId;
    const settings = body?.settings ?? {};
    const cols = await this.columns();

    // preferred: upsert JSONB
    if (cols.includes('settings')) {
      await this.pg.query(
        `insert into org_settings (org_id, settings, updated_at)
         values ($1, $2::jsonb, now())
         on conflict (org_id)
         do update set settings=excluded.settings, updated_at=now()`,
        [orgId, JSON.stringify(settings)],
      );
      return { ok: true };
    }

    // legacy: rewrite key/value rows
    if (cols.includes('key') && cols.includes('value')) {
      await this.pg.query(`delete from org_settings where org_id=$1`, [orgId]);
      const entries = Object.entries(settings);
      for (const [k, v] of entries) {
        await this.pg.query(
          `insert into org_settings (org_id, key, value, updated_at)
           values ($1, $2, $3::jsonb, now())`,
          [orgId, k, JSON.stringify(v)],
        );
      }
      return { ok: true };
    }

    // if table exists but lacks 'settings', create it on the fly (safe idempotent)
    await this.pg.query(`
      do $$
      begin
        if not exists (
          select 1 from information_schema.columns
          where table_schema='public' and table_name='org_settings' and column_name='settings'
        ) then
          alter table org_settings add column settings jsonb not null default '{}'::jsonb;
        end if;
      end$$;
    `);

    await this.pg.query(
      `insert into org_settings (org_id, settings, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (org_id)
       do update set settings=excluded.settings, updated_at=now()`,
      [orgId, JSON.stringify(settings)],
    );
    return { ok: true };
  }
}
