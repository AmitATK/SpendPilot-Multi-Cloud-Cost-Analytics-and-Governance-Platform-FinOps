import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../core/auth/auth.guard';
import { ShowbackService } from './showback.service';

@Controller('v1/showback')
@UseGuards(AuthGuard)
export class ShowbackController {
  constructor(private svc: ShowbackService) {}

  /** GET /v1/showback/statement?month=YYYY-MM&by=team,cost_center */
  @Get('statement')
  async getStatement(
    @Req() req,
    @Query('month') month?: string,
    @Query('by') by?: string,
  ) {
    const m = (month && /^\d{4}-\d{2}$/.test(month)) ? month : new Date().toISOString().slice(0,7);
    const byKeys = (by ? by.split(',') : []);
    return this.svc.statement(req.orgId, m, byKeys);
  }
}
