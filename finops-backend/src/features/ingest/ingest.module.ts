import { Module } from '@nestjs/common';
import { IngestService } from './ingest.service';
import { IngestController } from './ingest.controller';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [UsageModule],
  providers: [IngestService],
  controllers: [IngestController],
})
export class IngestModule {}
