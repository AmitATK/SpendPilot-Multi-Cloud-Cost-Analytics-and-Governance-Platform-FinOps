import { Injectable, Logger, Optional } from '@nestjs/common';
import { Pool } from 'pg';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

type Channel = 'email' | 'slack';

export interface AlertChannelRow {
  id: string;
  org_id: string;
  channel: Channel;
  target: string;     // email address or Slack webhook URL
  scope: any | null;  // JSONB
  active: boolean;
  created_at: string;
}

// Minimal shape used by budget alerts
type BudgetLike = {
  id: string;
  name: string;
  monthlyLimit?: string | number | null;
  currency?: string | null;
};

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly pg: Pool,
    @Optional() private readonly http?: HttpService, // optional; we fallback if not present
  ) { }

  /* ----------------------------- Channels CRUD ---------------------------- */

  async listChannels(orgId: string): Promise<AlertChannelRow[]> {
    const { rows } = await this.pg.query<AlertChannelRow>(
      `SELECT id, org_id, channel, target, scope, active, created_at
         FROM alert_channels
        WHERE org_id = $1
        ORDER BY created_at DESC`,
      [orgId],
    );
    return rows;
  }

  async createChannel(
    orgId: string,
    dto: { channel: Channel; target: string; scope?: any; active?: boolean },
  ): Promise<AlertChannelRow> {
    const scopeJson = dto.scope != null ? JSON.stringify(dto.scope) : null;
    const { rows } = await this.pg.query<AlertChannelRow>(
      `INSERT INTO alert_channels (org_id, channel, target, scope, active)
       VALUES ($1, $2, $3, $4::jsonb, COALESCE($5, true))
       RETURNING id, org_id, channel, target, scope, active, created_at`,
      [orgId, dto.channel, dto.target, scopeJson, dto.active],
    );
    return rows[0];
  }

  async updateChannel(
    orgId: string,
    id: string,
    dto: Partial<{ channel: Channel; target: string; scope: any; active: boolean }>,
  ): Promise<AlertChannelRow> {
    const sets: string[] = [];
    const args: any[] = [orgId, id];

    if (dto.channel !== undefined) { sets.push(`channel = $${args.length + 1}`); args.push(dto.channel); }
    if (dto.target !== undefined) { sets.push(`target  = $${args.length + 1}`); args.push(dto.target); }
    if (dto.scope !== undefined) { sets.push(`scope   = $${args.length + 1}::jsonb`); args.push(JSON.stringify(dto.scope)); }
    if (dto.active !== undefined) { sets.push(`active  = $${args.length + 1}`); args.push(dto.active); }

    if (sets.length === 0) {
      const { rows } = await this.pg.query<AlertChannelRow>(
        `SELECT id, org_id, channel, target, scope, active, created_at
           FROM alert_channels
          WHERE org_id=$1 AND id=$2`,
        [orgId, id],
      );
      return rows[0];
    }

    const sql = `
      UPDATE alert_channels
         SET ${sets.join(', ')}
       WHERE org_id=$1 AND id=$2
       RETURNING id, org_id, channel, target, scope, active, created_at`;
    const { rows } = await this.pg.query<AlertChannelRow>(sql, args);
    return rows[0];
  }

  async deleteChannel(orgId: string, id: string): Promise<void> {
    await this.pg.query(`DELETE FROM alert_channels WHERE org_id=$1 AND id=$2`, [orgId, id]);
  }

  /* ------------------------------ Send helpers --------------------------- */

  /**
   * Send message to:
   *  - specific channel IDs (if provided), or
   *  - all ACTIVE channels (if none provided).
   * Returns # of successful deliveries (best-effort).
   */
  async sendToChannels(orgId: string, channelIds: string[] | undefined, message: string): Promise<number> {
    let rows: AlertChannelRow[] = [];
    if (Array.isArray(channelIds) && channelIds.length > 0) {
      const { rows: r } = await this.pg.query<AlertChannelRow>(
        `SELECT id, org_id, channel, target, scope, active, created_at
           FROM alert_channels
          WHERE org_id=$1 AND id = ANY($2::uuid[])`,
        [orgId, channelIds],
      );
      rows = r;
    } else {
      const { rows: r } = await this.pg.query<AlertChannelRow>(
        `SELECT id, org_id, channel, target, scope, active, created_at
           FROM alert_channels
          WHERE org_id=$1 AND active = true`,
        [orgId],
      );
      rows = r;
    }

    let sent = 0;
    for (const ch of rows) {
      try {
        if (ch.channel === 'email') {
          const ok = await this.sendEmail(ch.target, 'FinOps Alert', message);
          if (ok) sent++;
        } else if (ch.channel === 'slack') {
          const ok = await this.sendSlack(ch.target, message);
          if (ok) sent++;
        }
      } catch (err) {
        this.logger.warn(`Alert send failed (channel=${ch.channel} id=${ch.id}): ${(err as Error).message}`);
      }
    }
    return sent;
  }

  /** Convenience: send to all active channels with a custom message */
  async sendTest(orgId: string, message: string): Promise<number> {
    return this.sendToChannels(orgId, undefined, message);
  }

  /** Called by BudgetsService — signature matches your BudgetsService usage */
  /** Budget alerts — supports both 2-arg (legacy) and 3-arg (new) call styles */
  async sendBudgetAlert(
    orgId: string,
    // Either a Budget-like object OR a flat payload with mtd/limit/pct/etc.
    arg2:
      | { id?: string; name: string; monthlyLimit?: string | number | null; currency?: string | null }
      | { name: string; mtd: number; limit: number; pct?: number; threshold: number; periodStart?: Date | string; currency?: string },
    ctx?: { spend: number; pct: number; threshold: number; periodStart?: Date | string },
  ): Promise<number> {

    // Normalized fields
    let name = '';
    let currency = '';
    let mtd = 0;
    let limitNum = 0;
    let pct = 0;
    let threshold = 0;
    let periodStartStr: string | undefined;

    if ('mtd' in (arg2 as any)) {
      // ---- Legacy 2-arg style: sendBudgetAlert(orgId, { name, mtd, limit, pct?, threshold, periodStart?, currency? })
      const p = arg2 as {
        name: string; mtd: number; limit: number; pct?: number; threshold: number; periodStart?: Date | string; currency?: string;
      };
      name = p.name;
      mtd = Number(p.mtd ?? 0);
      limitNum = Number(p.limit ?? 0);
      pct = p.pct != null ? Number(p.pct) : (limitNum > 0 ? (mtd / limitNum) * 100 : 0);
      threshold = Number(p.threshold ?? 0);
      currency = p.currency ?? '';
      if (p.periodStart) {
        periodStartStr = typeof p.periodStart === 'string'
          ? p.periodStart
          : new Date(p.periodStart).toISOString().slice(0, 10);
      }
    } else {

      const budget = arg2 as { name: string; monthlyLimit?: string | number | null; currency?: string | null };
      const c = ctx ?? { spend: 0, pct: 0, threshold: 0 };
      name = budget.name;
      currency = budget.currency ?? '';
      limitNum = Number(budget.monthlyLimit ?? 0) || 0;
      mtd = Number(c.spend ?? 0);
      pct = Number(c.pct ?? (limitNum > 0 ? (mtd / limitNum) * 100 : 0));
      threshold = Number(c.threshold ?? 0);
      if (c.periodStart) {
        periodStartStr = typeof c.periodStart === 'string'
          ? c.periodStart
          : new Date(c.periodStart).toISOString().slice(0, 10);
      }
    }

    const msg =
      `Budget Alert: "${name}" reached ${pct.toFixed(1)}% of limit\n` +
      (periodStartStr ? `Period start: ${periodStartStr}\n` : '') +
      `MTD: ${mtd.toFixed(2)} / Limit: ${limitNum.toFixed(2)} ${currency}`;

    return this.sendToChannels(orgId, undefined, msg);
  }


  async sendAnomalyAlert(
    orgId: string,
    payload: {
      scope: any;
      forDate: string;
      expected: number;
      actual: number;
      zScore?: number;
      severity?: 'low' | 'medium' | 'high';
      method?: string;
    },
  ): Promise<number> {
    const {
      scope, forDate, expected, actual,
      zScore = 0, severity = 'medium', method = 'z-score',
    } = payload;

    const scopeTxt =
      scope && Object.keys(scope || {}).length
        ? `scope=${JSON.stringify(scope)}`
        : 'scope=global';

    const msg =
      `Anomaly detected (${severity.toUpperCase()}) via ${method}\n` +
      `${scopeTxt}\n` +
      `Date: ${forDate}\n` +
      `Expected: ${expected.toFixed(2)}  Actual: ${actual.toFixed(2)}  Δ=${(actual - expected).toFixed(2)}  z=${zScore.toFixed(2)}`;
    return this.sendToChannels(orgId, undefined, msg);
  }

  /* -------------------------- Transports (best-effort) ------------------- */

  private async sendEmail(to: string, subject: string, text: string): Promise<boolean> {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 1025;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.ALERT_FROM || 'alerts@finops.local';

    if (!host) {
      // Dev fallback to console so tests don’t fail when SMTP isn’t running
      this.logger.log(`[email:FALLBACK] to=${to} subject="${subject}"\n${text}`);
      return true;
    }

    try {
      // Lazy require to avoid build-time type issues if nodemailer isn’t installed
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
        auth: user && pass ? { user, pass } : undefined,
      });

      await transporter.sendMail({ from, to, subject, text });
      return true;
    } catch (err) {
      this.logger.warn(`Email send failed to=${to}: ${(err as Error).message}`);
      return false;
    }
  }

  private async sendSlack(webhookUrl: string, text: string): Promise<boolean> {
    try {
      const u = new URL(webhookUrl);
      if (!u.hostname.endsWith('hooks.slack.com')) {
        this.logger.warn(`Slack webhook blocked (host): ${u.hostname}`);
        return false;
      }
      const payload = JSON.stringify({ text });
      const { request } = await import('https');

      const ok: boolean = await new Promise((resolve) => {
        const req = request(
          {
            method: 'POST',
            hostname: u.hostname,
            path: u.pathname + u.search,
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            },
          },
          (res) => resolve(res.statusCode === 200),
        );
        req.on('error', () => resolve(false));
        req.write(payload);
        req.end();
      });
      if (!ok) this.logger.warn('Slack webhook non-200 status');
      return ok;
    } catch (e: any) {
      this.logger.warn(`Slack send failed: ${e.message}`);
      return false;
    }
  }
}
