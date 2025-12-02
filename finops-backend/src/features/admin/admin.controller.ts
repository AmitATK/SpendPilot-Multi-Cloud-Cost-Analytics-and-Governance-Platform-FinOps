import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Pool } from 'pg';
import { AuthGuard } from '../../core/auth/auth.guard';

@Controller('v1/admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(@Inject(Pool) private readonly pg: Pool) {}
  @Get('health')
  health() {
    return { ok: true };
  }
  private ensureAdmin(role: string) {
    if (role !== 'ADMIN') throw new ForbiddenException('admin only');
  }
    @Get('users')
    async listUsers(@Req() req) {
        this.ensureAdmin(req.role);
        const { rows } = await this.pg.query(
            'select id, email, name, role, org_id, created_at from users where org_id=$1 order by created_at desc',
            [req.orgId]
        );
        return rows;
    }


    @Put('users/:id/role')
    async setRole(@Req() req, @Param('id') id: string, @Body() body: { role: string }) {
        this.ensureAdmin(req.role);
        await this.pg.query('update users set role=$1 where id=$2 and org_id=$3', [body.role, id, req.orgId]);
        return { ok: true };
    }
}
