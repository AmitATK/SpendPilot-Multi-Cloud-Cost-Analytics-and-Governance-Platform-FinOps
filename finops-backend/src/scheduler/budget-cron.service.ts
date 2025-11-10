import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { BudgetsService } from '../features/budgets/budgets.service';

@Injectable()
export class BudgetCronService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private log = new Logger(BudgetCronService.name);

  constructor(private pg: Pool, private budgets: BudgetsService) {}

  onModuleInit() {
    // run immediately, then every 10 minutes
    this.tick().catch(e => this.log.error(e));
    this.timer = setInterval(() => this.tick().catch(e => this.log.error(e)), 10 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    const { rows } = await this.pg.query('select id from orgs');
    const now = new Date();
    for (const o of rows) await this.budgets.evaluate(o.id, now);
    this.log.log(`Budget evaluation ran for ${rows.length} org(s)`);
  }
}
