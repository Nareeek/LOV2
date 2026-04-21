import { useCallback, useEffect, useMemo, useState } from 'react';
import { sceneDefinitions } from '@lov2/game-data';
import { experienceForLevel, type BootstrapState, type SceneAction, type SceneHotspot, type SceneId } from '@lov2/shared';
import { apiClient } from '../../lib/api.js';
import {
  deriveFlowStep,
  deriveRouteState,
  getActiveTravel,
  getCombatReplayFrame,
  getLatestResolvedCombat,
  getPendingCombat,
  getQuestDefinition,
  isTravelReady,
} from '../../game/flow.js';
import type { ChromePreset, GameIntent, GameOverlayId, ScreenMode } from '../../game/types.js';
import { SceneViewport } from '../SceneViewport.js';
import { ActionDock } from './ActionDock.js';
import { BottomTray } from './BottomTray.js';
import {
  CharacterInfoPanel,
  CharacterSheet,
  CombatCommandWindow,
  CombatHud,
  EnemyInfoPanel,
  InventorySheet,
  ItemInfoPanel,
  JournalSheet,
  MapStatusWindow,
  NpcDialogScreen,
  panelTitle,
  PetInfoPanel,
  PetSheet,
  RewardScreen,
  StoreSheet,
} from './GamePanels.js';
import { HudFrame } from './HudFrame.js';
import { OverlayLayer } from './OverlayLayer.js';
import { TaskRail } from './TaskRail.js';

const fallbackHub = sceneDefinitions.find((scene) => scene.id === 'hub') ?? sceneDefinitions[0]!;

const META_RAIL_ENTRIES: Array<{ id: string; label: string; symbol: string; sceneId: SceneId }> = [
  { id: 'hub', label: 'Двор', symbol: 'H', sceneId: 'hub' },
  { id: 'character', label: 'Герой', symbol: 'G', sceneId: 'character' },
  { id: 'inventory', label: 'Сумка', symbol: 'I', sceneId: 'inventory' },
  { id: 'pets', label: 'Питомец', symbol: 'P', sceneId: 'pets' },
  { id: 'journal', label: 'Летопись', symbol: 'J', sceneId: 'journal' },
];

