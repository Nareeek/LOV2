import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestWithUser } from './session.guard.js';

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<RequestWithUser>();
  return request.user;
});

