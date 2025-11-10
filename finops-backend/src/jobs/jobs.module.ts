import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsService } from './jobs.service';
import { Org } from '../entities/org.entity';
import { BudgetsModule } from '../features/budgets/budgets.module';
import { AnomaliesModule } from '../features/anomalies/anomalies.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Org]),
    BudgetsModule,
    AnomaliesModule,
  ],
  providers: [JobsService],
})
export class JobsModule {}
