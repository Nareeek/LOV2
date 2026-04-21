import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe | null;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = secretKey?.startsWith('sk_test_') ? new Stripe(secretKey) : null;
  }

  async createCheckoutSession(userId: string) {
    const order = await this.prisma.paymentOrder.create({
      data: {
        userId,
        gems: 100,
        amountMinor: 499,
        currency: 'usd',
      },
    });

    const priceId = this.config.get<string>('STRIPE_PRICE_GEMS_SMALL');
    if (!this.stripe || !priceId || priceId.includes('replace_me')) {
      return {
        mode: 'stripe-sandbox-stub',
        orderId: order.id,
        checkoutUrl: `/shop/sandbox-success?order=${order.id}`,
      };
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'http://localhost:5173/shop/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:5173/shop/cancelled',
      metadata: { orderId: order.id, userId },
    });

    await this.prisma.paymentOrder.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    return {
      mode: 'stripe-checkout',
      orderId: order.id,
      checkoutUrl: session.url,
    };
  }

  async handleWebhook(input: { rawBody?: Buffer; signature?: string; body: unknown }) {
    let event: Stripe.Event | { id: string; type: string; data?: { object?: Record<string, unknown> } };
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');

    if (this.stripe && webhookSecret && input.rawBody && input.signature) {
      event = this.stripe.webhooks.constructEvent(input.rawBody, input.signature, webhookSecret);
    } else if (process.env.NODE_ENV !== 'production' && isDevWebhook(input.body)) {
      event = input.body;
    } else {
      throw new BadRequestException('Stripe webhook signature is required');
    }

    const existing = await this.prisma.paymentWebhookEvent.findUnique({ where: { id: event.id } });
    if (existing) {
      return { received: true, duplicate: true };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentWebhookEvent.create({
        data: {
          id: event.id,
          type: event.type,
          payloadSummary: { type: event.type },
        },
      });

      if (event.type === 'checkout.session.completed') {
        const session = event.data?.object ?? {};
        const orderId = readMetadata(session as unknown as Record<string, unknown>, 'orderId');
        if (!orderId) {
          return;
        }
        const order = await tx.paymentOrder.findUnique({ where: { id: orderId } });
        if (!order || order.status === 'paid') {
          return;
        }

        await tx.paymentOrder.update({ where: { id: order.id }, data: { status: 'paid' } });
        const character = await tx.character.findFirst({ where: { userId: order.userId } });
        if (character) {
          await tx.character.update({
            where: { id: character.id },
            data: { gems: { increment: order.gems } },
          });
          await tx.currencyLedgerEntry.create({
            data: {
              characterId: character.id,
              currency: 'gems',
              amount: order.gems,
              reason: `payment:${order.id}`,
            },
          });
        }
      }
    });

    return { received: true };
  }
}

function isDevWebhook(value: unknown): value is { id: string; type: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

function readMetadata(source: Record<string, unknown>, key: string): string | undefined {
  const metadata = source.metadata;
  if (typeof metadata !== 'object' || metadata === null) {
    return undefined;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}
