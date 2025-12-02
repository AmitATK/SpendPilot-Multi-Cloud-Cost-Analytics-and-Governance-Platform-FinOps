import {
    Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards, BadRequestException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { AuthGuard } from '../../core/auth/auth.guard';
import { AlertsService } from './alerts.service';

type UUID = string;

interface PolicyRow {
    id: UUID;
    org_id: UUID;
    name: string;
    rule: any;
    channel_ids: UUID[] | null;
    active: boolean;
    created_at: string;
}

type CreateDto = {
    name: string;
    rule: any;
    channelIds?: UUID[];
    active?: boolean;
};

type UpdateDto = Partial<CreateDto>;

@Controller('v1/alerts/policies')
@UseGuards(AuthGuard)
export class AlertPoliciesController {
    constructor(
        private readonly pg: Pool,
        private readonly alerts: AlertsService,
    ) { }


    @Get()
    async list(@Req() req) {
        const { rows } = await this.pg.query<PolicyRow>(
            `select id, org_id, name, rule, channel_ids, active, created_at
         from alert_policies
        where org_id = $1
        order by created_at desc`,
            [req.orgId],
        );
        // normalize for UI
        return rows.map(r => ({
            id: r.id,
            name: r.name,
            rule: r.rule,
            channel_ids: r.channel_ids ?? [],
            channels: r.channel_ids ?? [], // UI tolerates either
            active: r.active,
            created_at: r.created_at,
        }));
    }

    @Post()
    async create(@Req() req, @Body() dto: CreateDto) {
        if (!dto?.name) throw new BadRequestException('name is required');
        if (dto.rule == null) throw new BadRequestException('rule is required');

        const channelIds = Array.isArray(dto.channelIds) ? dto.channelIds : [];
        const { rows } = await this.pg.query<PolicyRow>(
            `insert into alert_policies (org_id, name, rule, channel_ids, active)
       values ($1, $2, $3::jsonb, $4::uuid[], coalesce($5, true))
       returning id, org_id, name, rule, channel_ids, active, created_at`,
            [req.orgId, dto.name, JSON.stringify(dto.rule), channelIds, dto.active],
        );
        return rows[0];
    }

    @Put(':id')
    async update(@Req() req, @Param('id') id: UUID, @Body() dto: UpdateDto) {
        const sets: string[] = [];
        const args: any[] = [req.orgId, id];

        if (dto.name !== undefined) { sets.push(`name = $${args.length + 1}`); args.push(dto.name); }
        if (dto.rule !== undefined) { sets.push(`rule = $${args.length + 1}::jsonb`); args.push(JSON.stringify(dto.rule)); }
        if (dto.channelIds !== undefined) { sets.push(`channel_ids = $${args.length + 1}::uuid[]`); args.push(dto.channelIds ?? []); }
        if (dto.active !== undefined) { sets.push(`active = $${args.length + 1}`); args.push(dto.active); }

        if (sets.length === 0) {
            const { rows } = await this.pg.query(
                `select id, org_id, name, rule, channel_ids, active, created_at
           from alert_policies where org_id=$1 and id=$2`,
                args,
            );
            return rows[0];
        }

        const sql = `
      update alert_policies
         set ${sets.join(', ')}
       where org_id=$1 and id=$2
       returning id, org_id, name, rule, channel_ids, active, created_at`;
        const { rows } = await this.pg.query(sql, args);
        return rows[0];
    }

    @Delete(':id')
    async remove(@Req() req, @Param('id') id: UUID) {
        await this.pg.query(`delete from alert_policies where org_id=$1 and id=$2`, [req.orgId, id]);
        return { ok: true };
    }

    /* ------------------------------- Test -------------------------------- */

    @Post('test')
    async sendTest(@Req() req, @Body() body: { message?: string; channelIds?: UUID[] }) {
        const msg = body?.message || 'This is a FinOps test policy alert.';
        const count = await this.alerts.sendToChannels(req.orgId, body?.channelIds, msg);
        return { ok: true, sent: count };
    }
}