export function GameShell({
  state,
  onBootstrap,
  onLogout,
}: {
  state: BootstrapState;
  onBootstrap: (state: BootstrapState) => void;
  onLogout: () => Promise<void> | void;
}) {
  const [sceneId, setSceneId] = useState<SceneId>('hub');
  const [returnSceneId, setReturnSceneId] = useState<SceneId>('hub');
  const [screenMode, setScreenMode] = useState<ScreenMode>('hub');
  const [overlay, setOverlay] = useState<GameOverlayId>('none');
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(state.quests[0]?.id ?? null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Добро пожаловать в ночной двор.');
  const [clock, setClock] = useState(() => Date.now());
  const [petAssistArmed, setPetAssistArmed] = useState(false);
  const [replayTurnCount, setReplayTurnCount] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (selectedQuestId && state.quests.some((quest) => quest.id === selectedQuestId)) {
      return;
    }
    setSelectedQuestId(state.quests[0]?.id ?? null);
  }, [selectedQuestId, state.quests]);

  const scenes = state.scenes.length ? state.scenes : sceneDefinitions;
  const sceneById = useMemo(() => new Map(scenes.map((scene) => [scene.id, scene])), [scenes]);
  const activeScene = sceneById.get(sceneId) ?? fallbackHub;
  const activeTravel = getActiveTravel(state);
  const activeTravelReady = activeTravel ? isTravelReady(activeTravel, clock) : false;
  const pendingCombat = getPendingCombat(state);
  const latestResolvedCombat = getLatestResolvedCombat(state);
  const latestCombat = pendingCombat ?? latestResolvedCombat ?? state.combats[0];
  const selectedEnemy = state.enemies.find((enemy) => enemy.id === latestCombat?.enemyId);
  const selectedQuest = selectedQuestId ? getQuestDefinition(state, selectedQuestId) : state.quests[0];
  const selectedItemStack = selectedItemId ? state.inventory.find((stack) => stack.id === selectedItemId) : undefined;
  const selectedItem = selectedItemStack ? state.items.find((item) => item.id === selectedItemStack.itemId) : undefined;
  const equippedPetStack = state.inventory.find((stack) => stack.equippedSlot === 'pet');
  const equippedPetItem = equippedPetStack ? state.items.find((item) => item.id === equippedPetStack.itemId) : undefined;
  const raceName = state.character
    ? (state.races.find((race) => race.id === state.character?.raceId)?.nameRu ?? state.character.raceId)
    : '';
  const xpTarget = state.character ? experienceForLevel(state.character.level + 1) : 1;
  const xpPercent = state.character ? Math.min(100, Math.round((state.character.experience / xpTarget) * 100)) : 0;
  const flowStep = deriveFlowStep(state, overlay, clock);
  const chromePreset = chromePresetForScreen(screenMode);
  const activeWorldScene = worldSceneForScreen(screenMode, returnSceneId, sceneId);

  const routeStates = useMemo(
    () => Object.fromEntries(state.quests.map((quest) => [quest.id, deriveRouteState(state, quest.id, clock)])),
    [clock, state],
  );

  useEffect(() => {
    if (overlay !== 'combatReplay' || !latestResolvedCombat?.log) {
      return;
    }

    setReplayTurnCount(0);
    let turnIndex = 0;
    const interval = window.setInterval(() => {
      turnIndex += 1;
      setReplayTurnCount(turnIndex);
      if (turnIndex >= latestResolvedCombat.log!.turns.length) {
        window.clearInterval(interval);
        window.setTimeout(() => {
          setScreenMode('reward');
          setOverlay('reward');
        }, 550);
      }
    }, 650);

    return () => window.clearInterval(interval);
  }, [latestResolvedCombat, overlay]);

  const visibleReplayTurns =
    overlay === 'combatReplay'
      ? latestResolvedCombat?.log?.turns.slice(0, replayTurnCount) ?? []
      : latestResolvedCombat?.log?.turns ?? [];
  const replayFrame = getCombatReplayFrame(
    latestResolvedCombat?.log,
    selectedEnemy?.health ?? 1,
    state.character?.maxHealth ?? 1,
    overlay === 'combatReplay' ? replayTurnCount : visibleReplayTurns.length,
  );

  const disabledHotspotIds = useMemo(() => {
    const ids: string[] = [];
    for (const hotspot of activeScene.hotspots) {
      if (hotspot.action.type === 'travelNode' && hotspot.action.questId) {
        const routeState = routeStates[hotspot.action.questId];
        if (routeState === 'locked') {
          ids.push(hotspot.id);
        }
      }
      if (hotspot.id === 'combat-result' && !latestResolvedCombat) {
        ids.push(hotspot.id);
      }
    }
    return ids;
  }, [activeScene.hotspots, latestResolvedCombat, routeStates]);

  const hotspotBadges = useMemo(() => {
    const badges: Record<string, string> = {};
    for (const hotspot of activeScene.hotspots) {
      if (hotspot.action.type === 'travelNode' && hotspot.action.questId) {
        const routeState = routeStates[hotspot.action.questId];
        badges[hotspot.id] =
          routeState === 'ready'
            ? 'готово'
            : routeState === 'traveling'
              ? 'в пути'
              : routeState === 'available'
                ? 'доступно'
                : 'закрыто';
      }
      if (hotspot.id === 'tavern-board') {
        const activeCount = state.questProgress.filter((quest) => quest.status === 'active').length;
        badges[hotspot.id] = activeCount > 0 ? `${activeCount}` : 'новое';
      }
      if (hotspot.id === 'combat-enemy' && pendingCombat) {
        badges[hotspot.id] = 'бой';
      }
      if (hotspot.id === 'combat-result' && latestResolvedCombat) {
        badges[hotspot.id] = 'награда';
      }
    }
    return badges;
  }, [activeScene.hotspots, latestResolvedCombat, pendingCombat, routeStates, state.questProgress]);

  const hotspotToneById = useMemo(() => {
    const tones: Record<string, 'neutral' | 'available' | 'traveling' | 'ready' | 'locked' | 'active'> = {};
    for (const hotspot of activeScene.hotspots) {
      if (hotspot.action.type === 'travelNode' && hotspot.action.questId) {
        tones[hotspot.id] = routeStates[hotspot.action.questId];
      } else if (hotspot.id === 'tavern-board' || hotspot.id === 'tavern-keeper') {
        tones[hotspot.id] = flowStep === 'taskAccepted' ? 'active' : 'available';
      } else if (hotspot.id === 'combat-enemy' && pendingCombat) {
        tones[hotspot.id] = 'active';
      } else {
        tones[hotspot.id] = 'neutral';
      }
    }
    return tones;
  }, [activeScene.hotspots, flowStep, pendingCombat, routeStates]);

  const run = useCallback(
    async <T,>(action: () => Promise<T>, success: string) => {
      setBusy(true);
      setMessage('');
      try {
        const result = await action();
        if (isBootstrap(result)) {
          onBootstrap(result);
        }
        setMessage(success);
        return result;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Что-то пошло не так');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [onBootstrap],
  );

  const goToScene = useCallback(
    (nextSceneId: SceneId, nextOverlay: GameOverlayId = 'none') => {
      setSceneId(nextSceneId);
      setScreenMode(screenModeForScene(nextSceneId, nextOverlay));
      setOverlay(nextOverlay);
      if (isWorldScene(nextSceneId)) {
        setReturnSceneId(nextSceneId);
      }
    },
    [],
  );

  const returnToWorld = useCallback(() => {
    const nextOverlay = baseOverlayForScene(returnSceneId, {
      pendingCombat: Boolean(pendingCombat),
      activeTravel: Boolean(activeTravel),
    });
    setSceneId(returnSceneId);
    setScreenMode(screenModeForScene(returnSceneId, nextOverlay));
    setOverlay(nextOverlay);
  }, [activeTravel, pendingCombat, returnSceneId]);

  const closeAuxiliarySurface = useCallback(() => {
    if (overlay === 'characterInfo' || overlay === 'enemyInfo' || overlay === 'itemInfo' || overlay === 'petInfo') {
      setOverlay('none');
      return;
    }

    if (screenMode === 'npcDialog' && overlay === 'taskDetail') {
      setOverlay('taskList');
      return;
    }

    if (screenMode === 'reward') {
      returnToWorld();
      return;
    }

    if (screenMode === 'storeSheet' || chromePreset === 'sheet') {
      returnToWorld();
      return;
    }

    if (overlay === 'travel') {
      setOverlay('none');
      return;
    }

    if (overlay === 'combatReplay') {
      if (latestResolvedCombat?.log) {
        setScreenMode('reward');
        setOverlay('reward');
      } else {
        setOverlay('combatReady');
      }
      return;
    }

    setOverlay('none');
  }, [chromePreset, latestResolvedCombat, overlay, returnToWorld, screenMode]);

  const handleIntent = useCallback(
    async (intent: GameIntent) => {
      switch (intent.type) {
        case 'openScene': {
          const nextOverlay = baseOverlayForScene(intent.sceneId, {
            pendingCombat: Boolean(pendingCombat),
            activeTravel: Boolean(activeTravel),
          });
          goToScene(intent.sceneId, nextOverlay);
          return;
        }
        case 'openOverlay':
          if (intent.overlay === 'store') {
            setScreenMode('storeSheet');
            setOverlay('store');
            return;
          }
          setOverlay(intent.overlay);
          return;
        case 'closeOverlay':
          closeAuxiliarySurface();
          return;
        case 'openTaskList':
          goToScene('tavern', 'taskList');
          return;
        case 'selectTask':
          setSelectedQuestId(intent.questId);
          goToScene('tavern', 'taskDetail');
          return;
        case 'acceptTask':
          await run(() => apiClient.acceptQuest(intent.questId), 'Контракт принят.');
          setSelectedQuestId(intent.questId);
          goToScene('tavern', 'taskDetail');
          return;
        case 'startTravel':
          await run(
            () => apiClient.startTravel({ locationId: intent.locationId, questId: intent.questId }),
            'Путь начался.',
          );
          goToScene('map', 'travel');
          return;
        case 'claimTravel':
          await run(() => apiClient.claimTravel(intent.travelId), 'Вы добрались до места.');
          goToScene('combat', 'combatReady');
          return;
        case 'openCombat':
          goToScene('combat', pendingCombat ? 'combatReady' : latestResolvedCombat ? 'reward' : 'none');
          if (!pendingCombat && latestResolvedCombat) {
            setScreenMode('reward');
          }
          return;
        case 'resolveCombat':
          await run(() => apiClient.resolveCombat(intent.combatId), 'Дуэль завершена.');
          goToScene('combat', 'combatReplay');
          return;
        case 'showReward':
          setSceneId('combat');
          setReturnSceneId('combat');
          setScreenMode('reward');
          setOverlay('reward');
          return;
        case 'togglePetAssist':
          setPetAssistArmed((value) => !value);
          setMessage('Питомец готов к помощи в следующем ударе.');
          return;
        case 'openItemInfo':
          setSelectedItemId(intent.inventoryStackId);
          setOverlay('itemInfo');
          return;
        case 'openPetInfo':
          setOverlay('petInfo');
          return;
        case 'equipItem':
          await run(() => apiClient.equipItem(intent.inventoryStackId), 'Предмет экипирован.');
          setOverlay('itemInfo');
          return;
        case 'allocateStat':
          await run(() => apiClient.allocateStats({ stat: intent.stat, points: 1 }), `+1 к ${intent.stat}`);
          goToScene('character');
          return;
        case 'refillEnergy':
          await run(() => apiClient.refillEnergy({ mode: 'gems' }), 'Энергия пополнена.');
          setScreenMode('storeSheet');
          setOverlay('store');
          return;
      }
    },
    [activeTravel, closeAuxiliarySurface, goToScene, latestResolvedCombat, pendingCombat, run],
  );

  const handleHotspotClick = useCallback(
    async (action: SceneAction, hotspot: SceneHotspot) => {
      setMessage(hotspot.descriptionRu);
      if (action.type === 'openScene') {
        await handleIntent({ type: 'openScene', sceneId: action.sceneId });
        return;
      }

      if (action.type === 'openPanel') {
        switch (action.panelId) {
          case 'contracts':
            await handleIntent({ type: 'openTaskList' });
            return;
          case 'travel':
            goToScene('map', 'travel');
            return;
          case 'reward':
            await handleIntent({ type: 'showReward' });
            return;
          case 'inventory':
            goToScene('inventory');
            return;
          case 'character':
            goToScene('character');
            return;
          case 'pets':
            goToScene('pets');
            return;
          case 'journal':
            goToScene('journal');
            return;
          case 'combat':
            await handleIntent({ type: 'openCombat' });
            return;
        }
      }

      if (action.type === 'equipFirst') {
        const firstEquipCandidate = state.inventory.find((stack) => {
          const item = state.items.find((entry) => entry.id === stack.itemId);
          return item?.slot && !stack.equippedSlot;
        });
        if (!firstEquipCandidate) {
          setMessage('В сумке пока нет нового предмета для экипировки.');
          return;
        }
        await handleIntent({ type: 'equipItem', inventoryStackId: firstEquipCandidate.id });
        return;
      }

      if (action.type === 'combatNode') {
        if (pendingCombat) {
          await handleIntent({ type: 'openCombat' });
          return;
        }
        if (latestResolvedCombat) {
          await handleIntent({ type: 'showReward' });
          return;
        }
        setMessage('Сначала примите задание и завершите путь.');
        return;
      }

      if (action.type === 'travelNode' && action.questId) {
        const routeState = routeStates[action.questId];
        if (activeTravel?.questId === action.questId && activeTravelReady) {
          await handleIntent({ type: 'claimTravel', travelId: activeTravel.id });
          return;
        }
        if (routeState === 'traveling') {
          goToScene('map', 'travel');
          return;
        }
        if (routeState === 'available') {
          await handleIntent({ type: 'startTravel', questId: action.questId, locationId: action.locationId });
          return;
        }
        await handleIntent({ type: 'selectTask', questId: action.questId });
      }
    },
    [activeTravel, activeTravelReady, goToScene, handleIntent, latestResolvedCombat, pendingCombat, routeStates, state.inventory, state.items],
  );

  const infoOverlay =
    overlay === 'characterInfo' || overlay === 'enemyInfo' || overlay === 'itemInfo' || overlay === 'petInfo';

  return (
    <main className="game-shell unified-shell" data-testid="game-shell">
      <section className="stage-frame-wrap">
        <section
          className={`stage-frame chrome-${chromePreset} screen-${screenMode}`}
          data-testid="world-stage"
          data-screen-mode={screenMode}
        >
          {state.character && (
            <HudFrame
              character={state.character}
              raceName={raceName}
              xpTarget={xpTarget}
              xpPercent={xpPercent}
              onIntent={handleIntent}
              onLogout={() => void onLogout()}
              busy={busy}
              message={message}
            />
          )}

          <aside className="stage-left-rail" data-testid="left-rail">
            {chromePreset !== 'sheet' && chromePreset !== 'reward' && (
              <TaskRail state={state} now={clock} onIntent={handleIntent} />
            )}
            <nav className="left-meta-rail" data-testid="left-meta-rail" aria-label="Листы и разделы героя">
              {META_RAIL_ENTRIES.map((entry) => (
                <button
                  key={entry.id}
                  data-testid={`meta-${entry.id}`}
                  className={`meta-rail-button ${sceneId === entry.sceneId ? 'active' : ''}`}
                  onClick={() => handleIntent({ type: 'openScene', sceneId: entry.sceneId })}
                >
                  <span aria-hidden="true">{entry.symbol}</span>
                  <small>{entry.label}</small>
                </button>
              ))}
            </nav>
          </aside>

          <section className="stage-main" data-testid="stage-main">
            <SceneViewport
              scene={activeScene}
              enemyName={selectedEnemy?.nameRu}
              equippedPetName={equippedPetItem?.nameRu}
              combatLog={latestResolvedCombat?.log}
              replayTurnsVisible={overlay === 'combatReplay' ? replayTurnCount : undefined}
              hotspotBadges={hotspotBadges}
              hotspotToneById={hotspotToneById}
              disabledHotspotIds={disabledHotspotIds}
              onHotspotClick={handleHotspotClick}
            />

            {(screenMode === 'npcDialog' ||
              screenMode === 'characterSheet' ||
              screenMode === 'inventorySheet' ||
              screenMode === 'petSheet' ||
              screenMode === 'journalSheet' ||
              screenMode === 'storeSheet' ||
              screenMode === 'reward') && <div className="stage-surface-scrim" aria-hidden="true" />}

            {screenMode === 'npcDialog' && (
              <div className="stage-surface-layer">
                <NpcDialogScreen
                  state={state}
                  overlay={overlay}
                  routeStates={routeStates}
                  selectedQuest={selectedQuest}
                  activeTravel={activeTravel}
                  activeTravelReady={activeTravelReady}
                  clock={clock}
                  busy={busy}
                  onIntent={handleIntent}
                />
              </div>
            )}

            {screenMode === 'map' && (
              <div className="stage-inset-layer map">
                <MapStatusWindow
                  state={state}
                  activeTravel={activeTravel}
                  activeTravelReady={activeTravelReady}
                  clock={clock}
                  routeStates={routeStates}
                  busy={busy}
                  onIntent={handleIntent}
                />
              </div>
            )}

            {screenMode === 'combat' && (
              <>
                <div className="stage-inset-layer combat">
                  <CombatCommandWindow
                    pendingCombat={pendingCombat}
                    latestResolvedCombat={latestResolvedCombat}
                    selectedEnemy={selectedEnemy}
                    busy={busy}
                    visibleTurns={visibleReplayTurns}
                    onIntent={handleIntent}
                  />
                </div>
                {state.character && (
                  <CombatHud
                    character={state.character}
                    enemy={selectedEnemy}
                    characterCurrent={replayFrame.characterCurrent}
                    characterStart={replayFrame.characterStart}
                    enemyCurrent={replayFrame.enemyCurrent}
                    enemyStart={replayFrame.enemyStart}
                    petName={equippedPetItem?.nameRu}
                    petAssistArmed={petAssistArmed}
                    canSkip={overlay === 'combatReplay'}
                    onIntent={handleIntent}
                  />
                )}
              </>
            )}

            {screenMode === 'characterSheet' && (
              <div className="stage-surface-layer">
                <CharacterSheet state={state} busy={busy} onIntent={handleIntent} />
              </div>
            )}

            {screenMode === 'inventorySheet' && (
              <div className="stage-surface-layer">
                <InventorySheet state={state} onIntent={handleIntent} />
              </div>
            )}

            {screenMode === 'petSheet' && (
              <div className="stage-surface-layer">
                <PetSheet state={state} onIntent={handleIntent} />
              </div>
            )}

            {screenMode === 'journalSheet' && (
              <div className="stage-surface-layer">
                <JournalSheet state={state} />
              </div>
            )}

            {screenMode === 'storeSheet' && (
              <div className="stage-surface-layer">
                <StoreSheet
                  state={state}
                  busy={busy}
                  onIntent={handleIntent}
                  onCheckout={() =>
                    void run(async () => {
                      await apiClient.checkout();
                      return state;
                    }, 'Stripe sandbox заказ создан.')
                  }
                />
              </div>
            )}

            {screenMode === 'reward' && (
              <div className="stage-surface-layer centered">
                <RewardScreen latestResolvedCombat={latestResolvedCombat} state={state} onContinue={returnToWorld} />
              </div>
            )}

            {infoOverlay && (
              <OverlayLayer title={panelTitle(overlay)} placement="info" onClose={closeAuxiliarySurface}>
                {overlay === 'characterInfo' && <CharacterInfoPanel state={state} />}
                {overlay === 'enemyInfo' && <EnemyInfoPanel enemy={selectedEnemy} />}
                {overlay === 'itemInfo' && (
                  <ItemInfoPanel stack={selectedItemStack} item={selectedItem} busy={busy} onIntent={handleIntent} />
                )}
                {overlay === 'petInfo' && <PetInfoPanel state={state} />}
              </OverlayLayer>
            )}
          </section>

          <ActionDock
            activeScene={activeWorldScene}
            flowStep={flowStep}
            hasPendingCombat={Boolean(pendingCombat)}
            hasReadyTravel={Boolean(activeTravelReady)}
            onIntent={handleIntent}
          />

          <BottomTray state={state} screenMode={screenMode} onIntent={handleIntent} />
        </section>
      </section>
    </main>
  );
}

function isBootstrap(value: unknown): value is BootstrapState {
  return typeof value === 'object' && value !== null && 'races' in value && 'quests' in value;
}

function isWorldScene(sceneId: SceneId) {
  return sceneId === 'hub' || sceneId === 'tavern' || sceneId === 'map' || sceneId === 'combat';
}

function screenModeForScene(sceneId: SceneId, overlay: GameOverlayId = 'none'): ScreenMode {
  if (overlay === 'store') return 'storeSheet';
  if (overlay === 'reward') return 'reward';

  switch (sceneId) {
    case 'tavern':
      return 'npcDialog';
    case 'map':
      return 'map';
    case 'combat':
      return 'combat';
    case 'character':
      return 'characterSheet';
    case 'inventory':
      return 'inventorySheet';
    case 'pets':
      return 'petSheet';
    case 'journal':
      return 'journalSheet';
    default:
      return 'hub';
  }
}

function chromePresetForScreen(screenMode: ScreenMode): ChromePreset {
  switch (screenMode) {
    case 'characterSheet':
    case 'inventorySheet':
    case 'petSheet':
    case 'journalSheet':
    case 'storeSheet':
      return 'sheet';
    case 'combat':
      return 'combat';
    case 'reward':
      return 'reward';
    default:
      return 'world';
  }
}

function worldSceneForScreen(screenMode: ScreenMode, returnSceneId: SceneId, sceneId: SceneId): SceneId {
  if (screenMode === 'npcDialog') return 'tavern';
  if (screenMode === 'map') return 'map';
  if (screenMode === 'combat' || screenMode === 'reward') return 'combat';
  return isWorldScene(sceneId) ? sceneId : returnSceneId;
}

function baseOverlayForScene(
  sceneId: SceneId,
  options: {
    pendingCombat: boolean;
    activeTravel: boolean;
  },
): GameOverlayId {
  if (sceneId === 'tavern') return 'taskList';
  if (sceneId === 'map' && options.activeTravel) return 'travel';
  if (sceneId === 'combat' && options.pendingCombat) return 'combatReady';
  return 'none';
}
