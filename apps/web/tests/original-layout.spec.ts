import { expect, test, type Locator, type Page, type Route } from '@playwright/test';
import { gameData } from '@lov2/game-data';
import type { BootstrapState, CombatEncounter, CombatLog } from '@lov2/shared';
import { CLASS_OPTIONS } from '../src/game/characterCreationOptions.js';

const NOW = '2026-04-22T12:00:00.000Z';

const RACE_SIGN_ASSET_PATHS = {
  nocturne: '/assets/generated/character-creation/race-signs/race_sign_nocturne.png',
  veiled: '/assets/generated/character-creation/race-signs/race_sign_veiled.png',
  oracle: '/assets/generated/character-creation/race-signs/race_sign_oracle.png',
} as const;

const CHARACTER_CREATION_ASSET_PATHS = {
  male_nocturne_swordsman: '/assets/generated/character-creation/cc_male_nocturne_swordsman.png',
  female_oracle_ranger: '/assets/generated/character-creation/cc_female_oracle_ranger.png',
} as const;

const CHARACTER_AVATAR_ASSET_PATHS = {
  male_nocturne_swordsman: '/assets/generated/character-icons/avatar_male_nocturne_swordsman.png',
  male_nocturne_mystic: '/assets/generated/character-icons/avatar_male_nocturne_mystic.png',
  female_oracle_ranger: '/assets/generated/character-icons/avatar_female_oracle_ranger.png',
} as const;

type CreateCharacterRequest = {
  name: string;
  raceId: string;
  gender: 'male' | 'female';
  classId: 'swordsman' | 'ranger' | 'mage';
};

