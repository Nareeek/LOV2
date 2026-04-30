import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { exerciseDefinitions, sceneDefinitions } from '@lov2/game-data';
import {
  experienceForLevel,
  type BootstrapState,
  type SceneAction,
  type SceneDefinition,
  type SceneHotspot,
  type SceneId,
} from '@lov2/shared';
import { apiClient } from '../../lib/api.js';
import {
  deriveRouteState,
  getActiveTravel,
  getCombatReplayFrame,
  getLatestResolvedCombat,
  getPendingCombat,
  getQuestDefinition,
  isTravelReady,
} from '../../game/flow.js';
import type {
  GameIntent,
  InfoWindowId,
  MetaTab,
  RouteState,
  SheetTab,
  StageMode,
  WorldLocation,
  WorldWindowId,
} from '../../game/types.js';
import { SceneViewport } from '../SceneViewport.js';
import { ActionDock } from './ActionDock.js';
import { BottomTray } from './BottomTray.js';
import {
  CombatResultWindow,
  CharacterSheet,
  CombatStage,
  EnemyInfoWindow,
  HeroInfoWindow,
  TravelStage,
} from './GamePanels.js';
import { infoWindowTitle, renderInfoWindow, renderWorldWindow, windowForPanel } from './GameWindowRouter.js';
import { HudFrame } from './HudFrame.js';
import { OverlayLayer } from './OverlayLayer.js';
import { TaskRail } from './TaskRail.js';

const fallbackHub = sceneDefinitions.find((scene) => scene.id === 'hub') ?? sceneDefinitions[0]!;
const COMBAT_REPLAY_TURN_MS = 2200;
const COMBAT_REPLAY_REWARD_DELAY_MS = 1200;

