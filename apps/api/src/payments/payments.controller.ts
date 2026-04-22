import { Body, Controller, Headers, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SessionGuard, type RequestWithUser } from '../auth/session.guard.js';
import { PaymentsService } from './payments.service.js';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @Post('checkout-session')
  @UseGuards(SessionGuard)
  @ApiCookieAuth()
  createCheckoutSession(@CurrentUser() user: RequestWithUser['user']) {
    return this.payments.createCheckoutSession(user.id);
  }

  @Post('webhook')
  handleWebhook(
    @Req() request: FastifyRequest & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string | undefined,
    @Body() body: unknown,
  ) {
    const payload: { rawBody?: Buffer; signature?: string; body: unknown } = { body };
    if (request.rawBody) {
      payload.rawBody = request.rawBody;
    }
    if (signature) {
      payload.signature = signature;
    }
    return this.payments.handleWebhook(payload);
  }
}
