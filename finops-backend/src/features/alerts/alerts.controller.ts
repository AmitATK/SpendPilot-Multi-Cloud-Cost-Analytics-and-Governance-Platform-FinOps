import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Pool } from 'pg';
import { AuthGuard } from '../../core/auth/auth.guard';
import { AlertsService } from './alerts.service';

type UUID = string;
type Channel = 'email' | 'slack';

interface ChannelRow {
  id: UUID;
  org_id: UUID;
  channel: Channel;
  target: string;
  scope: any | null;
  active: boolean;
  created_at: string;
}

interface PolicyRow {
  id: UUID;
  org_id: UUID;
  name: string;
  rule: any;
  channel_ids: UUID[] | null;
  active: boolean;
  created_at: string;
}

type CreatePolicyDto = {
  name: string;
  rule: any;
  channelIds?: UUID[];
  active?: boolean;
};
type UpdatePolicyDto = Partial<CreatePolicyDto>;

@Controller('v1/alerts')
@UseGuards(AuthGuard)
export class AlertsController {
  constructor(
    private readonly pg: Pool,
    private readonly alerts: AlertsService,
  ) {}

  @Get('channels')
  async listChannels(@Req() req) {
    const { rows } = await this.pg.query<ChannelRow>(
      `select id, org_id, channel, target, scope, active, created_at
         from alert_channels
        where org_id=$1
        order by created_at desc`,
      [req.orgId],
    );
    return rows;
  }

  @Post('channels')
  async createChannel(
    @Req() req,
    @Body()
    dto: { channel: Channel; target: string; scope?: any; active?: boolean },
  ) {
    if (!dto?.channel) throw new BadRequestException('channel is required');
    if (!dto?.target) throw new BadRequestException('target is required');

    const { rows } = await this.pg.query<ChannelRow>(
      `insert into alert_channels (org_id, channel, target, scope, active)
       values ($1, $2, $3, $4::jsonb, coalesce($5,true))
       returning id, org_id, channel, target, scope, active, created_at`,
      [req.orgId, dto.channel, dto.target, dto.scope ?? null, dto.active],
    );
    return rows[0];
  }

  @Put('channels/:id')
  async updateChannel(
    @Req() req,
    @Param('id') id: UUID,
    @Body()
    dto: Partial<{
      channel: Channel;
      target: string;
      scope: any;
      active: boolean;
    }>,
  ) {
    const sets: string[] = [];
    const args: any[] = [req.orgId, id];
    if (dto.channel !== undefined) {
      sets.push(`channel=$${args.length + 1}`);
      args.push(dto.channel);
    }
    if (dto.target !== undefined) {
      sets.push(`target=$${args.length + 1}`);
      args.push(dto.target);
    }
    if (dto.scope !== undefined) {
      sets.push(`scope=$${args.length + 1}::jsonb`);
      args.push(JSON.stringify(dto.scope));
    }
    if (dto.active !== undefined) {
      sets.push(`active=$${args.length + 1}`);
      args.push(dto.active);
    }

    if (!sets.length) {
      const { rows } = await this.pg.query(
        `select id, org_id, channel, target, scope, active, created_at
           from alert_channels where org_id=$1 and id=$2`,
        args,
      );
      return rows[0];
    }

    const { rows } = await this.pg.query(
      `update alert_channels
          set ${sets.join(', ')}
        where org_id=$1 and id=$2
        returning id, org_id, channel, target, scope, active, created_at`,
      args,
    );
    return rows[0];
  }

  @Delete('channels/:id')
  async deleteChannel(@Req() req, @Param('id') id: UUID) {
    await this.pg.query(
      `delete from alert_channels where org_id=$1 and id=$2`,
      [req.orgId, id],
    );
    return { ok: true };
  }

  @Post('test')
  async sendTestToAll(@Req() req, @Body() body: { message?: string }) {
    const msg = body?.message || 'This is a FinOps test alert.';
    const count = await this.alerts.sendTest(req.orgId, msg);
    return { ok: true, sent: count };
  }

  @Get('policies')
  async listPolicies(@Req() req) {
    const { rows } = await this.pg.query<PolicyRow>(
      `select id, org_id, name, rule, channel_ids, active, created_at
         from alert_policies
        where org_id=$1
        order by created_at desc`,
      [req.orgId],
    );
    // normalize for UI
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      rule: r.rule,
      channel_ids: r.channel_ids ?? [],
      channels: r.channel_ids ?? [],
      active: r.active,
      created_at: r.created_at,
    }));
  }

  @Post('policies')
  async createPolicy(@Req() req, @Body() dto: CreatePolicyDto) {
    if (!dto?.name) throw new BadRequestException('name is required');
    if (dto.rule == null) throw new BadRequestException('rule is required');

    const channelIds = Array.isArray(dto.channelIds) ? dto.channelIds : [];
    const { rows } = await this.pg.query<PolicyRow>(
      `insert into alert_policies (org_id, name, rule, channel_ids, active)
       values ($1, $2, $3::jsonb, $4::uuid[], coalesce($5,true))
       returning id, org_id, name, rule, channel_ids, active, created_at`,
      [req.orgId, dto.name, JSON.stringify(dto.rule), channelIds, dto.active],
    );
    return rows[0];
  }

  @Put('policies/:id')
  async updatePolicy(
    @Req() req,
    @Param('id') id: UUID,
    @Body() dto: UpdatePolicyDto,
  ) {
    const sets: string[] = [];
    const args: any[] = [req.orgId, id];
    if (dto.name !== undefined) {
      sets.push(`name=$${args.length + 1}`);
      args.push(dto.name);
    }
    if (dto.rule !== undefined) {
      sets.push(`rule=$${args.length + 1}::jsonb`);
      args.push(JSON.stringify(dto.rule));
    }
    if (dto.channelIds !== undefined) {
      sets.push(`channel_ids=$${args.length + 1}::uuid[]`);
      args.push(dto.channelIds ?? []);
    }
    if (dto.active !== undefined) {
      sets.push(`active=$${args.length + 1}`);
      args.push(dto.active);
    }

    if (!sets.length) {
      const { rows } = await this.pg.query(
        `select id, org_id, name, rule, channel_ids, active, created_at
           from alert_policies where org_id=$1 and id=$2`,
        args,
      );
      return rows[0];
    }

    const { rows } = await this.pg.query(
      `update alert_policies
          set ${sets.join(', ')}
        where org_id=$1 and id=$2
        returning id, org_id, name, rule, channel_ids, active, created_at`,
      args,
    );
    return rows[0];
  }

  @Delete('policies/:id')
  async deletePolicy(@Req() req, @Param('id') id: UUID) {
    await this.pg.query(
      `delete from alert_policies where org_id=$1 and id=$2`,
      [req.orgId, id],
    );
    return { ok: true };
  }

  @Post('policies/test')
  async testPolicies(
    @Req() req,
    @Body() body: { message?: string; channelIds?: UUID[] },
  ) {
    const msg = body?.message || 'This is a FinOps test policy alert.';
    const sent = await this.alerts.sendToChannels(
      req.orgId,
      body?.channelIds,
      msg,
    );
    return { ok: true, sent };
  }
}
