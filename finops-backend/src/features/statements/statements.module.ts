import { Module } from '@nestjs/common';
import { StatementsController } from './statements.controller';

@Module({
  controllers: [StatementsController],
})
export class StatementsModule {}
