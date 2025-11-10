import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { IngestService } from './ingest.service';
import { AuthGuard } from '../../core/auth/auth.guard';

@Controller('v1/ingest/aws')
@UseGuards(AuthGuard)
export class IngestController {
  constructor(private svc: IngestService) {}

  @Post('cur')
  async cur(@Req() req, @Body() dto: { days?: number; end?: string }) {
    const days = dto.days ?? 14;
    return this.svc.importAwsCurMock(req.orgId, days, dto.end);
  }
}
