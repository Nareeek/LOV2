const DEV_SESSION_SECRET = 'dev-session-secret-change-me';
const DEFAULT_DEV_CORS_ORIGIN = 'http://localhost:5173';
const MIN_SESSION_SECRET_LENGTH = 32;

export type RuntimeEnv = Record<string, string | undefined>;

export function isProduction(env: RuntimeEnv): boolean {
  return env.NODE_ENV === 'production';
}

export function resolveSessionSecret(env: RuntimeEnv): string {
  const configuredSecret = env.SESSION_SECRET;

  if (!isProduction(env)) {
    return configuredSecret ?? DEV_SESSION_SECRET;
  }

  if (!configuredSecret) {
    throw new Error('SESSION_SECRET is required in production.');
  }

  if (configuredSecret === DEV_SESSION_SECRET) {
    throw new Error('SESSION_SECRET must not use the development placeholder in production.');
  }

  if (configuredSecret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters in production.`,
    );
  }

  return configuredSecret;
}

export function resolveCorsOrigin(env: RuntimeEnv): string {
  const configuredOrigin = env.CORS_ORIGIN;

  if (!isProduction(env)) {
    return configuredOrigin ?? DEFAULT_DEV_CORS_ORIGIN;
  }

  if (!configuredOrigin) {
    throw new Error('CORS_ORIGIN is required in production.');
  }

  const origin = configuredOrigin.trim();

  if (origin === '*' || origin.toLowerCase() === 'null') {
    throw new Error('CORS_ORIGIN must be an explicit HTTPS origin in production.');
  }

  if (origin.includes(',')) {
    throw new Error('CORS_ORIGIN must contain exactly one origin in production.');
  }

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error('CORS_ORIGIN must be a valid URL in production.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('CORS_ORIGIN must use HTTPS in production.');
  }

  if (parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error('CORS_ORIGIN must be an origin without path, query, hash, or credentials.');
  }

  if (isLocalhostOrLoopback(parsed.hostname)) {
    throw new Error('CORS_ORIGIN must not use localhost or loopback hosts in production.');
  }

  return parsed.origin;
}

export function shouldEnableSwagger(env: RuntimeEnv): boolean {
  if (!isProduction(env)) {
    return true;
  }

  return env.SWAGGER_ENABLED === 'true' || env.SWAGGER_ENABLED === '1';
}

function isLocalhostOrLoopback(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized === '::1' ||
    normalized === '[::1]' ||
    normalized.startsWith('127.')
  );
}
