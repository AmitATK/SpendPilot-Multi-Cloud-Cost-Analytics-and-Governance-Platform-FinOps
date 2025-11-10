import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  root() {
    return {
      name: 'finops-backend',
      status: 'ok',
      time: new Date().toISOString(),
      endpoints: [
        '/healthz',
        '/v1/overview/daily?from=YYYY-MM-DD&to=YYYY-MM-DD',
        '/v1/budgets',
        '/v1/usage/mock',
        '/v1/cleanup/scan',
      ],
    };
  }

  @Get('healthz')
  healthz() {
    return { status: 'ok' };
  }
}