export function GameShell({
  state,
  onBootstrap,
  onLogout,
}: {
  state: BootstrapState;
  onBootstrap: (state: BootstrapState) => void;
  onLogout: () => Promise<void> | void;
}) {
  const [worldLocation, setWorldLocation] = useState<WorldLocation>('courtyard');
  const [baseStage, setBaseStage] = useState<'world' | 'sheet' | 'travel' | 'combat'>(() =>
    initialStageFromState(state),
  );
  const [sheetReturnStage, setSheetReturnStage] = useState<'world' | 'travel'>('world');
  const [worldWindow, setWorldWindow] = useState<WorldWindowId>('none');
  const [infoWindow, setInfoWindow] = useState<InfoWindowId>('none');
  const [sheetTab, setSheetTab] = useState<SheetTab>('character');
  const [metaTab, setMetaTab] = useState<MetaTab>('news');
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(state.quests[0]?.id ?? null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(exerciseDefinitions[0]?.id ?? null);
  const [selectedItemStackId, setSelectedItemStackId] = useState<string | null>(null);
  const [selectedPetId, setSelectedPetId] = useState('kitten');
  const [selectedStoreItemId, setSelectedStoreItemId] = useState<string | null>(null);
  const [selectedForgeStackId, setSelectedForgeStackId] = useState<string | null>(null);
  const [selectedArenaEnemyId, setSelectedArenaEnemyId] = useState<string | null>(state.enemies[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [, setMessage] = useState('Добро пожаловать в ночной двор.');
  const [clock, setClock] = useState(() => Date.now());
  const [petAssistArmed, setPetAssistArmed] = useState(false);
  const [replayTurnCount, setReplayTurnCount] = useState(0);
  const [replayActive, setReplayActive] = useState(false);
  const [rewardVisible, setRewardVisible] = useState(false);
  const [returnLocation, setReturnLocation] = useState<WorldLocation>('courtyard');

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

  useEffect(() => {
    if (selectedExerciseId && exerciseDefinitions.some((exercise) => exercise.id === selectedExerciseId)) {
      return;
    }
    setSelectedExerciseId(exerciseDefinitions[0]?.id ?? null);
  }, [selectedExerciseId]);

  useEffect(() => {
    if (selectedArenaEnemyId && state.enemies.some((enemy) => enemy.id === selectedArenaEnemyId)) {
      return;
    }
    setSelectedArenaEnemyId(state.enemies[0]?.id ?? null);
  }, [selectedArenaEnemyId, state.enemies]);

  useEffect(() => {
    if (selectedItemStackId && state.inventory.some((stack) => stack.id === selectedItemStackId)) {
      return;
    }
    setSelectedItemStackId(null);
  }, [selectedItemStackId, state.inventory]);

  useEffect(() => {
    if (selectedForgeStackId && state.inventory.some((stack) => stack.id === selectedForgeStackId)) {
      return;
    }
    setSelectedForgeStackId(null);
  }, [selectedForgeStackId, state.inventory]);

  const scenes = state.scenes.length ? state.scenes : sceneDefinitions;
  const sceneById = useMemo(() => new Map(scenes.map((scene) => [scene.id, scene])), [scenes]);
  const sceneId: SceneId = worldLocation === 'courtyard' ? 'hub' : 'map';
  const activeScene = sceneById.get(sceneId) ?? fallbackHub;
  const activeTravel = getActiveTravel(state);
  const activeTravelReady = activeTravel ? isTravelReady(activeTravel, clock) : false;
  const pendingCombat = getPendingCombat(state);
  const latestResolvedCombat = getLatestResolvedCombat(state);
  const activeCombatLog = pendingCombat ? undefined : latestResolvedCombat?.log;
  const arenaEnemy = state.enemies.find((enemy) => enemy.id === selectedArenaEnemyId) ?? state.enemies[0];
  const combatEnemyId = pendingCombat?.enemyId ?? latestResolvedCombat?.enemyId ?? arenaEnemy?.id;
  const combatEnemy = state.enemies.find((enemy) => enemy.id === combatEnemyId) ?? arenaEnemy;
  const selectedQuest = selectedQuestId ? getQuestDefinition(state, selectedQuestId) : state.quests[0];
  const selectedStoreItem = selectedStoreItemId ? state.items.find((item) => item.id === selectedStoreItemId) : undefined;
  const selectedItemStack = selectedItemStackId ? state.inventory.find((stack) => stack.id === selectedItemStackId) : undefined;
  const selectedItem = selectedItemStack ? state.items.find((item) => item.id === selectedItemStack.itemId) : undefined;
  const selectedForgeStack = selectedForgeStackId ? state.inventory.find((stack) => stack.id === selectedForgeStackId) : undefined;
  const xpTarget = state.character ? experienceForLevel(state.character.level + 1) : 1;
  const xpPercent = state.character ? Math.min(100, Math.round((state.character.experience / xpTarget) * 100)) : 0;
  const stageMode: StageMode = baseStage;

  const routeStates = useMemo(
    () => Object.fromEntries(state.quests.map((quest) => [quest.id, deriveRouteState(state, quest.id, clock)])),
    [clock, state],
  ) as Record<string, RouteState>;

  useEffect(() => {
    if (!replayActive || !activeCombatLog) {
      return;
    }

    setReplayTurnCount(0);
    let turnIndex = 0;
    let rewardTimer: number | undefined;
    const interval = window.setInterval(() => {
      turnIndex += 1;
      setReplayTurnCount(turnIndex);
      if (turnIndex >= activeCombatLog.turns.length) {
        window.clearInterval(interval);
        rewardTimer = window.setTimeout(() => {
          setReplayActive(false);
          setRewardVisible(true);
        }, COMBAT_REPLAY_REWARD_DELAY_MS);
      }
    }, COMBAT_REPLAY_TURN_MS);

    return () => {
      window.clearInterval(interval);
      if (rewardTimer) {
        window.clearTimeout(rewardTimer);
      }
    };
  }, [activeCombatLog, replayActive]);

  const visibleReplayTurns =
    replayActive
      ? activeCombatLog?.turns.slice(0, replayTurnCount) ?? []
      : activeCombatLog?.turns ?? [];

  const replayFrame = getCombatReplayFrame(
    activeCombatLog,
    combatEnemy?.health ?? 1,
    state.character?.maxHealth ?? 1,
    replayActive ? replayTurnCount : visibleReplayTurns.length,
  );

  const hotspotBadges = useMemo(() => {
    const badges: Record<string, string> = {};
    if (sceneId === 'hub') {
      const activeCount = state.questProgress.filter((quest) => quest.status === 'active').length;
      if (activeCount > 0) {
        badges['hub-tavern'] = `${activeCount}`;
      }
    }
    return badges;
  }, [sceneId, state.questProgress]);

  const hotspotToneById = useMemo(() => {
    const tones: Record<string, 'neutral' | 'available' | 'traveling' | 'ready' | 'locked' | 'active'> = {};
    for (const hotspot of activeScene.hotspots) {
      if (hotspot.id === 'hub-tavern' && state.questProgress.some((quest) => quest.status === 'active')) {
        tones[hotspot.id] = 'active';
      } else {
        tones[hotspot.id] = 'available';
      }
    }
    return tones;
  }, [activeScene.hotspots, state.questProgress]);

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

  const openLocation = useCallback((location: WorldLocation) => {
    setWorldLocation(location);
    setBaseStage('world');
    setWorldWindow('none');
    setInfoWindow('none');
    setRewardVisible(false);
    setReplayActive(false);
    setPetAssistArmed(false);
  }, []);

  const openWorldWindow = useCallback((windowId: Exclude<WorldWindowId, 'none'>) => {
    setWorldWindow(windowId);
    setInfoWindow('none');
  }, []);

  const closeWorldWindow = useCallback(() => {
    setWorldWindow('none');
  }, []);

  const openSheet = useCallback((tab: SheetTab) => {
    setSheetReturnStage(baseStage === 'travel' ? 'travel' : 'world');
    setBaseStage('sheet');
    setSheetTab(tab);
    setWorldWindow('none');
    setInfoWindow('none');
  }, [baseStage]);

  const closeSheet = useCallback(() => {
    setBaseStage(sheetReturnStage);
    setInfoWindow('none');
  }, [sheetReturnStage]);

  const closeReward = useCallback(() => {
    setRewardVisible(false);
    setReplayActive(false);
    setPetAssistArmed(false);
    setWorldWindow('none');
    setInfoWindow('none');
    setBaseStage('world');
    setWorldLocation(returnLocation);
  }, [returnLocation]);

  const handleIntent = useCallback(
    async (intent: GameIntent) => {
      switch (intent.type) {
        case 'openLocation':
          openLocation(intent.location);
          return;
        case 'openWindow':
          openWorldWindow(intent.windowId);
          return;
        case 'closeWindow':
          closeWorldWindow();
          return;
        case 'openSheet':
          openSheet(intent.tab);
          return;
        case 'closeSheet':
          closeSheet();
          return;
        case 'setSheetTab':
          setSheetTab(intent.tab);
          return;
        case 'openInfo':
          setInfoWindow(intent.windowId);
          return;
        case 'closeInfo':
          setInfoWindow('none');
          return;
        case 'selectTask':
          setSelectedQuestId(intent.questId);
          setWorldWindow('tavern');
          return;
        case 'selectExercise':
          setSelectedExerciseId(intent.exerciseId);
          setWorldWindow('exerciseDetail');
          return;
        case 'selectArenaEnemy': {
          const currentIndex = state.enemies.findIndex((enemy) => enemy.id === (intent.enemyId || selectedArenaEnemyId));
          const nextEnemy = state.enemies[(currentIndex + 1 + state.enemies.length) % state.enemies.length] ?? state.enemies[0];
          setSelectedArenaEnemyId(nextEnemy?.id ?? null);
          setWorldWindow('arenaPreview');
          return;
        }
        case 'acceptTask':
          await run(() => apiClient.acceptQuest(intent.questId), 'Контракт принят.');
          setSelectedQuestId(intent.questId);
          setWorldWindow('tavern');
          return;
        case 'startTravel': {
          setReturnLocation(worldLocation);
          const questProgress = state.questProgress.find((quest) => quest.questId === intent.questId);
          if (!questProgress || questProgress.status !== 'active') {
            const accepted = await run(() => apiClient.acceptQuest(intent.questId), 'Контракт принят.');
            if (!accepted) {
              return;
            }
          }
          await run(
            () => apiClient.startTravel({ locationId: intent.locationId, questId: intent.questId }),
            'Путь начался.',
          );
          setWorldWindow('none');
          setInfoWindow('none');
          setRewardVisible(false);
          setReplayActive(false);
          setPetAssistArmed(false);
          setBaseStage('travel');
          return;
        }
        case 'claimTravel':
          await run(() => apiClient.claimTravel(intent.travelId), 'Вы добрались до места.');
          setWorldWindow('none');
          setInfoWindow('none');
          setRewardVisible(false);
          setReplayActive(false);
          setPetAssistArmed(false);
          setBaseStage('combat');
          return;
        case 'startArena':
          setReturnLocation(worldLocation);
          await run(() => apiClient.startArena({ enemyId: intent.enemyId }), 'Соперник вызван.');
          setWorldWindow('none');
          setInfoWindow('none');
          setRewardVisible(false);
          setReplayActive(false);
          setPetAssistArmed(false);
          setBaseStage('combat');
          return;
        case 'resolveCombat':
          await run(
            () => apiClient.resolveCombat(intent.combatId, petAssistArmed ? { petId: selectedPetId } : {}),
            'Дуэль завершена.',
          );
          setReplayTurnCount(0);
          setReplayActive(true);
          setRewardVisible(false);
          setPetAssistArmed(false);
          setBaseStage('combat');
          return;
        case 'togglePetAssist':
          setPetAssistArmed((value) => !value);
          return;
        case 'showReward':
          setReplayActive(false);
          setRewardVisible(true);
          return;
        case 'closeReward':
          closeReward();
          return;
        case 'openItemInfo':
          setSelectedItemStackId(intent.inventoryStackId);
          setInfoWindow('itemInfo');
          return;
        case 'openPetInfo':
          setInfoWindow('petInfo');
          return;
        case 'equipItem':
          await run(() => apiClient.equipItem(intent.inventoryStackId), 'Предмет экипирован.');
          setSelectedItemStackId(intent.inventoryStackId);
          setInfoWindow('none');
          return;
        case 'unequipItem':
          await run(() => apiClient.unequipItem(intent.inventoryStackId), 'Предмет снят.');
          setSelectedItemStackId(intent.inventoryStackId);
          setInfoWindow('none');
          return;
        case 'purchaseItem':
          setSelectedStoreItemId(intent.itemId);
          await run(() => apiClient.purchaseItem({ itemId: intent.itemId }), 'Покупка добавлена в рюкзак.');
          setWorldWindow('store');
          return;
        case 'selectForgeItem':
          setSelectedForgeStackId(intent.inventoryStackId);
          return;
        case 'upgradeItem':
          await run(() => apiClient.upgradeItem({ inventoryStackId: intent.inventoryStackId }), 'Предмет усилен.');
          setSelectedForgeStackId(intent.inventoryStackId);
          setWorldWindow('forge');
          return;
        case 'allocateStat':
          await run(() => apiClient.allocateStats({ stat: intent.stat, points: 1 }), `+1 к ${intent.stat}`);
          setBaseStage('sheet');
          setSheetTab('character');
          return;
        case 'refillEnergy':
          await run(() => apiClient.refillEnergy({ mode: intent.mode }), 'Энергия пополнена.');
          setWorldWindow('tavern');
          return;
        default:
          return;
      }
    },
    [
      baseStage,
      closeReward,
      closeSheet,
      closeWorldWindow,
      openLocation,
      openSheet,
      openWorldWindow,
      run,
      petAssistArmed,
      selectedArenaEnemyId,
      selectedPetId,
      state.enemies,
      state.questProgress,
      worldLocation,
    ],
  );

  const handleIntentRef = useRef(handleIntent);
  const autoResolvedCombatIdRef = useRef<string | null>(null);
  handleIntentRef.current = handleIntent;

  useEffect(() => {
    if (baseStage !== 'combat' || !pendingCombat || replayActive || rewardVisible) {
      return;
    }
    if (autoResolvedCombatIdRef.current === pendingCombat.id) {
      return;
    }

    const combatId = pendingCombat.id;
    const timer = window.setTimeout(() => {
      autoResolvedCombatIdRef.current = combatId;
      void handleIntent({ type: 'resolveCombat', combatId });
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [baseStage, handleIntent, pendingCombat, petAssistArmed, replayActive, rewardVisible, selectedPetId]);

  useEffect(() => {
    if (!pendingCombat) {
      autoResolvedCombatIdRef.current = null;
    }
  }, [pendingCombat]);

  const handleHotspotClick = useCallback(
    async (action: SceneAction, hotspot: SceneHotspot) => {
      setMessage(hotspot.descriptionRu);

      if (action.type === 'openScene') {
        await handleIntent({
          type: 'openLocation',
          location: action.sceneId === 'map' ? 'harbor' : 'courtyard',
        });
        return;
      }

      if (action.type === 'openPanel') {
        const windowId = windowForPanel(action.panelId);
        if (windowId) {
          await handleIntent({ type: 'openWindow', windowId });
        }
        return;
      }

      if (action.type === 'travelNode') {
        if (activeTravel && activeTravel.questId === action.questId && activeTravelReady) {
          await handleIntent({ type: 'claimTravel', travelId: activeTravel.id });
          return;
        }
        if (action.questId) {
          setSelectedQuestId(action.questId);
        }
        setWorldWindow('tavern');
        return;
      }

      if (action.type === 'combatNode' && pendingCombat) {
        setBaseStage('combat');
      }
    },
    [activeTravel, activeTravelReady, handleIntent, pendingCombat],
  );

  const worldWindowContent = renderWorldWindow({
    worldWindow,
    state,
    selectedQuest,
    routeStates,
    selectedStoreItem,
    selectedItemStackId,
    selectedForgeStack,
    selectedArenaEnemy: arenaEnemy,
    selectedExerciseId,
    metaTab,
    busy,
    onClose: () => handleIntentRef.current({ type: 'closeWindow' }),
    onIntent: handleIntentRef.current,
  });

  const heroInfoContent =
    infoWindow === 'heroInfo'
      ? <HeroInfoWindow state={state} onClose={() => setInfoWindow('none')} onIntent={handleIntentRef.current} />
      : null;
  const enemyInfoContent =
    infoWindow === 'enemyInfo'
      ? <EnemyInfoWindow enemy={combatEnemy} onClose={() => setInfoWindow('none')} />
      : null;

  const infoWindowContent = renderInfoWindow({
    infoWindow,
    state,
    combatEnemy,
    selectedItem,
    selectedItemStack,
    onIntent: handleIntentRef.current,
  });

  const showTopbar = baseStage === 'world' || baseStage === 'travel';
  const showActionDock = baseStage === 'world' || baseStage === 'travel';
  const showBottomTray = baseStage === 'world' || baseStage === 'combat';
  const handleMetaTabSelect = useCallback((tab: MetaTab) => {
    setMetaTab(tab);
    setWorldWindow('journal');
    setInfoWindow('none');
  }, []);

  return (
    <main className="game-shell unified-shell" data-testid="game-shell">
      <section className="stage-frame-wrap">
        <section className={`stage-frame shell-reset-stage stage-mode-${stageMode}`} data-testid="world-stage">
          {showTopbar && state.character ? (
            <HudFrame
              character={state.character}
              xpTarget={xpTarget}
              xpPercent={xpPercent}
              onIntent={handleIntent}
            />
          ) : null}

          {(baseStage === 'world' || baseStage === 'travel') && (
            <section className={`stage-playfield ${baseStage === 'travel' ? 'travel-layout' : ''}`}>
                {baseStage === 'world' ? (
                  <aside className="stage-left-stack">
                    <TaskRail activeExerciseId={selectedExerciseId} onIntent={handleIntent} />
                  </aside>
                ) : null}

              <section className="stage-main">
                {baseStage === 'world' ? (
                  <SceneViewport
                    scene={activeScene}
                    hotspotBadges={hotspotBadges}
                    hotspotToneById={hotspotToneById}
                    onHotspotClick={handleHotspotClick}
                  />
                ) : (
                  <TravelStage
                    state={state}
                    activeTravel={activeTravel}
                    activeTravelReady={activeTravelReady}
                    clock={clock}
                    onIntent={handleIntent}
                  />
                )}

                {worldWindowContent ? (
                  <div className="shell-reset-modal-layer" data-testid="world-window-layer">
                    <div className="shell-reset-scrim" aria-hidden="true" />
                    <div className="shell-reset-modal-card">{worldWindowContent}</div>
                  </div>
                ) : null}

                {heroInfoContent ? (
                  <div className="shell-reset-modal-layer" data-testid="hero-info-layer">
                    <div className="shell-reset-scrim" aria-hidden="true" />
                    <div className="shell-reset-modal-card">{heroInfoContent}</div>
                  </div>
                ) : null}

                {enemyInfoContent ? (
                  <div className="shell-reset-modal-layer" data-testid="enemy-info-layer">
                    <div className="shell-reset-scrim" aria-hidden="true" />
                    <div className="shell-reset-modal-card">{enemyInfoContent}</div>
                  </div>
                ) : null}

                {!heroInfoContent && !enemyInfoContent && infoWindowContent ? (
                  <OverlayLayer title={infoWindowTitle(infoWindow)} placement="info" onClose={() => setInfoWindow('none')}>
                    {infoWindowContent}
                  </OverlayLayer>
                ) : null}
              </section>

              {showActionDock ? (
                <aside className="stage-right-rail">
                  <ActionDock onIntent={handleIntent} />
                </aside>
              ) : null}
            </section>
          )}

          {baseStage === 'sheet' ? (
            <section className="stage-playfield single-column">
              <section className="stage-main sheet-main">
                <CharacterSheet
                  state={state}
                  activeTab={sheetTab}
                  selectedItemStackId={selectedItemStackId}
                  selectedPetId={selectedPetId}
                  onSelectPet={setSelectedPetId}
                  onIntent={handleIntent}
                />

                {worldWindowContent ? (
                  <div className="shell-reset-modal-layer" data-testid="world-window-layer">
                    <div className="shell-reset-scrim" aria-hidden="true" />
                    <div className="shell-reset-modal-card">{worldWindowContent}</div>
                  </div>
                ) : null}

                {enemyInfoContent ? (
                  <div className="shell-reset-modal-layer" data-testid="enemy-info-layer">
                    <div className="shell-reset-scrim" aria-hidden="true" />
                    <div className="shell-reset-modal-card">{enemyInfoContent}</div>
                  </div>
                ) : null}

                {infoWindow !== 'heroInfo' && !enemyInfoContent && infoWindowContent ? (
                  <OverlayLayer title={infoWindowTitle(infoWindow)} placement="info" onClose={() => setInfoWindow('none')}>
                    {infoWindowContent}
                  </OverlayLayer>
                ) : null}
              </section>
            </section>
          ) : null}

          {baseStage === 'combat' && state.character ? (
            <section className="stage-playfield single-column">
              <section className="stage-main combat-main">
                <CombatStage
                  state={state}
                  enemy={combatEnemy}
                  characterHealth={replayFrame.characterCurrent}
                  characterMaxHealth={replayFrame.characterStart}
                  enemyHealth={replayFrame.enemyCurrent}
                  enemyMaxHealth={replayFrame.enemyStart}
                  petHealth={replayFrame.petCurrent}
                  petMaxHealth={replayFrame.petStart}
                  petAssistArmed={petAssistArmed}
                  selectedPetId={selectedPetId}
                  replayTurns={visibleReplayTurns}
                  onIntent={handleIntent}
                />

                {worldWindowContent ? (
                  <div className="shell-reset-modal-layer" data-testid="world-window-layer">
                    <div className="shell-reset-scrim" aria-hidden="true" />
                    <div className="shell-reset-modal-card">{worldWindowContent}</div>
                  </div>
                ) : null}

                {rewardVisible ? (
                  <div className="shell-reset-modal-layer reward">
                    <div className="shell-reset-scrim" aria-hidden="true" />
                    <div className="shell-reset-modal-card">
                      <CombatResultWindow latestResolvedCombat={latestResolvedCombat} onContinue={closeReward} />
                    </div>
                  </div>
                ) : null}

                {heroInfoContent ? (
                  <div className="shell-reset-modal-layer" data-testid="hero-info-layer">
                    <div className="shell-reset-scrim" aria-hidden="true" />
                    <div className="shell-reset-modal-card">{heroInfoContent}</div>
                  </div>
                ) : null}

                {enemyInfoContent ? (
                  <div className="shell-reset-modal-layer" data-testid="enemy-info-layer">
                    <div className="shell-reset-scrim" aria-hidden="true" />
                    <div className="shell-reset-modal-card">{enemyInfoContent}</div>
                  </div>
                ) : null}

                {!heroInfoContent && !enemyInfoContent && infoWindowContent ? (
                  <OverlayLayer title={infoWindowTitle(infoWindow)} placement="info" onClose={() => setInfoWindow('none')}>
                    {infoWindowContent}
                  </OverlayLayer>
                ) : null}
              </section>
            </section>
          ) : null}

          {showBottomTray ? <BottomTray activeTab={metaTab} onSelectTab={handleMetaTabSelect} /> : null}
        </section>
      </section>
    </main>
  );
}

function isBootstrap(value: unknown): value is BootstrapState {
  return typeof value === 'object' && value !== null && 'races' in value && 'quests' in value;
}

function initialStageFromState(state: BootstrapState): 'world' | 'travel' | 'combat' {
  if (getPendingCombat(state)) {
    return 'combat';
  }
  if (getActiveTravel(state)) {
    return 'travel';
  }
  return 'world';
}

