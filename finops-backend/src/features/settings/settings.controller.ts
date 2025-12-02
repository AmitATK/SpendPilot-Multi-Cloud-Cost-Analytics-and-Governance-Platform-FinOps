import { Pool } from 'pg';
import { AuthGuard } from '../../core/auth/auth.guard';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';

type SettingsShape = {
  requiredTags?: string[];
  forecast?: { alpha?: number; h?: number };
  statements?: { topN?: number };
};

@UseGuards(AuthGuard)
@Controller('v1/settings')
export class SettingsController {
  constructor(private readonly pg: Pool) {}

  private defaults(): Required<SettingsShape> {
    return {
      requiredTags: ['owner', 'env', 'team', 'cost_center'],
      forecast: { alpha: 0.3, h: 30 },
      statements: { topN: 5 },
    };
  }

  @Get()
  async getAll(@Req() req) {
    const { rows } = await this.pg.query(
      `select key, value from org_settings where org_id=$1`,
      [req.orgId],
    );
    const d = this.defaults();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const merged: SettingsShape = {
      requiredTags: map.requiredTags ?? d.requiredTags,
      forecast: { ...d.forecast, ...(map.forecast ?? {}) },
      statements: { ...d.statements, ...(map.statements ?? {}) },
    };
    return { settings: merged };
  }

  @Put()
  async upsertAll(@Req() req, @Body() body: { settings: SettingsShape }) {
    // only ADMIN can change org settings
    if ((req.role ?? '').toUpperCase() !== 'ADMIN') {
      throw new ForbiddenException('Only ADMIN can update settings');
    }
    const s = body?.settings ?? {};
    const entries: Array<[string, any]> = [];
    if (s.requiredTags) entries.push(['requiredTags', s.requiredTags]);
    if (s.forecast) entries.push(['forecast', s.forecast]);
    if (s.statements) entries.push(['statements', s.statements]);

    for (const [key, value] of entries) {
      await this.pg.query(
        `insert into org_settings(org_id, key, value, updated_at)
           values($1, $2, $3::jsonb, now())
         on conflict (org_id, key)
         do update set value = $3::jsonb, updated_at = now()`,
        [req.orgId, key, JSON.stringify(value)],
      );
    }
    return { ok: true };
  }
}
