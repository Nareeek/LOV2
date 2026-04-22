import { randomBytes } from 'node:crypto';
import { Body, Controller, Get, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { CurrentUser } from './current-user.decorator.js';
import { AuthService } from './auth.service.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import { SessionGuard, type RequestWithUser } from './session.guard.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Get('csrf')
  async csrf(@Res({ passthrough: true }) reply: FastifyReply) {
    const csrfToken = randomBytes(32).toString('base64url');
    reply.setCookie(process.env.CSRF_COOKIE_NAME ?? 'lov2_csrf', csrfToken, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return { csrfToken };
  }

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.auth.register(dto);
    this.setSessionCookie(reply, result.rawToken, result.expiresAt);
    return { user: result.user };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.auth.login(dto);
    this.setSessionCookie(reply, result.rawToken, result.expiresAt);
    return { user: result.user };
  }

  @Post('logout')
  async logout(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.auth.logout(request.cookies?.[this.auth.cookieName]);
    reply.clearCookie(this.auth.cookieName, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async me(@CurrentUser() user: RequestWithUser['user']) {
    return { user };
  }

  private setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date) {
    reply.setCookie(this.auth.cookieName, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
    });
  }
}
