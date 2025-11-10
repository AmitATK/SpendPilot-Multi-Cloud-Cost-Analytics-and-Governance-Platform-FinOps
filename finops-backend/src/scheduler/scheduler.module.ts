import { Module } from '@nestjs/common';
import { BudgetsModule } from '../features/budgets/budgets.module';
import { BudgetCronService } from './budget-cron.service';

@Module({
  imports: [BudgetsModule],
  providers: [BudgetCronService],
})
export class SchedulerModule {}
