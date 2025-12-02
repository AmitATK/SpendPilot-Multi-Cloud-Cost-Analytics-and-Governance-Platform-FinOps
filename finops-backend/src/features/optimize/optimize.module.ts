import { Module } from '@nestjs/common';
import { RightsizingController } from './rightsizing.controller';

@Module({ controllers: [RightsizingController] })
export class OptimizeModule {}