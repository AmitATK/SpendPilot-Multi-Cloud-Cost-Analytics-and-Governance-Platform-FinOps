import { Module } from '@nestjs/common';
import { ShowbackController } from './showback.controller';
import { ShowbackService } from './showback.service';

@Module({
  controllers: [ShowbackController],
  providers: [ShowbackService],
  exports: [ShowbackService],
})
export class ShowbackModule {}