test('character creation preview is selected-state driven and submits the chosen build', async ({ page }) => {
  const createRequests: CreateCharacterRequest[] = [];
  await page.setViewportSize({ width: 1366, height: 768 });
  await openCreation(page, createBootstrapState({ character: null }), (input) => {
    createRequests.push(input);
  });

  const preview = page.getByTestId('creation-preview');
  const previewCharacter = page.getByTestId('creation-preview-character');
  const previewRaceSign = page.getByTestId('creation-preview-race-sign');
  await expect(page.locator('.lov-creation-ruler')).toHaveCount(0);
  await expect(page.getByText('0%')).toHaveCount(0);
  await expect(page.getByTestId('creation-gender-male')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('creation-race-nocturne')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('creation-class-mage')).toHaveAttribute('aria-pressed', 'true');
  await expect(preview).toHaveAttribute('data-gender', 'male');
  await expect(preview).toHaveAttribute('data-race', 'nocturne');
  await expect(preview).toHaveAttribute('data-class', 'mage');
  await expect(previewCharacter).toHaveAttribute(
    'src',
    '/assets/generated/character-creation/cc_male_nocturne_mystic.png',
  );
  await expect(previewRaceSign).toHaveAttribute('src', RACE_SIGN_ASSET_PATHS.nocturne);
  await expectNoDocumentScroll(page);

  await page.getByTestId('creation-race-veiled').click();
  await expect(page.getByTestId('creation-race-veiled')).toHaveAttribute('aria-pressed', 'true');
  await expect(preview).toHaveAttribute('data-race', 'veiled');
  await expect(previewRaceSign).toHaveAttribute('src', RACE_SIGN_ASSET_PATHS.veiled);

  await page.getByTestId('creation-class-ranger').click();
  await page.getByTestId('creation-gender-female').click();
  await page.getByTestId('creation-race-oracle').click();

  await expect(page.getByTestId('creation-gender-female')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('creation-race-oracle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('creation-class-ranger')).toHaveAttribute('aria-pressed', 'true');
  await expect(preview).toHaveAttribute('data-gender', 'female');
  await expect(preview).toHaveAttribute('data-race', 'oracle');
  await expect(preview).toHaveAttribute('data-class', 'ranger');
  await expect(previewCharacter).toHaveAttribute(
    'src',
    '/assets/generated/character-creation/cc_female_oracle_ranger.png',
  );
  await expect(previewRaceSign).toHaveAttribute('src', RACE_SIGN_ASSET_PATHS.oracle);

  await page.evaluate(() => {
    const values = [0, 0, 0, 0.5];
    let index = 0;
    Math.random = () => values[index++ % values.length]!;
  });
  await page.getByTestId('creation-random').click();
  await expect(page.getByTestId('creation-name-input')).toHaveValue('Каэл');
  await expect(page.getByTestId('creation-gender-male')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('creation-race-nocturne')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('creation-class-swordsman')).toHaveAttribute('aria-pressed', 'true');
  await expect(preview).toHaveAttribute('data-gender', 'male');
  await expect(preview).toHaveAttribute('data-race', 'nocturne');
  await expect(preview).toHaveAttribute('data-class', 'swordsman');
  await expect(previewCharacter).toHaveAttribute(
    'src',
    '/assets/generated/character-creation/cc_male_nocturne_swordsman.png',
  );
  await expect(previewRaceSign).toHaveAttribute('src', RACE_SIGN_ASSET_PATHS.nocturne);

  await page.getByTestId('creation-class-mage').click();
  await expect(page.getByTestId('creation-class-mage')).toHaveAttribute('aria-pressed', 'true');
  await expect(preview).toHaveAttribute('data-class', 'mage');
  await expect(previewCharacter).toHaveAttribute(
    'src',
    '/assets/generated/character-creation/cc_male_nocturne_mystic.png',
  );
  await expect(previewRaceSign).toHaveAttribute('src', RACE_SIGN_ASSET_PATHS.nocturne);
  await page.getByTestId('creation-submit').click();
  await expect.poll(() => createRequests.length).toBe(1);
  expect(createRequests[0]).toMatchObject({
    name: 'Каэл',
    raceId: 'nocturne',
    gender: 'male',
    classId: 'mage',
  });
  expect(createRequests[0]?.classId).not.toBe('mystic');
});

test('created character identity is reflected in the next game screen', async ({ page }) => {
  const createRequests: CreateCharacterRequest[] = [];
  await page.setViewportSize({ width: 1366, height: 768 });
  await openCreation(page, createBootstrapState({ character: null }), (input) => {
    createRequests.push(input);
  });

  await page.getByTestId('creation-name-input').fill('Custom Test Name');
  await page.getByTestId('creation-gender-female').click();
  await page.getByTestId('creation-race-oracle').click();
  await page.getByTestId('creation-class-ranger').click();
  await page.getByTestId('creation-submit').click();

  await expect(page.getByTestId('game-shell')).toBeVisible();
  await expect.poll(() => createRequests.length).toBe(1);
  expect(createRequests[0]).toMatchObject({
    name: 'Custom Test Name',
    raceId: 'oracle',
    gender: 'female',
    classId: 'ranger',
  });

  const oracleRace = gameData.races.find((race) => race.id === 'oracle')!;
  const rangerClass = CLASS_OPTIONS.find((entry) => entry.id === 'ranger')!;

  await expect(page.getByTestId('topbar-character-name')).toHaveText('Custom Test Name');
  const hudPortrait = page.getByTestId('character-portrait-image');
  await expect(hudPortrait).toBeVisible();
  await expect(hudPortrait).toHaveAttribute('src', CHARACTER_AVATAR_ASSET_PATHS.female_oracle_ranger);
  await expect(hudPortrait).not.toHaveAttribute('src', /\/assets\/generated\/character-creation\/cc_/);

  await page.getByTestId('character-info-button').click();
  const heroInfoWindow = page.getByTestId('character-info-popup');
  await expect(heroInfoWindow).toBeVisible();
  await expect(heroInfoWindow.locator('.lov-profile-header strong')).toHaveText('Custom Test Name');
  await expect(heroInfoWindow.locator('.lov-profile-header span')).toContainText(oracleRace.nameRu);
  await expect(heroInfoWindow.locator('.lov-profile-header span')).toContainText(rangerClass.label);
  await expect(heroInfoWindow.getByTestId('hero-info-character-image')).toHaveAttribute(
    'src',
    CHARACTER_AVATAR_ASSET_PATHS.female_oracle_ranger,
  );
  await expect(heroInfoWindow.getByTestId('hero-info-race-sign')).toHaveCount(0);
  await expect(heroInfoWindow.getByTestId('paperdoll-character-image')).toHaveAttribute(
    'src',
    CHARACTER_CREATION_ASSET_PATHS.female_oracle_ranger,
  );
});

test('main HUD portrait uses avatar assets and maps mage to mystic', async ({ page }) => {
  const baseState = createBootstrapState();
  await page.setViewportSize({ width: 1366, height: 768 });
  await openGame(page, createBootstrapState({
    character: {
      ...baseState.character!,
      classId: 'mage',
    },
  }));

  const hudPortrait = page.getByTestId('character-portrait-image');
  await expect(hudPortrait).toBeVisible();
  await expect(hudPortrait).toHaveAttribute('src', CHARACTER_AVATAR_ASSET_PATHS.male_nocturne_mystic);
  await expect(hudPortrait).not.toHaveAttribute('src', /\/assets\/generated\/character-creation\/cc_/);
});

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
    const logoutButton = page.getByTestId('logout-button');
    const heroCluster = page.getByTestId('character-cluster');
    const xpStrip = page.getByTestId('hud-xp');
    const resourceStrip = page.getByTestId('hud-resource-strip');
    const goldPill = page.getByTestId('hud-gold');
    const gemsPill = page.getByTestId('hud-gems');
    const addButton = page.getByTestId('add-currency-button');

    await expect(topbar).toBeVisible();
    await expect(bottomTray).toBeVisible();
    await expect(exercise).toBeVisible();
    await expect(actionDockButton).toBeVisible();
    await expect(logoutButton).toBeVisible();
    await expect(goldPill).toBeVisible();
    await expect(gemsPill).toBeVisible();
    await expect(addButton).toBeVisible();
    await expectNoDocumentScroll(page);
    await expectContained(topbar, page.getByTestId('world-stage'));
    await expectContained(xpStrip, topbar);
    await expectContained(resourceStrip, topbar);
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
    await expectNoOverlap(page.locator('.lov-topbar-left'), resourceStrip);
    await expectNoOverlap(xpStrip, resourceStrip);
    await expectHorizontalGapLessThan(xpStrip, resourceStrip, 16);
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
    await expect(heroInfoWindow.getByTestId('hero-info-character-image')).toHaveAttribute(
      'src',
      CHARACTER_AVATAR_ASSET_PATHS.male_nocturne_swordsman,
    );
    await expectContained(heroInfoWindow, page.getByTestId('world-stage'));
    await expectContained(heroInfoWindow.locator('.lov-hero-info-layout'), heroInfoWindow.locator('.lov-window-body'));
    await expectContained(
      heroInfoWindow.locator('.lov-profile-screen-window .lov-profile-stats'),
      heroInfoWindow.locator('.lov-profile-screen-window'),
    );
    await expectContained(heroInfoWindow.locator('.lov-paperdoll-center'), heroInfoWindow.locator('.lov-hero-info-side'));
    await expectMaxHeightRatio(
      heroInfoWindow.locator('.lov-profile-screen-window .lov-profile-stats'),
      heroInfoWindow.locator('.lov-profile-screen-window'),
      0.38,
    );
    await expectMaxWidthRatio(
      heroInfoWindow.locator('.lov-paperdoll-center'),
      heroInfoWindow.locator('.lov-hero-info-side'),
      0.78,
    );
    await expectContained(heroInfoWindow.getByTestId('world-window-close-button'), heroInfoWindow);
    await expectContained(heroInfoWindow.getByTestId('world-window-bottom-close'), heroInfoWindow);
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

  await expectTavernAndArenaWindows(page);

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
  const startedAt = Date.now();
  const travelState = createBootstrapState({
    travels: [
      {
        id: 'travel-clean-ui',
        characterId: 'character-1',
        locationId: gameData.quests[0]!.locationId,
        questId: gameData.quests[0]!.id,
        status: 'traveling',
        startedAt: new Date(startedAt - 1000).toISOString(),
        completesAt: new Date(startedAt + 30000).toISOString(),
      },
    ],
  });
  let startTravelRequests = 0;
  await openGame(page, createBootstrapState(), {
    onApiRequest: async (pathname, route) => {
      if (pathname === '/travel/start' && route.request().method() === 'POST') {
        startTravelRequests += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(travelState),
        });
        return true;
      }
      return false;
    },
  });

  await page.getByTestId('hotspot-hub-tavern').click();
  await page.getByTestId(`task-ribbon-${gameData.quests[0]!.id}`).click();
  await expect.poll(() => startTravelRequests).toBe(1);

  const travelScreen = page.getByTestId('travel-screen');
  const travelMap = page.getByTestId('travel-map-layer');
  const heroMarker = page.getByTestId('travel-hero-marker');
  await expect(travelScreen).toBeVisible();
  await expect(travelMap).toBeVisible();
  await expect(travelMap).toHaveAttribute(
    'src',
    '/assets/generated/travel-maps/travel_map_ruined_coast_pan_01.png',
  );
  await expect(heroMarker).toBeVisible();
  await expectContained(travelScreen, page.getByTestId('world-stage'));
  await expectContained(heroMarker, travelScreen);
  await expectTravelMapMotion(travelMap);
  await expect(travelScreen.locator('.lov-travel-story')).toBeHidden();
  await expect(travelScreen.locator('.lov-travel-sidecard')).toHaveCount(0);
  await expect(travelScreen.getByTestId('travel-character-image')).toHaveAttribute(
    'src',
    CHARACTER_AVATAR_ASSET_PATHS.male_nocturne_swordsman,
  );
  await expect(travelScreen.getByText('0/5')).toHaveCount(0);
  await expect(travelScreen.getByText('0/1')).toHaveCount(0);
});

