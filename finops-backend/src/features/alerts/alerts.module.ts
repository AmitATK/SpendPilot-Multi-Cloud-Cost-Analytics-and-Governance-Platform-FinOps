import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsService } from './alerts.service';
import { AlertChannel } from '../../entities/alert-channel.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AlertChannel])],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
