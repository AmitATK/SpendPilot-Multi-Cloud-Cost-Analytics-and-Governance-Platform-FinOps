// src/core/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [DatabaseModule],
  providers: [AuthGuard, AuthService],
  controllers: [AuthController],
  exports: [AuthGuard, AuthService],
})
export class AuthModule {}