test('tavern quests and arena actions stay visible on a wide desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openGame(page, createBootstrapState());

  await expectTavernAndArenaWindows(page);
});

test('failed travel start keeps the player in world', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  let startTravelRequests = 0;
  await openGame(page, createBootstrapState(), {
    onApiRequest: async (pathname, route) => {
      if (pathname === '/travel/start' && route.request().method() === 'POST') {
        startTravelRequests += 1;
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Недостаточно энергии для этого маршрута' }),
        });
        return true;
      }
      return false;
    },
  });

  await page.getByTestId('hotspot-hub-tavern').click();
  await page.getByTestId(`task-ribbon-${gameData.quests[0]!.id}`).click();

  await expect.poll(() => startTravelRequests).toBe(1);
  await expect(page.getByTestId('world-stage')).toHaveClass(/(?:^| )stage-mode-world(?: |$)/);
  await expect(page.getByTestId('travel-screen')).toHaveCount(0);
  await expect(page.getByTestId('tavern-window')).toBeVisible();
  await expect(page.getByTestId('game-message')).toHaveCount(0);
});

test('successful travel start switches to travel', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const travelState = createBootstrapState({
    travels: [
      {
        id: 'travel-success',
        characterId: 'character-1',
        locationId: gameData.quests[0]!.locationId,
        questId: gameData.quests[0]!.id,
        status: 'traveling',
        startedAt: new Date(Date.now()).toISOString(),
        completesAt: new Date(Date.now() + 30000).toISOString(),
      },
    ],
  });
  await openGame(page, createBootstrapState(), {
    onApiRequest: async (pathname, route) => {
      if (pathname === '/travel/start' && route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(travelState),
        });
        return true;
      }
      return false;
    },
  });

  await page.getByTestId('hotspot-hub-tavern').click();
  await page.getByTestId(`task-ribbon-${gameData.quests[0]!.id}`).click();

  await expect(page.getByTestId('world-stage')).toHaveClass(/(?:^| )stage-mode-travel(?: |$)/);
  await expect(page.getByTestId('travel-screen')).toBeVisible();
  await expect(page.getByTestId('game-message')).toHaveCount(0);
});

