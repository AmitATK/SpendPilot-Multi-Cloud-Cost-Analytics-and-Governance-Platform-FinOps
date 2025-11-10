import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CleanupService } from './cleanup.service';
import { CleanupController } from './cleanup.controller';
import { ResourceUsageDaily } from '../../entities/resource-usage-daily.entity';
import { CleanupSuggestion } from '../../entities/cleanup-suggestion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ResourceUsageDaily, CleanupSuggestion])],
  providers: [CleanupService],
  controllers: [CleanupController],
  exports: [CleanupService],
})
export class CleanupModule {}
