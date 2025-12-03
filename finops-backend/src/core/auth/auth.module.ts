import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: {
        expiresIn: '45m',
        issuer: process.env.JWT_ISS || 'spendpilot',
        audience: process.env.JWT_AUD || 'spendpilot-ui',
      },
    }),
  ],
  providers: [AuthGuard, AuthService],
  controllers: [AuthController],
  exports: [AuthGuard, AuthService, JwtModule],
})
export class AuthModule {}