test('busy travel start disables duplicate contract clicks', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  let startTravelRequests = 0;
  let releaseStartTravel!: () => void;
  const startTravelPending = new Promise<void>((resolve) => {
    releaseStartTravel = resolve;
  });

  await openGame(page, createBootstrapState(), {
    onApiRequest: async (pathname, route) => {
      if (pathname === '/travel/start' && route.request().method() === 'POST') {
        startTravelRequests += 1;
        await startTravelPending;
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Маршрут временно закрыт' }),
        });
        return true;
      }
      return false;
    },
  });

  await page.getByTestId('hotspot-hub-tavern').click();
  const firstTask = page.getByTestId(`task-ribbon-${gameData.quests[0]!.id}`);
  await firstTask.click();
  await expect(firstTask).toBeDisabled();
  await expect.poll(() => startTravelRequests).toBe(1);
  releaseStartTravel();
  await expect(page.getByTestId('game-message')).toHaveCount(0);
  expect(startTravelRequests).toBe(1);
});

test('failed travel claim keeps the player in travel', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openGame(
    page,
    createBootstrapState({
      travels: [
        {
          id: 'travel-claim-fail',
          characterId: 'character-1',
          locationId: gameData.quests[0]!.locationId,
          questId: gameData.quests[0]!.id,
          status: 'traveling',
          startedAt: new Date(Date.now() - 1000).toISOString(),
          completesAt: new Date(Date.now() + 30000).toISOString(),
        },
      ],
    }),
    {
      onApiRequest: async (pathname, route) => {
        if (pathname === '/travel/travel-claim-fail/claim' && route.request().method() === 'POST') {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Недостаточно жемчужин для ускорения' }),
          });
          return true;
        }
        return false;
      },
    },
  );

  await page.getByTestId('travel-rush-button').click();

  await expect(page.getByTestId('world-stage')).toHaveClass(/(?:^| )stage-mode-travel(?: |$)/);
  await expect(page.getByTestId('combat-screen')).toHaveCount(0);
  await expect(page.getByTestId('game-message')).toHaveCount(0);
});

