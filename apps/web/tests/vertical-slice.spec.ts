import { expect, test } from '@playwright/test';
import type { BootstrapState, Character } from '@lov2/shared';

test('renders Russian-first entry screen and nonblank game art', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ночная сага начинается' })).toBeVisible();
  await expect(page.locator('img.auth-art')).toBeVisible();
});

test('canvas viewport exists after mocked bootstrap', async ({ page }) => {
  await page.route('**/game/bootstrap', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'u1',
          email: 'player@example.com',
          displayName: 'Игрок',
          createdAt: new Date().toISOString(),
        },
        character: {
          id: 'c1',
          userId: 'u1',
          name: 'Матвей',
          raceId: 'nocturne',
          level: 1,
          experience: 0,
          rebirths: 0,
          health: 120,
          maxHealth: 120,
          unspentStatPoints: 0,
          stats: { сила: 12, ловкость: 10, интуиция: 10, удача: 8 },
          gold: 120,
          gems: 0,
          energy: 10,
          maxEnergy: 10,
          energyUpdatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        races: [],
        items: [],
        quests: [],
        locations: [],
        enemies: [],
        scenes: [],
        inventory: [],
        questProgress: [],
        travels: [],
        combats: [],
      }),
    });
  });

  await page.goto('/');
  await expect(page.getByTestId('scene-canvas')).toBeVisible();
  await expect(page.getByTestId('hotspot-hub-tavern')).toBeVisible();
  await expect(page.getByTestId('hotspot-hub-tavern')).toHaveText('');
  await expect(page.getByTestId('character-portrait')).toBeVisible();
  await expect(page.getByTestId('character-info-button')).toBeVisible();
  await expect(page.getByTestId('level-badge')).toHaveText('1');
  await expect(page.getByTestId('hud-xp')).toBeVisible();
  await expect(page.getByTestId('hud-gold')).toBeVisible();
  await expect(page.getByTestId('hud-gems')).toBeVisible();
  await expect(page.getByTestId('add-currency-button')).toBeVisible();
  await expect(page.getByTestId('left-meta-rail')).toBeVisible();
  await expect(page.getByTestId('friend-carousel')).toBeVisible();
  await expect(page.getByTestId('right-action-dock')).toBeVisible();
});

