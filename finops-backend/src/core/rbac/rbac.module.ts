import { Module } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

@Module({ providers: [RolesGuard], exports: [RolesGuard] })
export class RBACModule {}
