import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../core/auth/auth.guard';
import { TagsService } from './tags.service';

@Controller('v1/tags')
@UseGuards(AuthGuard)
export class TagsController {
  constructor(private readonly svc: TagsService) {}

  @Get('score')
  score(@Req() req, @Query('days') days = '30') {
    const d = Math.max(1, Math.min(180, parseInt(days, 10) || 30));
    return this.svc.score(req.orgId, d);
  }
}
