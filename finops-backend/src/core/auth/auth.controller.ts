import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly svc: AuthService) {}

  @Post('register') register(@Body() b: any) {
    return this.svc.register(b.email, b.password, b.name);
  }

  @Post('login') login(@Body() b: any) {
    return this.svc.login(b.email, b.password);
  }
}
