import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { DatabaseModule } from '../../core/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TagsController],
})
export class TagsModule {}
