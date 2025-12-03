import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '../../core/auth/auth.guard';
import { BudgetsService } from './budgets.service';
import { UpsertBudgetDto } from './dto';

@Controller('v1/budgets')
@UseGuards(AuthGuard)
export class BudgetsController {
  constructor(private svc: BudgetsService) {}
  @Get() list(@Req() req) { return this.svc.list(req.orgId); }
  @Post() upsert(@Req() req, @Body() dto: UpsertBudgetDto) { return this.svc.upsert(req.orgId, dto); }
}
