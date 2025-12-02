import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { AlertsPoliciesController } from './policies.controller';
import { AlertChannel } from '../../entities/alert-channel.entity'; // adjust path/name if different

@Module({
  imports: [TypeOrmModule.forFeature([AlertChannel]), HttpModule],
  controllers: [AlertsController, AlertsPoliciesController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
