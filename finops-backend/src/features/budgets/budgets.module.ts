import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetsService } from './budgets.service';
import { BudgetsController } from './budgets.controller';
import { Budget } from '../../entities/budget.entity';
import { BudgetEvent } from '../../entities/budget-event.entity';
import { ResourceUsageDaily } from '../../entities/resource-usage-daily.entity';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Budget, BudgetEvent, ResourceUsageDaily]),
    AlertsModule,
  ],
  providers: [BudgetsService],
  controllers: [BudgetsController],
  exports: [BudgetsService],
})
export class BudgetsModule {}
