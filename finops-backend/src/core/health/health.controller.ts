import { Controller, Get } from '@nestjs/common';
import { Pool } from 'pg';

@Controller()
export class HealthController {
  constructor(private readonly pg: Pool) {}

  @Get('/healthz')
  health() {
    return { ok: true };
  }

  @Get('/readyz')
  async ready() {
    try {
      await this.pg.query('select 1');
      return { ok: true, db: 'up' };
    } catch {
      return { ok: false, db: 'down' };
    }
  }
}
