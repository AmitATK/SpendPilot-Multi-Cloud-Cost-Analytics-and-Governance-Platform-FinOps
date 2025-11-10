import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Org } from '../entities/org.entity';
import { BudgetsService } from '../features/budgets/budgets.service';
import { AnomaliesService } from '../features/anomalies/anomalies.service';

@Injectable()
export class JobsService {
  private log = new Logger(JobsService.name);

  constructor(
    @InjectRepository(Org) private orgs: Repository<Org>,
    private budgets: BudgetsService,
    private anomalies: AnomaliesService,
  ) {}

  // Runs every day at 02:00 server time
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async daily() {
    const all = await this.orgs.find({ select: ['id'] });
    const today = new Date().toISOString().slice(0, 10);
    this.log.log(`Daily jobs for ${all.length} org(s) on ${today}`);

    for (const o of all) {
      await this.budgets.evaluate(o.id, new Date());
      await this.anomalies.detectDaily(o.id, today);
    }
  }
}