test('registers creates hero and plays through the unified shell slice', async ({ page }) => {
  const pageErrors: string[] = [];
  const id = `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
  const email = `hero-${id}@example.test`;
  const csrfToken = `csrf-${id}`;
  let registered = false;
  let mockState = emptyState();

  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.route('**/auth/csrf', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken }),
      headers: { 'set-cookie': `lov2_csrf=${csrfToken}; Path=/; SameSite=Lax` },
    });
  });

  await page.route('**/auth/register', async (route) => {
    const request = route.request();
    expect(request.headers()['x-csrf-token']).toBe(csrfToken);
    const body = request.postDataJSON() as { email: string };
    expect(body.email).toBe(email);
    registered = true;
    mockState = bootstrapState({ email, character: null });

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'u-create',
          email,
          displayName: 'Тестер',
          createdAt: new Date().toISOString(),
        },
      }),
    });
  });

  await page.route('**/game/bootstrap', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(registered ? mockState : emptyState()),
    });
  });

  await page.route('**/characters', async (route) => {
    const request = route.request();
    expect(request.headers()['x-csrf-token']).toBe(csrfToken);
    const body = request.postDataJSON() as { name: string; raceId: string };

    mockState = bootstrapState({
      email,
      character: {
        id: 'c-create',
        userId: 'u-create',
        name: body.name,
        raceId: body.raceId,
        level: 1,
        experience: 0,
        rebirths: 0,
        health: 166,
        maxHealth: 166,
        unspentStatPoints: 0,
        stats: { сила: 12, ловкость: 10, интуиция: 10, удача: 8 },
        gold: 120,
        gems: 2,
        energy: 8,
        maxEnergy: 10,
        energyUpdatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    });

    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(mockState) });
  });

  await page.route('**/quests/tavern-first-contract/accept', async (route) => {
    mockState = {
      ...mockState,
      questProgress: [
        {
          id: 'qp-1',
          characterId: 'c-create',
          questId: 'tavern-first-contract',
          status: 'active',
          progress: 0,
          target: 1,
        },
      ],
    };
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(mockState) });
  });

  await page.route('**/travel/start', async (route) => {
    const body = route.request().postDataJSON() as { locationId: string; questId?: string };
    const now = Date.now();
    mockState = {
      ...mockState,
      character: mockState.character && {
        ...mockState.character,
        energy: 8,
        energyUpdatedAt: new Date(now).toISOString(),
      },
      travels: [
        {
          id: 'travel-1',
          characterId: 'c-create',
          locationId: body.locationId,
          questId: body.questId,
          status: 'traveling',
          startedAt: new Date(now - 5000).toISOString(),
          completesAt: new Date(now - 1000).toISOString(),
        },
      ],
    };
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(mockState) });
  });

  await page.route('**/energy/refill', async (route) => {
    const request = route.request();
    expect(request.headers()['x-csrf-token']).toBe(csrfToken);
    expect(request.postDataJSON()).toEqual({ mode: 'gems' });
    mockState = {
      ...mockState,
      character: mockState.character && {
        ...mockState.character,
        gems: Math.max(0, mockState.character.gems - 1),
        energy: mockState.character.maxEnergy,
        energyUpdatedAt: new Date().toISOString(),
      },
    };
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(mockState) });
  });

  await page.route('**/travel/travel-1/claim', async (route) => {
    mockState = {
      ...mockState,
      travels: mockState.travels.map((travel) => ({ ...travel, status: 'claimed' })),
      combats: [
        {
          id: 'combat-1',
          characterId: 'c-create',
          enemyId: 'mist-bandit',
          questId: 'tavern-first-contract',
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      ],
    };
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(mockState) });
  });

  await page.route('**/combat/combat-1/resolve', async (route) => {
    mockState = {
      ...mockState,
      character: mockState.character && {
        ...mockState.character,
        level: 2,
        experience: 90,
        gold: 165,
        unspentStatPoints: 4,
      },
      questProgress: mockState.questProgress.map((quest) => ({ ...quest, status: 'completed', progress: 1 })),
      combats: [
        {
          id: 'combat-1',
          characterId: 'c-create',
          enemyId: 'mist-bandit',
          questId: 'tavern-first-contract',
          status: 'won',
          createdAt: new Date().toISOString(),
          log: {
            winner: 'character',
            turns: [
              { turn: 1, actor: 'character', damage: 42, critical: false, targetHealth: 13 },
              { turn: 1, actor: 'enemy', damage: 8, critical: false, targetHealth: 158 },
              { turn: 2, actor: 'character', damage: 44, critical: true, targetHealth: 0 },
            ],
            reward: { experience: 90, gold: 45, gems: 0, itemIds: ['duelist-rapier'] },
          },
        },
      ],
    };
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(mockState) });
  });

  await page.goto('/');
  await page.getByLabel('Почта').fill(email);
  await page.getByLabel('Имя').fill('Тестер');
  await page.getByLabel('Пароль').fill('StrongPass123!');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();

  await expect(page.getByRole('heading', { name: 'Создайте героя' })).toBeVisible();
  await page.locator('.creation-form input').fill(`Hero${id.slice(0, 8)}`);
  await page.getByRole('button', { name: 'Начать' }).click();

  await expect(page.getByTestId('game-shell')).toBeVisible();
  await expect(page.getByTestId('game-topbar')).toBeVisible();
  await expect(page.getByTestId('world-stage')).toBeVisible();
  await expect(page.getByTestId('icon-dock')).toBeVisible();
  await expect(page.getByTestId('right-action-dock')).toBeVisible();
  await expect(page.getByTestId('left-meta-rail')).toBeVisible();
  await expect(page.getByTestId('friend-carousel')).toBeVisible();
  await expect(page.getByTestId('character-cluster')).toBeVisible();
  await expect(page.getByTestId('character-portrait')).toBeVisible();
  await expect(page.getByTestId('character-info-button')).toBeVisible();
  await expect(page.getByTestId('level-badge')).toHaveText('1');
  await expect(page.getByTestId('hud-xp')).toBeVisible();
  await expect(page.getByTestId('hud-gold')).toBeVisible();
  await expect(page.getByTestId('hud-gems')).toBeVisible();
  await expect(page.getByTestId('hud-energy')).toBeVisible();
  await expect(page.getByTestId('add-currency-button')).toBeVisible();
  await expect(page.getByTestId('quest-ribbons')).toBeVisible();
  await expect(page.getByTestId('task-ribbon-tavern-first-contract')).toBeVisible();
  await expect(page.locator('[data-testid="scene-canvas"], [data-testid="scene-fallback"]').first()).toBeVisible();
  await expect(page.getByTestId('game-error-boundary')).toHaveCount(0);
  await expect(page.locator('.scene-mode-panel')).toHaveCount(0);

  await page.getByTestId('character-portrait').click();
  await expect(page.getByTestId('character-sheet')).toBeVisible();
  await expect(page.getByTestId('inventory-sheet')).toHaveCount(0);
  await page.getByTestId('meta-hub').click();

  await page.getByTestId('character-info-button').click();
  await expect(page.getByTestId('character-info-popup')).toBeVisible();
  await page.locator('.icon-close').click();

  await page.getByTestId('add-currency-button').click();
  await expect(page.getByTestId('store-sheet')).toBeVisible();
  await expect(page.getByTestId('store-popup')).toBeVisible();
  await page.getByTestId('refill-energy-button').click();
  await expect(page.getByTestId('hud-energy')).toContainText('10/10');
  await page.getByTestId('meta-hub').click();

  await page.getByTestId('meta-inventory').click();
  await expect(page.getByTestId('inventory-sheet')).toBeVisible();
  await expect(page.getByTestId('inventory-panel')).toBeVisible();

  await page.getByTestId('meta-pets').click();
  await expect(page.getByTestId('pet-sheet')).toBeVisible();
  await expect(page.getByTestId('pets-panel')).toBeVisible();
  await page.getByTestId('meta-hub').click();

  await page.getByTestId('task-ribbon-tavern-first-contract').click();
  await expect(page.getByTestId('npc-dialog-screen')).toBeVisible();
  await expect(page.getByTestId('task-popup')).toBeVisible();
  await page.getByTestId('task-accept-tavern-first-contract').click();
  await page.getByTestId('task-travel-tavern-first-contract').click();
  await expect(page.getByTestId('travel-panel')).toBeVisible();
  await page.getByTestId('claim-travel-button').click();
  await expect(page.getByTestId('combat-command-panel')).toBeVisible();
  await expect(page.getByTestId('combat-corner-ui')).toBeVisible();
  await expect(page.getByTestId('combat-player-info')).toBeVisible();
  await expect(page.getByTestId('combat-enemy-info')).toBeVisible();
  await expect(page.getByTestId('pet-assist-button')).toBeVisible();
  await page.getByTestId('combat-enemy-info').click();
  await expect(page.getByTestId('enemy-info-popup')).toBeVisible();
  await page.locator('.icon-close').click();
  await page.getByTestId('resolve-combat-button').click();
  await expect(page.getByTestId('combat-replay-panel')).toBeVisible();
  await expect(page.getByTestId('combat-skip-button')).toBeVisible();
  await page.getByTestId('combat-skip-button').click();
  await expect(page.getByTestId('reward-screen')).toBeVisible();
  await expect(page.getByTestId('reward-panel')).toBeVisible();
  await expect(page.getByText('Победа')).toBeVisible();

  expect(await page.locator('body').innerText()).toContain('Итоги боя');
  expect(pageErrors).toEqual([]);
});

function bootstrapState({
  email,
  character,
}: {
  email: string;
  character: Character | null;
}): BootstrapState {
  return {
    user: {
      id: 'u-create',
      email,
      displayName: 'Тестер',
      createdAt: new Date().toISOString(),
    },
    character,
    races: [
      {
        id: 'nocturne',
        nameRu: 'Ноктюрн',
        descriptionRu: 'Выдерживает долгие дуэли.',
        passiveRu: '+10 к здоровью.',
        baseStats: { сила: 12, ловкость: 10, интуиция: 10, удача: 8 },
      },
    ],
    ...baseGameData(),
    inventory: [],
    questProgress: [],
    travels: [],
    combats: [],
  };
}

function emptyState(): BootstrapState {
  return {
    user: null,
    character: null,
    races: [],
    ...baseGameData(),
    inventory: [],
    questProgress: [],
    travels: [],
    combats: [],
  };
}

function baseGameData() {
  return {
    items: [
      {
        id: 'duelist-rapier',
        nameRu: 'Рапира дуэлянта',
        descriptionRu: 'Легкий клинок.',
        iconAssetId: 'icon-rapier',
        slot: 'weapon',
        rarity: 'uncommon',
        priceGold: 120,
        statBonus: { сила: 3, ловкость: 2 },
      },
    ],
    quests: [
      {
        id: 'tavern-first-contract',
        titleRu: 'Первый ночной контракт',
        descriptionRu: 'Прогнать налетчика с мостовой.',
        locationId: 'old-tavern',
        enemyId: 'mist-bandit',
        energyCost: 2,
        reward: { experience: 90, gold: 45, gems: 0, itemIds: ['duelist-rapier'] },
      },
    ],
    locations: [
      {
        id: 'old-tavern',
        nameRu: 'Старая таверна',
        descriptionRu: 'Короткий маршрут к первому бою.',
        travelSeconds: 1,
        sceneAssetId: 'scene-tavern',
      },
    ],
    enemies: [
      {
        id: 'mist-bandit',
        nameRu: 'Туманный налетчик',
        level: 1,
        health: 55,
        boss: false,
        stats: { сила: 6, ловкость: 5, интуиция: 4, удача: 3 },
        reward: { experience: 70, gold: 35, gems: 0, itemIds: ['duelist-rapier'] },
      },
    ],
    scenes: [],
  };
}