test('failed arena start keeps the arena window open', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openGame(page, createBootstrapState(), {
    onApiRequest: async (pathname, route) => {
      if (pathname === '/arena/start' && route.request().method() === 'POST') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Сначала завершите текущее путешествие' }),
        });
        return true;
      }
      return false;
    },
  });

  await page.getByTestId('hotspot-hub-arena').click();
  await page.getByTestId('arena-start-button').click();

  await expect(page.getByTestId('world-stage')).toHaveClass(/(?:^| )stage-mode-world(?: |$)/);
  await expect(page.getByTestId('combat-screen')).toHaveCount(0);
  await expect(page.getByTestId('arena-window')).toBeVisible();
  await expect(page.getByTestId('game-message')).toHaveCount(0);
});

test('store purchase requires dragging class stock into a free backpack slot', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const baseState = createBootstrapState();
  const purchasedState = createBootstrapState({
    inventory: [
      ...baseState.inventory,
      {
        id: 'stack-weapon-purchased',
        characterId: baseState.character!.id,
        itemId: 'duelist-rapier',
        quantity: 1,
      },
    ],
  });
  let purchaseRequests = 0;
  await openGame(page, baseState, {
    onApiRequest: async (pathname, route) => {
      if (pathname === '/shop/purchase' && route.request().method() === 'POST') {
        purchaseRequests += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(purchasedState),
        });
        return true;
      }
      return false;
    },
  });

  await page.getByTestId('hotspot-hub-store').click();
  const storeWindow = page.getByTestId('store-sheet');

  await expect(storeWindow.getByTestId('store-item-duelist-rapier')).toBeVisible();
  await expect(storeWindow.getByTestId('store-item-ember-whelp')).toHaveCount(0);
  await expect(storeWindow.getByTestId('store-item-starter-staff')).toHaveCount(0);

  await storeWindow.getByTestId('store-item-duelist-rapier').click();
  await expect.poll(() => purchaseRequests).toBe(0);
  await expect(storeWindow.getByTestId('store-feedback')).toContainText(/перетаскиванием/i);

  await storeWindow
    .getByTestId('store-item-duelist-rapier')
    .dragTo(storeWindow.locator('[data-testid="inventory-panel"] .lov-grid-empty').first());

  await expect.poll(() => purchaseRequests).toBe(1);
  const rapierName = gameData.items.find((item) => item.id === 'duelist-rapier')!.nameRu;
  const rapierCells = storeWindow.locator('[data-testid="inventory-panel"] .lov-grid-item').filter({ hasText: rapierName });
  await expect(rapierCells).toHaveCount(2);
  await expect(rapierCells.locator('.lov-item-quantity')).toHaveCount(0);
  await expect(page.locator('[data-testid="inventory-panel"] > *')).toHaveCount(24);
});

