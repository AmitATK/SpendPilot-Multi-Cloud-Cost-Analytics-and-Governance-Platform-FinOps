import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '../../core/auth/auth.guard';
import { CleanupService } from './cleanup.service';

@Controller('v1/cleanup')
@UseGuards(AuthGuard)
export class CleanupController {
  constructor(private svc: CleanupService) {}
  @Post('scan') scan(@Req() req) { return this.svc.scanUnused(req.orgId); }
}
