import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Req,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Pool } from 'pg';
import { parse } from 'csv-parse/sync';

function toISODate(input: string | number | Date | undefined): string {
  if (!input) return '';
  const d = new Date(input as any);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function safeJson(v: any): any {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return {};
  }
}

// CSV row shapes (loose and tolerant to missing fields)
type AzureCsvRow = {
  UsageDate?: string;
  UsageDateTime?: string;
  Date?: string;
  MeterCategory?: string;
  ProductName?: string;
  ServiceName?: string;
  CostInBillingCurrency?: string | number;
  Cost?: string | number;
  Tags?: string | Record<string, any>;
};

type GcpCsvRow = {
  usage_start_time?: string;
  usage_date?: string;
  service_description?: string;
  service?: string;
  cost?: string | number;
  cost_amount?: string | number;
  labels?: string | Record<string, any>;
};

@Controller('v1/ingest')
export class IngestController {
  constructor(private readonly pg: Pool) {}

  /** Azure Cost Mgmt CSV upload */
  @Post('azure/csv')
  @UseInterceptors(FileInterceptor('file'))
  async ingestAzureCsv(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    const orgId: string = req.orgId;
    const rows = parse(file.buffer, { columns: true, skip_empty_lines: true }) as any[];
    let inserted = 0;

    for (const raw of rows as AzureCsvRow[]) {
      const day = toISODate(raw.UsageDate || raw.UsageDateTime || raw.Date);
      if (!day) continue;

      const service =
        raw.MeterCategory || raw.ProductName || raw.ServiceName || 'Azure';

      const costNum =
        Number(raw.CostInBillingCurrency ?? raw.Cost ?? 0) || 0;

      const tags = safeJson(raw.Tags);

      await this.pg.query(
        `insert into resource_usage_daily (org_id, usage_date, service, unblended_cost, tags)
         values ($1, $2, $3, $4, $5)
         on conflict (org_id, usage_date, service)
         do update set unblended_cost = resource_usage_daily.unblended_cost + EXCLUDED.unblended_cost`,
        [orgId, day, service, costNum, tags]
      );
      inserted++;
    }

    return { ok: true, rows: inserted };
  }

  /** GCP Billing Export CSV upload */
  @Post('gcp/csv')
  @UseInterceptors(FileInterceptor('file'))
  async ingestGcpCsv(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    const orgId: string = req.orgId;
    const rows = parse(file.buffer, { columns: true, skip_empty_lines: true }) as any[];
    let inserted = 0;

    for (const raw of rows as GcpCsvRow[]) {
      const day = toISODate(raw.usage_start_time || raw.usage_date);
      if (!day) continue;

      const service = raw.service_description || raw.service || 'GCP';

      const costNum = Number(raw.cost ?? raw.cost_amount ?? 0) || 0;

      const tags = safeJson(raw.labels);

      await this.pg.query(
        `insert into resource_usage_daily (org_id, usage_date, service, unblended_cost, tags)
         values ($1, $2, $3, $4, $5)
         on conflict (org_id, usage_date, service)
         do update set unblended_cost = resource_usage_daily.unblended_cost + EXCLUDED.unblended_cost`,
        [orgId, day, service, costNum, tags]
      );
      inserted++;
    }

    return { ok: true, rows: inserted };
  }
}