test('full backpack blocks drag-drop shop purchase without growing slots', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const baseState = createBootstrapState();
  const fullInventory = Array.from({ length: 24 }, (_, index) => ({
    id: `stack-full-${index}`,
    characterId: baseState.character!.id,
    itemId: index % 2 === 0 ? 'duelist-rapier' : 'lucky-onyx',
    quantity: 1,
  }));
  let purchaseRequests = 0;

  await openGame(page, createBootstrapState({ inventory: fullInventory }), {
    onApiRequest: async (pathname) => {
      if (pathname === '/shop/purchase') {
        purchaseRequests += 1;
        return false;
      }
      return false;
    },
  });

  await page.getByTestId('hotspot-hub-store').click();
  const storeWindow = page.getByTestId('store-sheet');
  await expect(storeWindow.getByTestId('store-backpack-capacity')).toHaveText('24/24');
  await expect(storeWindow.locator('[data-testid="inventory-panel"] > *')).toHaveCount(24);

  await storeWindow
    .getByTestId('store-item-duelist-rapier')
    .dragTo(storeWindow.locator('[data-testid="inventory-panel"]').first());

  await expect.poll(() => purchaseRequests).toBe(0);
  await expect(storeWindow.getByTestId('store-feedback')).toContainText(/Рюкзак полон/i);
  await expect(storeWindow.locator('[data-testid="inventory-panel"] > *')).toHaveCount(24);
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
  const combatState = createCombatState(0);
  const assistedCombatLog: CombatLog = {
    winner: 'character',
    turns: [
      { turn: 1, actor: 'pet', damage: 120, critical: false, targetHealth: 430 },
      { turn: 2, actor: 'character', damage: 430, critical: true, targetHealth: 0 },
    ],
    reward: gameData.quests[2]!.reward,
    petId: 'ember-whelp',
    petFoodSpent: 1,
    petExperienceGained: 1,
    petTurns: 1,
  };
  const assistedState: BootstrapState = {
    ...combatState,
    combats: combatState.combats.map((combat) =>
      combat.id === 'combat-pending'
        ? {
            ...combat,
            status: 'won' as const,
            log: assistedCombatLog,
          }
        : combat,
    ),
  };
  await openGame(page, combatState, {
    onApiRequest: async (pathname, route) => {
      if (pathname === '/combat/combat-pending/resolve' && route.request().method() === 'POST') {
        expect(route.request().postDataJSON()).toEqual({ petId: 'ember-whelp' });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(assistedState),
        });
        return true;
      }
      return false;
    },
  });

  const playfield = page.locator('.stage-main').first();
  const battleStage = page.locator('.lov-battle-stage');
  const heroFighter = page.getByTestId('combat-character-fighter');
  const enemyFighter = page.getByTestId('combat-enemy-fighter');
  const heroHealth = page.locator('.lov-combat-header.ally .lov-health-track');
  const enemyHealth = page.locator('.lov-combat-header.enemy .lov-health-track');

  await expect(page.getByTestId('combat-screen')).toBeVisible();
  await expect(page.getByTestId('combat-skip-button')).toBeVisible();
  await expect(page.getByTestId('pet-assist-button')).toBeVisible();
  await expect(page.getByTestId('combat-summoned-pet')).toHaveCount(0);
  await page.getByTestId('pet-assist-button').click();
  await expect(page.getByTestId('combat-summoned-pet')).toBeVisible();
  await expect(heroFighter).toBeVisible();
  await expect(enemyFighter).toBeVisible();
  await expectContained(heroFighter, battleStage);
  await expectContained(enemyFighter, battleStage);
  await expectBottomAligned(heroFighter, battleStage, 30);
  await expectBottomAligned(enemyFighter, battleStage, 30);
  await expectContainBottomObjectFit(heroFighter);
  await expectContainBottomObjectFit(enemyFighter);
  await expectSimilarSize(heroHealth, enemyHealth, 0.08, 0.15);
  await expectContained(page.getByTestId('combat-summoned-pet'), battleStage);
  await expectNoOverlap(page.getByTestId('combat-summoned-pet'), enemyFighter);
  await expect(page.locator('.lov-combat-header.enemy')).toContainText('Роман');
  await expect(page.locator('.lov-combat-avatar.enemy img')).toHaveAttribute(
    'src',
    '/assets/generated/enemies/enemy-mist-bandit.png',
  );
  await expect(enemyFighter).toHaveAttribute(
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

  await expect(page.getByTestId('combat-summoned-pet')).toBeVisible();
  await expectContained(page.getByTestId('combat-summoned-pet'), battleStage);

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

async function expectTavernAndArenaWindows(page: Page) {
  await page.getByTestId('hotspot-hub-tavern').click();
  const tavernWindow = page.getByTestId('tavern-window');
  const tavernTasks = tavernWindow.locator('[data-testid^="task-ribbon-"]');
  const stage = page.getByTestId('world-stage');
  await expect(tavernWindow).toBeVisible();
  await expect(stage).toHaveClass(/(?:^| )stage-mode-world(?: |$)/);
  await expect(stage).not.toHaveClass(/stage-mode-worldWindow/);
  await expectContained(tavernWindow, stage);
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

async function openGame(page: Page, state: BootstrapState, options: MockApiOptions = {}) {
  await mockApi(page, state, options);
  await page.goto('/');
  await expect(page.getByTestId('game-shell')).toBeVisible();
}

async function openCreation(
  page: Page,
  state: BootstrapState,
  onCreateCharacter?: (input: CreateCharacterRequest) => void,
) {
  await mockApi(page, state, { onCreateCharacter });
  await page.goto('/');
  await expect(page.getByTestId('creation-screen')).toBeVisible();
}

async function mockApi(
  page: Page,
  state: BootstrapState,
  options: MockApiOptions = {},
) {
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

    if (await options.onApiRequest?.(pathname, route)) {
      return;
    }

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

    if (pathname === '/characters' && route.request().method() === 'POST') {
      const input = route.request().postDataJSON() as CreateCharacterRequest;
      options.onCreateCharacter?.(input);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createBootstrapState({
          ...state,
          character: {
            ...createBootstrapState().character!,
            userId: state.user?.id ?? 'user-1',
            name: input.name,
            raceId: input.raceId,
            gender: input.gender,
            classId: input.classId,
          },
        })),
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

type MockApiOptions = {
  onCreateCharacter?: (input: CreateCharacterRequest) => void;
  onApiRequest?: (pathname: string, route: Route) => boolean | Promise<boolean>;
};

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
      petFood: 10,
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
    petRoster: gameData.items
      .filter((item) => item.slot === 'pet')
      .map((item, index) => ({
        id: `pet-roster-${item.id}`,
        characterId,
        petId: item.id,
        food: index === 3 ? 16 : 0,
        experience: 0,
        createdAt: NOW,
        updatedAt: NOW,
      })),
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

async function expectBottomAligned(locator: Locator, container: Locator, maxGap: number) {
  const [box, containerBox] = await Promise.all([locator.boundingBox(), container.boundingBox()]);

  expect(box).not.toBeNull();
  expect(containerBox).not.toBeNull();

  const bottomGap = containerBox!.y + containerBox!.height - (box!.y + box!.height);
  expect(bottomGap).toBeGreaterThanOrEqual(-4);
  expect(bottomGap).toBeLessThanOrEqual(maxGap);
}

async function expectContainBottomObjectFit(locator: Locator) {
  const style = await locator.evaluate((element) => {
    const computed = window.getComputedStyle(element);
    return {
      objectFit: computed.objectFit,
      objectPosition: computed.objectPosition,
    };
  });

  expect(style.objectFit).toBe('contain');
  expect(style.objectPosition === '50% 100%' || style.objectPosition.includes('bottom')).toBe(true);
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

async function expectSimilarSize(first: Locator, second: Locator, widthTolerance: number, heightTolerance: number) {
  const [firstBox, secondBox] = await Promise.all([first.boundingBox(), second.boundingBox()]);

  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();

  const widthDelta = Math.abs(firstBox!.width - secondBox!.width);
  const heightDelta = Math.abs(firstBox!.height - secondBox!.height);
  expect(widthDelta).toBeLessThanOrEqual(Math.max(firstBox!.width, secondBox!.width) * widthTolerance);
  expect(heightDelta).toBeLessThanOrEqual(Math.max(firstBox!.height, secondBox!.height) * heightTolerance);
}

async function expectMaxHeightRatio(locator: Locator, container: Locator, maxRatio: number) {
  const [box, containerBox] = await Promise.all([locator.boundingBox(), container.boundingBox()]);

  expect(box).not.toBeNull();
  expect(containerBox).not.toBeNull();
  expect(box!.height).toBeLessThanOrEqual(containerBox!.height * maxRatio);
}

async function expectMaxWidthRatio(locator: Locator, container: Locator, maxRatio: number) {
  const [box, containerBox] = await Promise.all([locator.boundingBox(), container.boundingBox()]);

  expect(box).not.toBeNull();
  expect(containerBox).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(containerBox!.width * maxRatio);
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

async function expectHorizontalGapLessThan(left: Locator, right: Locator, maxGap: number) {
  const [leftBox, rightBox] = await Promise.all([left.boundingBox(), right.boundingBox()]);

  expect(leftBox).not.toBeNull();
  expect(rightBox).not.toBeNull();

  const gap = rightBox!.x - (leftBox!.x + leftBox!.width);
  expect(gap).toBeGreaterThanOrEqual(0);
  expect(gap).toBeLessThanOrEqual(maxGap);
}

async function expectTravelMapMotion(locator: Locator) {
  const style = await locator.evaluate((element) => {
    const computed = window.getComputedStyle(element);
    return {
      animationName: computed.animationName,
      transform: computed.transform,
      transitionProperty: computed.transitionProperty,
    };
  });

  expect(style.animationName).toContain('lov-travel-map-object-pan');
  expect(style.transform).not.toBe('none');
  expect(style.transitionProperty).toContain('transform');
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
