import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../core/auth/auth.guard';
import { AlertsService } from './alerts.service';

type TestBody = { channelIds?: string[]; message?: string };

@UseGuards(AuthGuard)
@Controller('v1/alerts/policies')
export class AlertsPoliciesController {
  constructor(private readonly alerts: AlertsService) {}

  // Basic listing endpoint (stub your policies as needed).
  @Get()
  async list(@Req() req) {
    const channels = await this.alerts.listChannels(req.orgId);
    return {
      policies: [],
      channels,
    };
  }

  // Send a test message to selected channels (or all if channelIds omitted)
  @Post('test')
  async test(@Req() req, @Body() body: TestBody) {
    const message = body?.message || 'FinOps policy test message';
    const sent = await this.alerts.sendToChannels(req.orgId, body?.channelIds ?? [], message);
    return { ok: true, sent };
  }
}
