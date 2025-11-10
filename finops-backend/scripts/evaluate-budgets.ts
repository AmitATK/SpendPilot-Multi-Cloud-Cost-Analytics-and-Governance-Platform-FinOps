import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { BudgetsService } from '../src/features/budgets/budgets.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Org } from '../src/entities/org.entity';
import { Repository } from 'typeorm';

(async () => {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const svc = app.get(BudgetsService);
  const orgRepo = app.get<Repository<Org>>(getRepositoryToken(Org));
  const orgs = await orgRepo.find({ select: ['id'] });
  const now = new Date();
  for (const o of orgs) await svc.evaluate(o.id, now);
  await app.close();
})();
