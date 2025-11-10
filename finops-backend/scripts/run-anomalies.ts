import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Org } from '../src/entities/org.entity';
import { AnomaliesService } from '../src/features/anomalies/anomalies.service';

(async () => {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const orgRepo = app.get<Repository<Org>>(getRepositoryToken(Org));
  const svc = app.get(AnomaliesService);

  const orgs = await orgRepo.find({ select: ['id'] });
  const today = new Date().toISOString().slice(0, 10);

  for (const o of orgs) {
    await svc.detectDaily(o.id, today);
  }

  await app.close();
})();
