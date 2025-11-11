import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsService } from './alerts.service';
import { AlertChannel } from '../../entities/alert-channel.entity';
import { AlertsController } from './alerts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AlertChannel])],
  providers: [AlertsService],
  controllers: [AlertsController],
  exports: [AlertsService],
})
export class AlertsModule {}
