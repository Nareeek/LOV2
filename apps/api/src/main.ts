import 'reflect-metadata';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    rawBody: true,
  });
  const config = app.get(ConfigService);

  await app.register(helmet as never);
  await app.register(cookie as never, {
    secret: config.get<string>('SESSION_SECRET') ?? 'dev-session-secret-change-me',
  });

  const csrfCookieName = config.get<string>('CSRF_COOKIE_NAME') ?? 'lov2_csrf';
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('preHandler', async (request, reply) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return;
    }

    const path = request.url.split('?')[0];
    if (path === '/payments/webhook') {
      return;
    }

    const header = request.headers['x-csrf-token'];
    const requestToken = Array.isArray(header) ? header[0] : header;
    const cookieToken = (request as typeof request & { cookies?: Record<string, string> })
      .cookies?.[csrfCookieName];

    if (!requestToken || !cookieToken || requestToken !== cookieToken) {
      return reply.code(403).send({ message: 'CSRF token missing or invalid' });
    }
  });

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN') ?? 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('LOV2 API')
      .setDescription('Server-authoritative API for the LOV2 vertical slice.')
      .setVersion('0.1.0')
      .addCookieAuth('lov2_session')
      .build(),
  );
  SwaggerModule.setup('/docs', app, document);

  const port = Number(config.get<string>('API_PORT') ?? 4000);
  await app.listen({ port, host: '0.0.0.0' });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
