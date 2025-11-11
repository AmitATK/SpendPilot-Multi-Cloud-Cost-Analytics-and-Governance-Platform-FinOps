import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Pool } from 'pg';

@Injectable()
export class AlertsService {
  private mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 1025),
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });

  constructor(private pg: Pool) {}

  /* ===== CRUD for alert_channels ===== */

  async listChannels(orgId: string) {
    const { rows } = await this.pg.query(
      `select id, org_id, channel, target, scope, active, created_at
         from alert_channels
        where org_id=$1
        order by created_at desc`,
      [orgId]
    );
    return rows;
  }

  async createChannel(orgId: string, dto: { channel: 'email' | 'slack'; target: string; scope?: any; active?: boolean }) {
    if (!dto?.channel || !dto?.target) throw new Error('channel and target are required');
    const { rows } = await this.pg.query(
      `insert into alert_channels(org_id, channel, target, scope, active)
       values($1,$2,$3,$4,$5)
       returning id, org_id, channel, target, scope, active, created_at`,
      [orgId, dto.channel, dto.target, dto.scope || {}, dto.active ?? true]
    );
    return rows[0];
  }

  async updateChannel(
    orgId: string,
    id: string,
    dto: Partial<{ channel: 'email' | 'slack'; target: string; scope: any; active: boolean }>
  ) {
    // Build dynamic update
    const fields: string[] = [];
    const args: any[] = [];
    let i = 1;

    const set = (col: string, val: any) => {
      fields.push(`${col}=$${++i}`);
      args.push(val);
    };

    args.push(orgId); // $1
    if (dto.channel) set('channel', dto.channel);
    if (dto.target !== undefined) set('target', dto.target);
    if (dto.scope !== undefined) set('scope', dto.scope);
    if (dto.active !== undefined) set('active', dto.active);

    if (fields.length === 0) {
      const { rows } = await this.pg.query(
        `select id, org_id, channel, target, scope, active, created_at
           from alert_channels where org_id=$1 and id=$2`,
        [orgId, id]
      );
      return rows[0];
    }

    const sql = `
      update alert_channels
         set ${fields.join(', ')}
       where org_id=$1 and id=$${++i}
       returning id, org_id, channel, target, scope, active, created_at
    `;
    args.push(id);

    const { rows } = await this.pg.query(sql, args);
    return rows[0];
  }

  async deleteChannel(orgId: string, id: string) {
    await this.pg.query(`delete from alert_channels where org_id=$1 and id=$2`, [orgId, id]);
  }

  /* ===== Target resolution + senders ===== */

  async targets(orgId: string, _scope: any) {
    const { rows } = await this.pg.query(
      `select * from alert_channels where org_id=$1 and active=true`,
      [orgId]
    );
    return rows;
  }

  async sendBudgetAlert(orgId: string, budget: any, ctx: { spend: number; pct: number; threshold: number; periodStart: Date; }) {
    const channels = await this.targets(orgId, budget.scope);
    const subject = `Budget ${budget.name}: ${ctx.threshold}% threshold crossed (${ctx.pct}% used)`;
    const text = `Budget: ${budget.name}
Scope: ${JSON.stringify(budget.scope)}
Spend: ${ctx.spend} ${budget.currency}
Limit: ${budget.monthly_limit} ${budget.currency}
Usage: ${ctx.pct}%
Period: ${ctx.periodStart.toISOString().slice(0,10)}`;

    let sent = 0;
    for (const ch of channels) sent += await this.sendViaChannel(ch, subject, text);
    return sent;
  }

  async sendTest(orgId: string, message: string) {
    const channels = await this.targets(orgId, {});
    let sent = 0;
    for (const ch of channels) {
      sent += await this.sendViaChannel(ch, 'FinOps Test Alert', message);
    }
    return sent;
  }

  private async sendViaChannel(ch: any, subject: string, text: string) {
    if (ch.channel === 'email') {
      await this.mailer.sendMail({ from: process.env.SMTP_FROM, to: ch.target, subject, text });
      return 1;
    }
    if (ch.channel === 'slack') {
      const webhook = ch.target || process.env.SLACK_WEBHOOK;
      if (!webhook) return 0;
      await fetch(webhook as string, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `*${subject}*\n${text}` }),
      });
      return 1;
    }
    return 0;
  }
}
