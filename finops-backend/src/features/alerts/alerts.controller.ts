import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../core/auth/auth.guard';
import { AlertsService } from './alerts.service';

type Channel = 'email' | 'slack';

@Controller('v1/alerts')
@UseGuards(AuthGuard)
export class AlertsController {
  constructor(private alerts: AlertsService) {}

  @Get('channels')
  async list(@Req() req) {
    return this.alerts.listChannels(req.orgId);
  }

  @Post('channels')
  async create(
    @Req() req,
    @Body() dto: { channel: Channel; target: string; scope?: any; active?: boolean }
  ) {
    return this.alerts.createChannel(req.orgId, dto);
  }

  @Put('channels/:id')
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: Partial<{ channel: Channel; target: string; scope: any; active: boolean }>
  ) {
    return this.alerts.updateChannel(req.orgId, id, dto);
  }

  @Delete('channels/:id')
  async remove(@Req() req, @Param('id') id: string) {
    await this.alerts.deleteChannel(req.orgId, id);
    return { ok: true };
  }

  @Post('test')
  async test(@Req() req, @Body() dto: { message?: string }) {
    const msg = dto?.message || 'This is a FinOps test alert.';
    const count = await this.alerts.sendTest(req.orgId, msg);
    return { ok: true, sent: count };
  }
}
