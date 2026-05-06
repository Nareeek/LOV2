import type { BootstrapState } from '@lov2/shared';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
let csrfToken: string | null = null;

async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  const response = await fetch(`${API_URL}/auth/csrf`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Не удалось получить CSRF token');
  }

  const body = (await response.json()) as { csrfToken: string };
  csrfToken = body.csrfToken;
  return csrfToken;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined && options.body !== null;

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers.set('x-csrf-token', await ensureCsrfToken());
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(errorMessageFromBody(text) || `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

function errorMessageFromBody(text: string): string {
  if (!text) {
    return '';
  }

  try {
    const body = JSON.parse(text) as { message?: string | string[]; error?: string };
    if (Array.isArray(body.message)) {
      return body.message.join(', ');
    }
    return body.message ?? body.error ?? text;
  } catch {
    return text;
  }
}

export const apiClient = {
  register: (input: { email: string; displayName: string; password: string }) =>
    api<{ user: unknown }>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),
  login: (input: { email: string; password: string }) =>
    api<{ user: unknown }>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  logout: () => api<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  bootstrap: () => api<BootstrapState>('/game/bootstrap'),
  createCharacter: (input: { name: string; raceId: string; gender: 'male' | 'female'; classId: 'swordsman' | 'ranger' | 'mage' }) =>
    api<BootstrapState>('/characters', { method: 'POST', body: JSON.stringify(input) }),
  acceptQuest: (questId: string) =>
    api<BootstrapState>(`/quests/${questId}/accept`, { method: 'POST' }),
  startTravel: (input: { locationId: string; questId?: string }) =>
    api<BootstrapState>('/travel/start', { method: 'POST', body: JSON.stringify(input) }),
  claimTravel: (travelId: string, input: { rush?: boolean } = {}) =>
    api<BootstrapState>(`/travel/${travelId}/claim`, { method: 'POST', body: JSON.stringify(input) }),
  resolveCombat: (combatId: string, input: { petId?: string } = {}) =>
    api<BootstrapState>(`/combat/${combatId}/resolve`, { method: 'POST', body: JSON.stringify(input) }),
  equipItem: (inventoryStackId: string) =>
    api<BootstrapState>(`/inventory/${inventoryStackId}/equip`, { method: 'POST' }),
  unequipItem: (inventoryStackId: string) =>
    api<BootstrapState>(`/inventory/${inventoryStackId}/unequip`, { method: 'POST' }),
  allocateStats: (input: { stat: string; points: number }) =>
    api<BootstrapState>('/stats/allocate', { method: 'POST', body: JSON.stringify(input) }),
  startRebirth: () => api<BootstrapState>('/rebirth/start', { method: 'POST' }),
  refillEnergy: (input: { mode: 'cup' | 'bundle' }) =>
    api<BootstrapState>('/energy/refill', { method: 'POST', body: JSON.stringify(input) }),
  purchaseItem: (input: { itemId: string }) =>
    api<BootstrapState>('/shop/purchase', { method: 'POST', body: JSON.stringify(input) }),
  upgradeItem: (input: { inventoryStackId: string }) =>
    api<BootstrapState>('/forge/upgrade', { method: 'POST', body: JSON.stringify(input) }),
  startArena: (input: { enemyId: string }) =>
    api<BootstrapState>('/arena/start', { method: 'POST', body: JSON.stringify(input) }),
  checkout: () =>
    api<{ checkoutUrl: string; mode: string; orderId: string }>('/payments/checkout-session', {
      method: 'POST',
    }),
};
