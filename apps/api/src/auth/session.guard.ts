import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service.js';

export interface RequestWithUser extends FastifyRequest {
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = request.cookies?.[this.auth.cookieName];
    const user = await this.auth.getUserForToken(token);

    if (!user) {
      throw new UnauthorizedException('Требуется вход');
    }

    request.user = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    };
    return true;
  }
}
