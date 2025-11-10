import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AnomaliesService } from './anomalies.service';
import { AuthGuard } from '../../core/auth/auth.guard';

@Controller('v1/anomalies')
@UseGuards(AuthGuard)
export class AnomaliesController {
  constructor(private svc: AnomaliesService) {}

  @Post('detect')
  async detect(@Req() req, @Body() dto: { from?: string; to?: string; z?: number }) {
    const today = new Date().toISOString().slice(0, 10);
    const to = dto.to ?? today;
    const from = dto.from ?? new Date(Date.now() - 13 * 24 * 3600_000).toISOString().slice(0, 10);
    return this.svc.detect(req.orgId, from, to, dto.z ?? 2.0);
  }

  @Get()
  async recent(@Req() req) {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 29 * 24 * 3600_000).toISOString().slice(0, 10);
    return this.svc.detect(req.orgId, from, to);
  }
}
