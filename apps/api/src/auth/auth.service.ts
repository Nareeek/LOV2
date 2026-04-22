import { createHash, randomBytes } from 'node:crypto';
import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';

const SESSION_DAYS = 14;

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  get cookieName(): string {
    return this.config.get<string>('SESSION_COOKIE_NAME') ?? 'lov2_session';
  }

  async register(input: { email: string; displayName: string; password: string }) {
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Аккаунт уже существует. Войдите или используйте другую почту.');
    }

    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 64 * 1024,
      timeCost: 3,
      parallelism: 1,
    });

    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          displayName: input.displayName,
          passwordHash,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'Аккаунт уже существует. Войдите или используйте другую почту.',
        );
      }

      throw error;
    }

    return this.createSession(user);
  }

  async login(input: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (!user || !(await argon2.verify(user.passwordHash, input.password))) {
      throw new UnauthorizedException('Неверная почта или пароль');
    }

    return this.createSession(user);
  }

  async logout(rawToken?: string) {
    if (!rawToken) {
      return;
    }
    await this.prisma.session.deleteMany({
      where: { tokenHash: this.hashToken(rawToken) },
    });
  }

  async getUserForToken(rawToken?: string): Promise<User | null> {
    if (!rawToken) {
      return null;
    }

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      include: { user: true },
    });

    if (!session || session.expiresAt <= new Date()) {
      return null;
    }

    return session.user;
  }

  private async createSession(user: User) {
    const rawToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(rawToken),
        expiresAt,
      },
    });

    return {
      rawToken,
      expiresAt,
      session,
      user: this.publicUser(user),
    };
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  publicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
