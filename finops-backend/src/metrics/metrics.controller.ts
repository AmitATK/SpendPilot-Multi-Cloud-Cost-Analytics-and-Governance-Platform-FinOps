/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Controller, Get } from '@nestjs/common';
import * as client from 'prom-client';

client.collectDefaultMetrics();
@Controller('metrics')
export class MetricsController {
  @Get()
  async get() {
    return client.register.metrics();
  }
}
