import { Module } from '@nestjs/common';
import { AnomaliesService } from './anomalies.service';
import { AnomaliesController } from './anomalies.controller';

@Module({
  providers: [AnomaliesService],
  controllers: [AnomaliesController],
  exports: [AnomaliesService],
})
export class AnomaliesModule {}
