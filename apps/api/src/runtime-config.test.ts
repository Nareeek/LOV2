import { describe, expect, it } from 'vitest';
import {
  isProduction,
  resolveCorsOrigin,
  resolveSessionSecret,
  shouldEnableSwagger,
  type RuntimeEnv,
} from './runtime-config.js';

const productionBase: RuntimeEnv = {
  NODE_ENV: 'production',
  CORS_ORIGIN: 'https://lov2.example.com',
  SESSION_SECRET: 'a-secure-production-session-secret',
};

describe('runtime config', () => {
  it('detects production only from NODE_ENV=production', () => {
    expect(isProduction({ NODE_ENV: 'production' })).toBe(true);
    expect(isProduction({ NODE_ENV: 'development' })).toBe(false);
    expect(isProduction({ NODE_ENV: 'test' })).toBe(false);
    expect(isProduction({})).toBe(false);
  });

  it('keeps development defaults for local Docker convenience', () => {
    expect(resolveSessionSecret({ NODE_ENV: 'development' })).toBe(
      'dev-session-secret-change-me',
    );
    expect(resolveCorsOrigin({ NODE_ENV: 'development' })).toBe('http://localhost:5173');
    expect(shouldEnableSwagger({ NODE_ENV: 'development' })).toBe(true);
  });

  it('uses configured non-production values when provided', () => {
    expect(
      resolveSessionSecret({
        NODE_ENV: 'test',
        SESSION_SECRET: 'custom-local-secret',
      }),
    ).toBe('custom-local-secret');
    expect(
      resolveCorsOrigin({
        NODE_ENV: 'test',
        CORS_ORIGIN: 'http://localhost:5174',
      }),
    ).toBe('http://localhost:5174');
  });

  it('requires a strong non-placeholder SESSION_SECRET in production', () => {
    expect(() => resolveSessionSecret({ ...productionBase, SESSION_SECRET: undefined })).toThrow(
      'SESSION_SECRET is required in production.',
    );
    expect(() =>
      resolveSessionSecret({
        ...productionBase,
        SESSION_SECRET: 'dev-session-secret-change-me',
      }),
    ).toThrow('SESSION_SECRET must not use the development placeholder in production.');
    expect(() => resolveSessionSecret({ ...productionBase, SESSION_SECRET: 'too-short' })).toThrow(
      'SESSION_SECRET must be at least 32 characters in production.',
    );

    expect(resolveSessionSecret(productionBase)).toBe(productionBase.SESSION_SECRET);
  });

  it('requires one explicit HTTPS CORS origin in production', () => {
    expect(resolveCorsOrigin(productionBase)).toBe('https://lov2.example.com');
    expect(resolveCorsOrigin({ ...productionBase, CORS_ORIGIN: 'https://lov2.example.com:8443' }))
      .toBe('https://lov2.example.com:8443');
  });

  it.each([
    [undefined, 'CORS_ORIGIN is required in production.'],
    ['*', 'CORS_ORIGIN must be an explicit HTTPS origin in production.'],
    ['null', 'CORS_ORIGIN must be an explicit HTTPS origin in production.'],
    [
      'https://one.example.com,https://two.example.com',
      'CORS_ORIGIN must contain exactly one origin in production.',
    ],
    ['not a url', 'CORS_ORIGIN must be a valid URL in production.'],
    ['http://lov2.example.com', 'CORS_ORIGIN must use HTTPS in production.'],
    [
      'https://lov2.example.com/app',
      'CORS_ORIGIN must be an origin without path, query, hash, or credentials.',
    ],
    [
      'https://localhost:5173',
      'CORS_ORIGIN must not use localhost or loopback hosts in production.',
    ],
    [
      'https://127.0.0.1:5173',
      'CORS_ORIGIN must not use localhost or loopback hosts in production.',
    ],
    [
      'https://[::1]:5173',
      'CORS_ORIGIN must not use localhost or loopback hosts in production.',
    ],
  ])('rejects unsafe production CORS origin %s', (corsOrigin, expectedMessage) => {
    expect(() =>
      resolveCorsOrigin({
        ...productionBase,
        CORS_ORIGIN: corsOrigin,
      }),
    ).toThrow(expectedMessage);
  });

  it('gates Swagger by environment and explicit production override', () => {
    expect(shouldEnableSwagger({ NODE_ENV: 'development' })).toBe(true);
    expect(shouldEnableSwagger(productionBase)).toBe(false);
    expect(shouldEnableSwagger({ ...productionBase, SWAGGER_ENABLED: 'true' })).toBe(true);
    expect(shouldEnableSwagger({ ...productionBase, SWAGGER_ENABLED: '1' })).toBe(true);
    expect(shouldEnableSwagger({ ...productionBase, SWAGGER_ENABLED: 'TRUE' })).toBe(false);
  });
});
