import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Pool } from 'pg';

@Injectable()
export class AlertsService {
  private log = new Logger(AlertsService.name);

  private mailer = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,                 // e.g. 127.0.0.1
        port: Number(process.env.SMTP_PORT || 1025),
        family: 4,                                   // force IPv4, avoids ::1
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      })
    : null;

  constructor(private pg: Pool) {}

  async targets(orgId: string, _scope: any) {
    const { rows } = await this.pg.query(
      `select * from alert_channels where org_id=$1 and active=true`,
      [orgId]
    );
    return rows;
  }

  async sendBudgetAlert(
    orgId: string,
    budget: any,
    ctx: { spend: number; pct: number; threshold: number; periodStart: Date }
  ) {
    const channels = await this.targets(orgId, budget.scope);
    const subject = `Budget ${budget.name}: ${ctx.threshold}% threshold crossed (${ctx.pct}% used)`;
    const text = `Budget: ${budget.name}
Scope: ${JSON.stringify(budget.scope)}
Spend: ${ctx.spend} ${budget.currency}
Limit: ${budget.monthly_limit} ${budget.currency}
Usage: ${ctx.pct}%
Period: ${ctx.periodStart.toISOString().slice(0,10)}`;

    for (const ch of channels) {
      if (ch.channel === 'email') {
        if (!this.mailer) {
          this.log.warn('SMTP not configured; skipping email send');
          continue;
        }
        try {
          await this.mailer.sendMail({ from: process.env.SMTP_FROM, to: ch.target, subject, text });
        } catch (e: any) {
          this.log.warn(`SMTP send failed: ${e?.message || e}`);
          // do not throw in dev
        }
      } else if (ch.channel === 'slack') {
        const hook = (ch.target || process.env.SLACK_WEBHOOK) as string;
        if (!hook) {
          this.log.warn('Slack webhook not set; skipping slack alert');
          continue;
        }
        try {
          await fetch(hook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: `:warning: ${subject}\n${text}` }),
          });
        } catch (e: any) {
          this.log.warn(`Slack send failed: ${e?.message || e}`);
        }
      }
    }
  }

  // ADD THIS METHOD to AlertsService
async sendAnomalyAlert(
  orgId: string,
  anomaly: {
    day?: string; date?: string;
    service?: string;
    accountId?: string;
    region?: string;
    actual?: number; expected?: number; delta?: number; pct?: number; zscore?: number;
    currency?: string;
    details?: any;
    [k: string]: any;
  }
) {
  const date = anomaly.day || anomaly.date || '';
  const svc = anomaly.service || 'Unknown';
  const currency = anomaly.currency || 'INR';
  const actual = anomaly.actual ?? anomaly.observed ?? anomaly.actualCost ?? anomaly.cost ?? 0;
  const expected = anomaly.expected ?? anomaly.baseline ?? 0;
  const delta = anomaly.delta ?? (Number(actual) - Number(expected));
  const pct = anomaly.pct ?? (expected ? Math.round((Number(actual) / Number(expected)) * 100) : null);
  const z = anomaly.zscore ?? anomaly.z ?? null;

  const subject = `Anomaly detected: ${svc}${date ? ' on ' + date : ''}`;
  const text = `Anomaly detected
Service: ${svc}
Date: ${date}
Actual: ${actual} ${currency}
Expected: ${expected} ${currency}
Delta: ${delta} ${currency}${pct !== null ? ` (${pct}% of expected)` : ''}
${z !== null ? `Z-Score: ${z}\n` : ''}
Account: ${anomaly.accountId ?? '-'}
Region: ${anomaly.region ?? '-'}
Details: ${JSON.stringify(anomaly.details ?? anomaly, null, 2)}`;

  const channels = await this.targets(orgId, {}); // reuse existing channel lookup
  for (const ch of channels) {
    if (ch.channel === 'email') {
      if ((this as any).mailer) {
        try {
          await (this as any).mailer.sendMail({
            from: process.env.SMTP_FROM,
            to: ch.target,
            subject,
            text,
          });
        } catch (e) {
          // don't crash on email issues in dev
          // optionally log here if you use a Logger
        }
      }
    } else if (ch.channel === 'slack') {
      const hook = (ch.target || process.env.SLACK_WEBHOOK) as string | undefined;
      if (!hook) continue;
      try {
        await fetch(hook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `:rotating_light: ${subject}\n${text}` }),
        });
      } catch {
        // swallow slack errors in dev
      }
    }
  }
}

}