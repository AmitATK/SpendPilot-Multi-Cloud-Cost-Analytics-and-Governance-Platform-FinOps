import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageService } from './usage.service';
import { UsageController } from './usage.controller';
import { OverviewController } from './overview.controller';
import { CloudAccount } from '../../entities/cloud-account.entity';
import { ResourceUsageDaily } from '../../entities/resource-usage-daily.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CloudAccount, ResourceUsageDaily])],
  providers: [UsageService],
  controllers: [UsageController, OverviewController],
  exports: [UsageService],
})
export class UsageModule {}
