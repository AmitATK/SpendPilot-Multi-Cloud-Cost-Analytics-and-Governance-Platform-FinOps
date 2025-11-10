import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '../../core/auth/auth.guard';
import { UsageService } from './usage.service';

@Controller('v1/usage')
@UseGuards(AuthGuard)
export class UsageController {
  constructor(private readonly svc: UsageService) {}

  @Post('mock')
  async mock(@Req() req, @Body() dto: { day: string }) {
    await this.svc.insertMockDaily(req.orgId, dto.day);
    return { ok: true };
  }
}
