import { expect, test, type Locator, type Page } from '@playwright/test';
import { gameData } from '@lov2/game-data';
import type { BootstrapState, CombatEncounter, CombatLog } from '@lov2/shared';

const NOW = '2026-04-22T12:00:00.000Z';

for (const viewport of [
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1600, height: 900, label: '1600x900' },
]) {
  test(`world chrome and compact exercise rail fit the desktop viewport at ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openGame(page, createBootstrapState());

    const topbar = page.getByTestId('game-topbar');
    const bottomTray = page.getByTestId('bottom-tray');
    const exercise = page.getByTestId('exercise-card-courtyard-lanterns');
    const actionDockButton = page.getByTestId('action-journal');
    const infoButton = page.getByTestId('character-info-button');
    const heroCluster = page.getByTestId('character-cluster');
    const xpStrip = page.getByTestId('hud-xp');

    await expect(topbar).toBeVisible();
    await expect(bottomTray).toBeVisible();
    await expect(exercise).toBeVisible();
    await expect(actionDockButton).toBeVisible();
    await expectNoDocumentScroll(page);
    await expectAlmostFullWidth(bottomTray, page.getByTestId('world-stage'));
    await expect(page.locator('.lov-topbar-actions')).toHaveCount(0);

    const exerciseBox = await exercise.boundingBox();
    const actionBox = await actionDockButton.boundingBox();

    expect(exerciseBox).not.toBeNull();
    expect(actionBox).not.toBeNull();
    expect(exerciseBox!.width).toBeLessThanOrEqual(actionBox!.width + 14);
    expect(exerciseBox!.height).toBeLessThanOrEqual(actionBox!.height + 18);

    await expectBelow(exercise, infoButton, 6);
    await expectNoOverlap(heroCluster, xpStrip);
    await expectNoOverlap(page.locator('.lov-topbar-left'), page.getByTestId('hud-resource-strip'));
    await expectSameRow(page.locator('.lov-friend-card'));

    const fountainWrap = page.locator(".scene-hotspot-wrap[data-hotspot-id='hub-fountain']");
    const arenaWrap = page.locator(".scene-hotspot-wrap[data-hotspot-id='hub-arena']");
    await page.getByTestId('hotspot-hub-fountain').hover();
    await expect(fountainWrap.locator('.hotspot-label')).toHaveCSS('opacity', '1');
    await expectLayerAbove(fountainWrap, arenaWrap);

    await infoButton.click();
    const heroInfoWindow = page.getByTestId('character-info-popup');
    await expect(heroInfoWindow).toBeVisible();
    await expect(heroInfoWindow.getByTestId('hero-info-stat-health')).toBeVisible();
    await expect(heroInfoWindow.getByTestId('hero-info-stat-armor')).toBeVisible();
    await expect(heroInfoWindow.getByTestId('world-window-bottom-close')).toBeVisible();
    await expect(heroInfoWindow.locator('.lov-profile-header img')).toHaveAttribute(
      'src',
      '/assets/generated/characters/character-face-portrait.jpg',
    );
    await expectContained(heroInfoWindow, page.getByTestId('world-stage'));
    await expectWiderThan(
      heroInfoWindow.getByTestId('hero-info-stat-health'),
      heroInfoWindow.getByTestId('hero-info-stat-strength'),
    );
    await expectWiderThan(
      heroInfoWindow.getByTestId('hero-info-stat-armor'),
      heroInfoWindow.getByTestId('hero-info-stat-agility'),
    );
    await expect(heroInfoWindow.getByText('ATK')).toHaveCount(0);
    await expectContained(
      heroInfoWindow.locator('.lov-paperdoll-hero'),
      heroInfoWindow.locator('.lov-paperdoll-center'),
    );
    await expect(page.getByTestId('profile-sheet')).toHaveCount(0);
    await heroInfoWindow.getByTestId('world-window-close-button').click();

    await page.getByTestId('add-currency-button').click();
    const paymentWindow = page.getByTestId('payment-window');
    await expect(paymentWindow).toBeVisible();
    await expect(paymentWindow.getByText('1000 золота')).toBeVisible();
    await expect(paymentWindow.getByText('100 жемчужин')).toBeVisible();
    await expect(page.getByTestId('store-sheet')).toHaveCount(0);
    await paymentWindow.getByTestId('world-window-close-button').click();

    await page.getByTestId('action-leaderboard').click();
    const leaderboardWindow = page.getByTestId('leaderboard-window');
    await expect(leaderboardWindow).toBeVisible();
    await expect(leaderboardWindow.locator('.lov-leaderboard-card')).toHaveCount(3);
    await expect(page.getByTestId('profile-sheet')).toHaveCount(0);
    await leaderboardWindow.getByTestId('world-window-close-button').click();
  });
}

test('world windows stay inside the playfield on a narrow desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 576 });
  await openGame(page, createBootstrapState());

  const playfield = page.locator('.stage-main').first();

  await expectTavernAndArenaWindows(page, playfield);

  await page.getByTestId('hotspot-hub-store').click();
  const storeWindow = page.getByTestId('store-sheet');
  await expect(storeWindow).toBeVisible();
  await expectContained(storeWindow, playfield);
  await expect(page.getByTestId('store-item-duelist-rapier')).toBeVisible();
  await storeWindow.getByTestId('world-window-close-button').click();

  await page.getByTestId('hotspot-hub-sign').click();
  await page.getByTestId('hotspot-map-forge').click();
  const forgeWindow = page.getByTestId('forge-window');
  await expect(forgeWindow).toBeVisible();
  await expectContained(forgeWindow, playfield);
  await expect(page.locator('[data-testid="forge-inventory-panel"] > *')).toHaveCount(24);
  await expect(forgeWindow.locator('.lov-grid-item')).toHaveCount(6);
  await expect(forgeWindow.getByTestId('forge-anvil-slot')).toBeVisible();
  await expect(forgeWindow.getByTestId('forge-upgrade-button')).toBeVisible();
  await expect(forgeWindow.getByTestId('forge-upgrade-button')).toBeEnabled();
  await forgeWindow.getByTestId('world-window-close-button').click();

  await page.getByTestId('hotspot-map-tower').click();
  const towerWindow = page.getByTestId('tower-window');
  await expect(towerWindow).toBeVisible();
  await expectContained(towerWindow, playfield);
  await expect(page.locator('.lov-tower-card')).toHaveCount(6);
  await expect(page.locator('.lov-tower-card').last()).toBeVisible();
  await towerWindow.getByTestId('world-window-close-button').click();

  await page.getByTestId('exercise-card-courtyard-lanterns').click();
  const exerciseWindow = page.getByTestId('exercise-detail-window');
  await expect(exerciseWindow).toBeVisible();
  await expectContained(exerciseWindow, playfield);
  await expect(exerciseWindow.getByTestId('world-window-close-button')).toBeVisible();

  await expectNoDocumentScroll(page);
});

test('travel screen hides story prompt and placeholder counters', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openGame(
    page,
    createBootstrapState({
      travels: [
        {
          id: 'travel-clean-ui',
          characterId: 'character-1',
          locationId: gameData.quests[0]!.locationId,
          questId: gameData.quests[0]!.id,
          status: 'traveling',
          startedAt: new Date(Date.parse(NOW) - 1000).toISOString(),
          completesAt: new Date(Date.parse(NOW) + 30000).toISOString(),
        },
      ],
    }),
  );

  const travelScreen = page.getByTestId('travel-screen');
  await expect(travelScreen).toBeVisible();
  await expect(travelScreen.locator('.lov-travel-story')).toBeHidden();
  await expect(travelScreen.locator('.lov-travel-sidecard')).toHaveCount(1);
  await expect(travelScreen.getByText('0/5')).toHaveCount(0);
  await expect(travelScreen.getByText('0/1')).toHaveCount(0);
});

test('tavern quests and arena actions stay visible on a wide desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openGame(page, createBootstrapState());

  const playfield = page.locator('.stage-main').first();

  await expectTavernAndArenaWindows(page, playfield);
});

test('sheet close control and bag slot count stay reachable on a narrow desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 576 });
  await openGame(page, createBootstrapState());

  await page.getByTestId('character-portrait').click();

  const playfield = page.locator('.stage-main').first();
  const sheet = page.locator('.lov-sheet');

  await expect(sheet).toBeVisible();
  await expectContained(sheet, playfield);
  await expect(page.getByTestId('sheet-close-button')).toBeVisible();
  await expect(page.getByTestId('character-tab-profile')).toBeHidden();
  await expect(page.getByTestId('game-topbar')).toHaveCount(0);
  await expect(page.getByTestId('bottom-tray')).toHaveCount(0);

  await page.getByTestId('character-tab-equipment').click();
  await expect(page.locator('[data-testid="inventory-panel"] > *')).toHaveCount(24);

  await page.getByTestId('sheet-close-button').click();
  await expect(page.locator('.lov-sheet')).toHaveCount(0);
  await expectNoDocumentScroll(page);
});

test('combat and reward stay inside the battlefield shell', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openGame(page, createCombatState(0));

  const playfield = page.locator('.stage-main').first();

  await expect(page.getByTestId('combat-screen')).toBeVisible();
  await expect(page.getByTestId('combat-skip-button')).toBeVisible();
  await expect(page.getByTestId('pet-assist-button')).toBeVisible();
  await expect(page.locator('.lov-fighter.hero')).toBeVisible();
  await expect(page.locator('.lov-fighter.enemy')).toBeVisible();
  await expect(page.locator('.lov-combat-header.enemy')).toContainText('Роман');
  await expect(page.locator('.lov-combat-avatar.enemy img')).toHaveAttribute(
    'src',
    '/assets/generated/enemies/enemy-mist-bandit.png',
  );
  await expect(page.locator('.lov-fighter.enemy')).toHaveAttribute(
    'src',
    '/assets/generated/enemies/enemy-mist-bandit.png',
  );
  await expect(page.getByTestId('bottom-tray')).toBeVisible();

  await page.getByTestId('combat-enemy-info-button').click();
  const enemyInfoWindow = page.getByTestId('enemy-info-popup');
  await expect(enemyInfoWindow).toBeVisible();
  await expect(enemyInfoWindow.getByTestId('enemy-info-stat-health')).toContainText('55');
  await expect(enemyInfoWindow.getByTestId('enemy-info-stat-armor')).toContainText('3');
  await expect(enemyInfoWindow.getByTestId('enemy-info-stat-strength')).toContainText('6');
  await expect(enemyInfoWindow.getByTestId('enemy-info-stat-luck')).toContainText('3');
  await expect(enemyInfoWindow.locator('.lov-enemy-info-portrait img')).toHaveAttribute(
    'src',
    '/assets/generated/enemies/enemy-mist-bandit.png',
  );
  await enemyInfoWindow.getByTestId('world-window-bottom-close').click();

  await page.getByTestId('pet-assist-button').click();
  await expect(page.getByTestId('combat-summoned-pet')).toBeVisible();

  await page.getByTestId('combat-skip-button').click();
  const rewardWindow = page.getByTestId('reward-screen');
  await expect(rewardWindow).toBeVisible();
  await expectContained(rewardWindow, playfield);
  await expect(page.getByTestId('reward-continue-button')).toBeVisible();
});

test('lost combat shows a defeat result without zero rewards', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openGame(page, createLostCombatState());

  await page.getByTestId('combat-skip-button').click();

  const rewardWindow = page.getByTestId('reward-screen');
  await expect(rewardWindow).toBeVisible();
  await expect(rewardWindow.getByRole('heading', { name: '\u041f\u043e\u0440\u0430\u0436\u0435\u043d\u0438\u0435!' })).toBeVisible();
  await expect(rewardWindow.locator('.lov-victory-rewards')).toHaveCount(0);
  await expect(rewardWindow.locator('.lov-reward-drop')).toHaveCount(0);
  await expect(rewardWindow.locator('.lov-pet-xp')).toHaveCount(0);
  await expect(page.getByTestId('reward-continue-button')).toBeVisible();
});

async function expectTavernAndArenaWindows(page: Page, playfield: Locator) {
  await page.getByTestId('hotspot-hub-tavern').click();
  const tavernWindow = page.getByTestId('tavern-window');
  const tavernTasks = tavernWindow.locator('[data-testid^="task-ribbon-"]');
  const stage = page.getByTestId('world-stage');
  await expect(tavernWindow).toBeVisible();
  await expect(stage).toHaveClass(/(?:^| )stage-mode-world(?: |$)/);
  await expect(stage).not.toHaveClass(/stage-mode-worldWindow/);
  await expectContained(tavernWindow, playfield);
  await expect(tavernTasks).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) {
    await expect(tavernTasks.nth(index)).toBeVisible();
  }
  await tavernWindow.getByTestId('world-window-close-button').click();

  await page.getByTestId('hotspot-hub-arena').click();
  const arenaWindow = page.getByTestId('arena-window');
  const arenaStats = arenaWindow.locator('.lov-arena-stat');
  const arenaSwitchButton = arenaWindow.getByTestId('arena-switch-button');
  const arenaStartButton = arenaWindow.getByTestId('arena-start-button');
  await expect(arenaWindow).toBeVisible();
  await expectContained(arenaWindow, page.getByTestId('world-stage'));
  await expect(arenaWindow.getByText('1 \u0443\u0440\u043e\u0432\u0435\u043d\u044c')).toBeVisible();
  await expect(arenaWindow.getByTestId('arena-stat-health')).toContainText('55');
  await expect(arenaWindow.getByTestId('arena-stat-strength')).toContainText('6');
  await expect(arenaWindow.locator('.lov-arena-preview img')).toHaveAttribute(
    'src',
    '/assets/generated/enemies/enemy-mist-bandit.png',
  );
  await expect(arenaWindow.getByText('ATK')).toHaveCount(0);
  await expect(arenaWindow.getByText('DEX')).toHaveCount(0);
  await expect(arenaStats).toHaveCount(6);
  await expect(arenaSwitchButton).toBeVisible();
  await expect(arenaStartButton).toBeVisible();
  await expect(arenaWindow.getByTestId('world-window-close-button')).toHaveCount(0);
  await expect(arenaWindow.getByTestId('world-window-bottom-close')).toBeVisible();
  await expect(arenaStats.nth(4)).toBeVisible();
  await expect(arenaStats.nth(5)).toBeVisible();
  await expectNoOverlap(arenaStats.nth(2), arenaSwitchButton);
  await expectNoOverlap(arenaStats.nth(3), arenaStartButton);
  await expectNoOverlap(arenaStats.nth(4), arenaSwitchButton);
  await expectNoOverlap(arenaStats.nth(5), arenaStartButton);
  await arenaWindow.getByTestId('world-window-bottom-close').click();
}

async function openGame(page: Page, state: BootstrapState) {
  await mockApi(page, state);
  await page.goto('/');
  await expect(page.getByTestId('game-shell')).toBeVisible();
}

async function mockApi(page: Page, state: BootstrapState) {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());

    if (
      !['localhost', '127.0.0.1', 'api'].includes(url.hostname)
      || url.port !== '4000'
    ) {
      await route.continue();
      return;
    }

    const { pathname } = url;

    if (pathname === '/auth/csrf') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ csrfToken: 'test-csrf-token' }),
      });
      return;
    }

    if (pathname === '/auth/logout') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(state),
    });
  });
}

function createBootstrapState(overrides: Partial<BootstrapState> = {}): BootstrapState {
  const userId = 'user-1';
  const characterId = 'character-1';

  return {
    user: {
      id: userId,
      email: 'tester@example.com',
      displayName: 'Тестер',
      createdAt: NOW,
    },
    character: {
      id: characterId,
      userId,
      name: 'Даррид',
      raceId: gameData.races[0]!.id,
      gender: 'male',
      classId: 'swordsman',
      level: 24,
      experience: 39533,
      rebirths: 1,
      health: 42062,
      maxHealth: 42062,
      unspentStatPoints: 2,
      stats: { сила: 24, ловкость: 19, интуиция: 15, удача: 13 },
      gold: 6152,
      gems: 5,
      energy: 25,
      maxEnergy: 25,
      energyUpdatedAt: NOW,
      createdAt: NOW,
    },
    races: gameData.races,
    items: gameData.items,
    quests: gameData.quests,
    locations: gameData.locations,
    enemies: gameData.enemies,
    scenes: gameData.scenes,
    inventory: [
      {
        id: 'stack-weapon-equipped',
        characterId,
        itemId: 'duelist-rapier',
        quantity: 1,
        enhancementLevel: 2,
        equippedSlot: 'weapon',
      },
      {
        id: 'stack-armor-equipped',
        characterId,
        itemId: 'moon-vest',
        quantity: 1,
        enhancementLevel: 1,
        equippedSlot: 'armor',
      },
      {
        id: 'stack-amulet-equipped',
        characterId,
        itemId: 'lucky-onyx',
        quantity: 1,
        enhancementLevel: 1,
        equippedSlot: 'amulet',
      },
      {
        id: 'stack-pet-equipped',
        characterId,
        itemId: 'ember-whelp',
        quantity: 1,
        equippedSlot: 'pet',
      },
      {
        id: 'stack-weapon-backpack',
        characterId,
        itemId: 'duelist-rapier',
        quantity: 1,
      },
      {
        id: 'stack-armor-backpack',
        characterId,
        itemId: 'moon-vest',
        quantity: 1,
      },
      {
        id: 'stack-onyx-backpack',
        characterId,
        itemId: 'lucky-onyx',
        quantity: 2,
      },
    ],
    questProgress: [
      {
        id: 'quest-progress-1',
        characterId,
        questId: gameData.quests[0]!.id,
        status: 'active',
        progress: 0,
        target: 1,
      },
    ],
    travels: [],
    combats: [],
    ...overrides,
  };
}

function createCombatState(enemyIndex = 2) {
  const enemy = gameData.enemies[enemyIndex] ?? gameData.enemies[2]!;
  const reward = gameData.quests[2]!.reward;
  const combatLog: CombatLog = {
    winner: 'character',
    turns: [
      { turn: 1, actor: 'character', damage: 320, critical: false, targetHealth: 1480 },
      { turn: 2, actor: 'enemy', damage: 110, critical: false, targetHealth: 41952 },
      { turn: 3, actor: 'character', damage: 1480, critical: true, targetHealth: 0 },
    ],
    reward,
  };
  const combats: CombatEncounter[] = [
    {
      id: 'combat-won',
      characterId: 'character-1',
      enemyId: enemy.id,
      status: 'won',
      createdAt: '2026-04-22T11:58:00.000Z',
      log: combatLog,
    },
    {
      id: 'combat-pending',
      characterId: 'character-1',
      enemyId: enemy.id,
      status: 'pending',
      createdAt: NOW,
    },
  ];

  return createBootstrapState({ combats });
}

function createLostCombatState() {
  const combatLog: CombatLog = {
    winner: 'enemy',
    turns: [
      { turn: 1, actor: 'character', damage: 210, critical: false, targetHealth: 1590 },
      { turn: 2, actor: 'enemy', damage: 8200, critical: true, targetHealth: 33862 },
      { turn: 3, actor: 'enemy', damage: 33862, critical: false, targetHealth: 0 },
    ],
    reward: { experience: 0, gold: 0, gems: 0, itemIds: [] },
  };
  const combats: CombatEncounter[] = [
    {
      id: 'combat-lost',
      characterId: 'character-1',
      enemyId: gameData.enemies[2]!.id,
      status: 'lost',
      createdAt: '2026-04-22T11:57:00.000Z',
      log: combatLog,
    },
    {
      id: 'combat-pending',
      characterId: 'character-1',
      enemyId: gameData.enemies[2]!.id,
      status: 'pending',
      createdAt: NOW,
    },
  ];

  return createBootstrapState({ combats });
}

async function expectContained(locator: Locator, container: Locator) {
  const [box, containerBox] = await Promise.all([locator.boundingBox(), container.boundingBox()]);

  expect(box).not.toBeNull();
  expect(containerBox).not.toBeNull();

  expect(box!.x).toBeGreaterThanOrEqual(containerBox!.x - 4);
  expect(box!.y).toBeGreaterThanOrEqual(containerBox!.y - 4);
  expect(box!.x + box!.width).toBeLessThanOrEqual(containerBox!.x + containerBox!.width + 4);
  expect(box!.y + box!.height).toBeLessThanOrEqual(containerBox!.y + containerBox!.height + 4);
}

async function expectBelow(locator: Locator, anchor: Locator, minGap = 0) {
  const [box, anchorBox] = await Promise.all([locator.boundingBox(), anchor.boundingBox()]);

  expect(box).not.toBeNull();
  expect(anchorBox).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(anchorBox!.y + anchorBox!.height + minGap);
}

async function expectWiderThan(wide: Locator, narrow: Locator) {
  const [wideBox, narrowBox] = await Promise.all([wide.boundingBox(), narrow.boundingBox()]);

  expect(wideBox).not.toBeNull();
  expect(narrowBox).not.toBeNull();
  expect(wideBox!.width).toBeGreaterThan(narrowBox!.width * 1.55);
}

async function expectAlmostFullWidth(locator: Locator, container: Locator) {
  const [box, containerBox] = await Promise.all([locator.boundingBox(), container.boundingBox()]);

  expect(box).not.toBeNull();
  expect(containerBox).not.toBeNull();
  expect(box!.width).toBeGreaterThan(containerBox!.width * 0.9);
}

async function expectLayerAbove(top: Locator, bottom: Locator) {
  const [topZ, bottomZ] = await Promise.all([
    top.evaluate((element) => Number(window.getComputedStyle(element).zIndex)),
    bottom.evaluate((element) => Number(window.getComputedStyle(element).zIndex)),
  ]);

  expect(topZ).toBeGreaterThan(bottomZ);
}

async function expectNoOverlap(first: Locator, second: Locator) {
  const [firstBox, secondBox] = await Promise.all([first.boundingBox(), second.boundingBox()]);

  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();

  const intersects =
    firstBox!.x < secondBox!.x + secondBox!.width &&
    firstBox!.x + firstBox!.width > secondBox!.x &&
    firstBox!.y < secondBox!.y + secondBox!.height &&
    firstBox!.y + firstBox!.height > secondBox!.y;

  expect(intersects).toBe(false);
}

async function expectSameRow(items: Locator) {
  const boxes = await items.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, height: rect.height };
    }),
  );

  expect(boxes.length).toBeGreaterThan(1);

  const baseline = boxes[0]!.top;
  for (const box of boxes) {
    expect(Math.abs(box.top - baseline)).toBeLessThanOrEqual(4);
    expect(box.height).toBeGreaterThan(0);
  }
}

async function expectNoDocumentScroll(page: Page) {
  const hasScroll = await page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    return root.scrollHeight > root.clientHeight || root.scrollWidth > root.clientWidth;
  });

  expect(hasScroll).toBe(false);
}
