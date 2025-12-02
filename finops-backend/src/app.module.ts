import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './core/auth/auth.module';
import { RBACModule } from './core/rbac/rbac.module';

import { UsageModule } from './features/usage/usage.module';
import { BudgetsModule } from './features/budgets/budgets.module';
import { AlertsModule } from './features/alerts/alerts.module';
import { CleanupModule } from './features/cleanup/cleanup.module';

import { Org } from './entities/org.entity';
import { User } from './entities/user.entity';
import { UserOrgRole } from './entities/user-org-role.entity';
import { CloudAccount } from './entities/cloud-account.entity';
import { Resource } from './entities/resource.entity';
import { ResourceUsageDaily } from './entities/resource-usage-daily.entity';
import { Budget } from './entities/budget.entity';
import { BudgetEvent } from './entities/budget-event.entity';
import { AlertChannel } from './entities/alert-channel.entity';
import { CleanupSuggestion } from './entities/cleanup-suggestion.entity';
import { HealthController } from './health.controller';
import { AnomaliesModule } from './features/anomalies/anomalies.module';
import { ScheduleModule } from '@nestjs/schedule';
import { Anomaly } from './entities/anomaly.entity';
import { JobsModule } from './jobs/jobs.module';
import { IngestModule } from './features/ingest/ingest.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { TagsModule } from './features/tags/tags.module';
import { ShowbackModule } from './features/showback/showback.module';
import { StatementsModule } from './features/statements/statements.module';
import { SettingsModule } from './features/settings/settings.module';
import { OptimizeModule } from './features/optimize/optimize.module';
import { AppService } from './app.service';
import { AdminModule } from './features/admin/admin.module';
import { AppController } from './app.controller';
import { HealthModule } from './core/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        logging: false,
      }),
    }),
    AuthModule,
    RBACModule,
    TypeOrmModule.forFeature([
      Org,
      User,
      UserOrgRole,
      CloudAccount,
      Resource,
      ResourceUsageDaily,
      Budget,
      BudgetEvent,
      AlertChannel,
      CleanupSuggestion,
      Anomaly,
    ]),
    UsageModule,
    ScheduleModule.forRoot(),
    BudgetsModule,
    AlertsModule,
    CleanupModule,
    AnomaliesModule,
    JobsModule,
    IngestModule,
    SchedulerModule,
    TagsModule,
    ShowbackModule,
    StatementsModule,
    SettingsModule,
    OptimizeModule,
    AdminModule,
    HealthModule,
  ],
  providers: [AppService],
  controllers: [HealthController, AppController],
})
export class AppModule {}
