/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Inject,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Pool } from 'pg';

function isProd() {
  return process.env.NODE_ENV === 'production';
}

@Controller()
export class HealthController {
  constructor(@Optional() @Inject('PG_POOL') private readonly pg?: Pool) {}

  /** Root banner (keep minimal in prod) */
  @Get()
  root() {
    const payload: any = {
      name: 'finops-backend',
      status: 'ok',
      time: new Date().toISOString(),
    };

    if (!isProd()) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      payload.endpoints = [
        '/healthz',
        '/readyz',
        '/version',
        '/v1/overview/daily?from=YYYY-MM-DD&to=YYYY-MM-DD',
        '/v1/budgets',
        '/v1/usage/mock',
        '/v1/cleanup/scan',
      ];
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return payload;
  }

  /** Liveness */
  @Get('healthz')
  healthz() {
    return {
      status: 'ok',
      uptime_s: Math.round(process.uptime()),
    };
  }

  /** Readiness: DB ping */
  @Get('readyz')
  async readyz() {
    if (!this.pg) {
      // Not wired; treat as OK for simple environments
      return { status: 'ok', db: 'unknown' };
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await this.pg.query('SELECT 1');
      return { status: 'ok', db: 'up' };
    } catch (e: any) {
      // Signal not ready
      throw new ServiceUnavailableException({
        status: 'error',
        db: 'down',
        error: e?.message || 'db ping failed',
      });
    }
  }

  /** Optional build metadata (set via env) */
  @Get('version')
  version() {
    return {
      version: process.env.APP_VERSION || 'dev',
      commit: process.env.GIT_SHA || 'unknown',
      builtAt: process.env.BUILT_AT || 'unknown',
      node: process.version,
    };
  }
}
