import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { exerciseDefinitions, sceneDefinitions } from '@lov2/game-data';
import { GameShellSheetStage } from './GameShellSheetStage.js';
import { GameShellCombatStage } from './GameShellCombatStage.js';
import { GameShellWorldStage } from './GameShellWorldStage.js';
import {
  experienceForLevel,
  type BootstrapState,
  type SceneAction,
  type SceneDefinition,
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
import { BottomTray } from './BottomTray.js';
import { PET_VARIANTS } from './GamePanels.data.js';
import {
  EnemyInfoWindow,
  HeroInfoWindow,
} from './GamePanels.js';
import { renderInfoWindow, renderWorldWindow, windowForPanel } from './GameWindowRouter.js';
import { HudFrame } from './HudFrame.js';

const fallbackHub = sceneDefinitions.find((scene) => scene.id === 'hub') ?? sceneDefinitions[0]!;
const COMBAT_AUTO_RESOLVE_DELAY_MS = 450;
const COMBAT_REPLAY_TURN_MS = 650;
const COMBAT_REPLAY_REWARD_DELAY_MS = 650;
const SELECTED_PET_STORAGE_KEY = 'lov2.selectedPetId';

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
  const [selectedPetId, setSelectedPetId] = useState(readInitialSelectedPetId);
  const [selectedStoreItemId, setSelectedStoreItemId] = useState<string | null>(null);
  const [selectedForgeStackId, setSelectedForgeStackId] = useState<string | null>(null);
  const [selectedArenaEnemyId, setSelectedArenaEnemyId] = useState<string | null>(state.enemies[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [petAssistArmed, setPetAssistArmed] = useState(false);
  const [battlePetId, setBattlePetId] = useState<string | null>(null);
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

  const arenaEnemies = useMemo(
    () => state.enemies.filter((enemy) => enemy.encounterKind === 'arena'),
    [state.enemies],
  );

  useEffect(() => {
    if (selectedArenaEnemyId && arenaEnemies.some((enemy) => enemy.id === selectedArenaEnemyId)) {
      return;
    }
    setSelectedArenaEnemyId(arenaEnemies[0]?.id ?? null);
  }, [arenaEnemies, selectedArenaEnemyId]);

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

  useEffect(() => {
    persistSelectedPetId(selectedPetId);
  }, [selectedPetId]);

  const handleSelectPet = useCallback((petId: string) => {
    setSelectedPetId(isKnownPetId(petId) ? petId : 'kitten');
  }, []);

  const scenes = state.scenes.length ? state.scenes : sceneDefinitions;
  const sceneById = useMemo(() => new Map(scenes.map((scene) => [scene.id, scene])), [scenes]);
  const sceneId: SceneId = worldLocation === 'courtyard' ? 'hub' : 'map';
  const activeScene = sceneById.get(sceneId) ?? fallbackHub;
  const activeTravel = getActiveTravel(state);
  const activeTravelReady = activeTravel ? isTravelReady(activeTravel, clock) : false;
  const pendingCombat = getPendingCombat(state);
  const latestResolvedCombat = getLatestResolvedCombat(state);
  const activeCombatLog = pendingCombat ? undefined : latestResolvedCombat?.log;
  const resolvedBattlePetId = battlePetId ?? activeCombatLog?.petId ?? null;
  const arenaEnemy = arenaEnemies.find((enemy) => enemy.id === selectedArenaEnemyId) ?? arenaEnemies[0];
  const combatEnemyId = pendingCombat?.enemyId ?? latestResolvedCombat?.enemyId ?? arenaEnemy?.id;
  const combatEnemy = state.enemies.find((enemy) => enemy.id === combatEnemyId) ?? arenaEnemy;
  const selectedQuest = selectedQuestId ? getQuestDefinition(state, selectedQuestId) : state.quests[0];
  const selectedStoreItem = selectedStoreItemId ? state.items.find((item) => item.id === selectedStoreItemId) : undefined;
  const selectedItemStack = selectedItemStackId ? state.inventory.find((stack) => stack.id === selectedItemStackId) : undefined;
  const selectedItem = selectedItemStack ? state.items.find((item) => item.id === selectedItemStack.itemId) : undefined;
  const selectedForgeStack = selectedForgeStackId ? state.inventory.find((stack) => stack.id === selectedForgeStackId) : undefined;
  const petRoster = state.petRoster ?? [];
  const equippedPetStack = state.inventory.find((stack) => stack.equippedSlot === 'pet');
  const equippedPetId = equippedPetStack?.itemId && isKnownPetId(equippedPetStack.itemId)
    ? equippedPetStack.itemId
    : null;
  const selectedCombatPetId = isKnownPetId(selectedPetId) ? selectedPetId : equippedPetId;
  const displayedCombatPetId = selectedCombatPetId ?? equippedPetId ?? selectedPetId;
  const usableCombatPetId = firstUsableCombatPetId({
    state,
    petRoster,
    preferredPetIds: [selectedCombatPetId, equippedPetId],
  });
  const activeBattlePetId = resolvedBattlePetId;
  const petAssistAlreadyUsed = Boolean(battlePetId || resolvedBattlePetId || petAssistArmed || activeCombatLog);
  const petAssistAvailable = Boolean(
    pendingCombat &&
      usableCombatPetId &&
      !petAssistAlreadyUsed &&
      !replayActive &&
      !rewardVisible,
  );
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
    async <T,>(action: () => Promise<T>) => {
      setBusy(true);
      try {
        const result = await action();
        if (isBootstrap(result)) {
          onBootstrap(result);
        }
        return result;
      } catch {
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
    setBattlePetId(null);
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
    setBattlePetId(null);
    setWorldWindow('none');
    setInfoWindow('none');
    setBaseStage('world');
    setWorldLocation(returnLocation);
  }, [returnLocation]);

  const handleIntent = useCallback(
    async (intent: GameIntent) => {
      if (busy && isCommandIntent(intent)) {
        return;
      }

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
          const currentIndex = arenaEnemies.findIndex((enemy) => enemy.id === (intent.enemyId || selectedArenaEnemyId));
          const nextEnemy = arenaEnemies[(currentIndex + 1 + arenaEnemies.length) % arenaEnemies.length] ?? arenaEnemies[0];
          setSelectedArenaEnemyId(nextEnemy?.id ?? null);
          setWorldWindow('arenaPreview');
          return;
        }
        case 'acceptTask':
          await run(() => apiClient.acceptQuest(intent.questId));
          setSelectedQuestId(intent.questId);
          setWorldWindow('tavern');
          return;
        case 'startTravel': {
          setReturnLocation(worldLocation);
          const questProgress = state.questProgress.find((quest) => quest.questId === intent.questId);
          if (!questProgress || questProgress.status !== 'active') {
            const accepted = await run(() => apiClient.acceptQuest(intent.questId));
            if (!accepted) {
              return;
            }
          }
          const started = await run(() => apiClient.startTravel({ locationId: intent.locationId, questId: intent.questId }));
          if (!started) {
            return;
          }
          setWorldWindow('none');
          setInfoWindow('none');
          setRewardVisible(false);
          setReplayActive(false);
          setPetAssistArmed(false);
          setBattlePetId(null);
          setBaseStage('travel');
          return;
        }
        case 'claimTravel':
          {
            const claimed = await run(() => apiClient.claimTravel(
              intent.travelId,
              intent.rush === undefined ? {} : { rush: intent.rush },
            ));
            if (!claimed) {
              return;
            }
          }
          setWorldWindow('none');
          setInfoWindow('none');
          setRewardVisible(false);
          setReplayActive(false);
          setPetAssistArmed(false);
          setBattlePetId(null);
          setBaseStage('combat');
          return;
        case 'startArena':
          setReturnLocation(worldLocation);
          const arenaStarted = await run(() => apiClient.startArena({ enemyId: intent.enemyId }));
          if (!arenaStarted) {
            return;
          }
          setWorldWindow('none');
          setInfoWindow('none');
          setRewardVisible(false);
          setReplayActive(false);
          setPetAssistArmed(false);
          setBattlePetId(null);
          setBaseStage('combat');
          return;
        case 'resolveCombat': {
          autoResolvedCombatIdRef.current = intent.combatId;
          const resolved = await run(() => apiClient.resolveCombat(
            intent.combatId,
            usableCombatPetId ? { petId: usableCombatPetId } : {},
          ));
          if (!resolved) {
            return;
          }
          setBattlePetId(resolvedPetIdForCombat(resolved, intent.combatId));
          setReplayTurnCount(0);
          setReplayActive(true);
          setRewardVisible(false);
          setPetAssistArmed(false);
          setBaseStage('combat');
          return;
        }
        case 'togglePetAssist':
          if (!petAssistAvailable || !pendingCombat || activeCombatLog || replayActive) {
            return;
          }
          if (pendingCombat && !activeCombatLog && !replayActive && !petAssistArmed) {
            const usedPetId = usableCombatPetId;
            if (!usedPetId) {
              return;
            }
            autoResolvedCombatIdRef.current = pendingCombat.id;
            setBattlePetId(usedPetId);
            setPetAssistArmed(true);
            const resolved = await run(() => apiClient.resolveCombat(pendingCombat.id, { petId: usedPetId }));
            if (!resolved) {
              setBattlePetId(null);
              setPetAssistArmed(false);
              return;
            }
            setBattlePetId(resolvedPetIdForCombat(resolved, pendingCombat.id));
            setReplayTurnCount(0);
            setReplayActive(true);
            setRewardVisible(false);
            setPetAssistArmed(false);
            setBaseStage('combat');
            return;
          }
          setPetAssistArmed((value) => !value);
          return;
        case 'showReward': {
          if (pendingCombat) {
            const resolved = await run(() => apiClient.resolveCombat(
              pendingCombat.id,
              usableCombatPetId ? { petId: usableCombatPetId } : {},
            ));
            if (!resolved) {
              return;
            }
            setBattlePetId(resolvedPetIdForCombat(resolved, pendingCombat.id));
            setPetAssistArmed(false);
          }
          setReplayActive(false);
          setRewardVisible(true);
          return;
        }
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
          await run(() => apiClient.equipItem(intent.inventoryStackId));
          setSelectedItemStackId(intent.inventoryStackId);
          setInfoWindow('none');
          return;
        case 'unequipItem':
          await run(() => apiClient.unequipItem(intent.inventoryStackId));
          setSelectedItemStackId(intent.inventoryStackId);
          setInfoWindow('none');
          return;
        case 'purchaseItem':
          setSelectedStoreItemId(intent.itemId);
          await run(() => apiClient.purchaseItem({ itemId: intent.itemId }));
          setWorldWindow('store');
          return;
        case 'feedPet':
          await run(() => apiClient.feedPet(intent.petId, { amount: intent.amount }));
          setBaseStage('sheet');
          setSheetTab('pets');
          return;
        case 'selectForgeItem':
          setSelectedForgeStackId(intent.inventoryStackId);
          return;
        case 'upgradeItem':
          await run(() => apiClient.upgradeItem({ inventoryStackId: intent.inventoryStackId }));
          setSelectedForgeStackId(intent.inventoryStackId);
          setWorldWindow('forge');
          return;
        case 'allocateStat':
          await run(() => apiClient.allocateStats({ stat: intent.stat, points: 1 }));
          setBaseStage('sheet');
          setSheetTab('character');
          return;
        case 'refillEnergy':
          await run(() => apiClient.refillEnergy({ mode: intent.mode }));
          setWorldWindow('tavern');
          return;
        default:
          return;
      }
    },
    [
      activeCombatLog,
      baseStage,
      closeReward,
      closeSheet,
      closeWorldWindow,
      battlePetId,
      busy,
      displayedCombatPetId,
      openLocation,
      openSheet,
      openWorldWindow,
      run,
      pendingCombat,
      petAssistArmed,
      petAssistAvailable,
      replayActive,
      rewardVisible,
      selectedArenaEnemyId,
      selectedPetId,
      arenaEnemies,
      usableCombatPetId,
      state.questProgress,
      worldLocation,
    ],
  );

  const handleIntentRef = useRef(handleIntent);
  const autoResolvedCombatIdRef = useRef<string | null>(null);
  const autoClaimedTravelIdRef = useRef<string | null>(null);
  handleIntentRef.current = handleIntent;

  useEffect(() => {
    if (!activeTravel || !activeTravelReady || busy || pendingCombat || rewardVisible) {
      return;
    }
    if (autoClaimedTravelIdRef.current === activeTravel.id) {
      return;
    }

    autoClaimedTravelIdRef.current = activeTravel.id;
    void handleIntentRef.current({ type: 'claimTravel', travelId: activeTravel.id });
  }, [activeTravel, activeTravelReady, busy, pendingCombat, rewardVisible]);

  useEffect(() => {
    if (!activeTravel) {
      autoClaimedTravelIdRef.current = null;
    }
  }, [activeTravel]);

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
    }, COMBAT_AUTO_RESOLVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [baseStage, handleIntent, pendingCombat, petAssistArmed, replayActive, rewardVisible, selectedPetId]);

  useEffect(() => {
    if (!pendingCombat) {
      autoResolvedCombatIdRef.current = null;
    }
  }, [pendingCombat]);

  const handleHotspotClick = useCallback(
    async (action: SceneAction) => {
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
              onLogout={onLogout}
            />
          ) : null}

          {(baseStage === 'world' || baseStage === 'travel') && (
            <GameShellWorldStage
              baseStage={baseStage}
              selectedExerciseId={selectedExerciseId}
              onIntent={handleIntent}
              activeScene={activeScene}
              hotspotBadges={hotspotBadges}
              hotspotToneById={hotspotToneById}
              onHotspotClick={handleHotspotClick}
              state={state}
              activeTravel={activeTravel}
              activeTravelReady={activeTravelReady}
              clock={clock}
              busy={busy}
              worldWindowContent={worldWindowContent}
              heroInfoContent={heroInfoContent}
              enemyInfoContent={enemyInfoContent}
              infoWindow={infoWindow}
              infoWindowContent={infoWindowContent}
              showActionDock={showActionDock}
              onCloseInfo={() => setInfoWindow('none')}
            />
          )}

          {baseStage === 'sheet' ? (
            <GameShellSheetStage
              state={state}
              sheetTab={sheetTab}
              selectedItemStackId={selectedItemStackId}
              selectedPetId={selectedPetId}
              onSelectPet={handleSelectPet}
              onIntent={handleIntent}
              worldWindowContent={worldWindowContent}
              enemyInfoContent={enemyInfoContent}
              infoWindow={infoWindow}
              infoWindowContent={infoWindowContent}
              onCloseInfo={() => setInfoWindow('none')}
            />
          ) : null}

          {baseStage === 'combat' && state.character ? (
            <GameShellCombatStage
              state={state}
              combatEnemy={combatEnemy}
              replayFrame={replayFrame}
              petAssistArmed={petAssistArmed}
              petAssistAvailable={petAssistAvailable}
              selectedPetId={displayedCombatPetId}
              battlePetId={activeBattlePetId}
              visibleReplayTurns={visibleReplayTurns}
              onIntent={handleIntent}
              worldWindowContent={worldWindowContent}
              rewardVisible={rewardVisible}
              latestResolvedCombat={latestResolvedCombat}
              rewardBattlePetId={activeBattlePetId}
              onCloseReward={closeReward}
              heroInfoContent={heroInfoContent}
              enemyInfoContent={enemyInfoContent}
              infoWindow={infoWindow}
              infoWindowContent={infoWindowContent}
              onCloseInfo={() => setInfoWindow('none')}
            />
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

function isCommandIntent(intent: GameIntent) {
  switch (intent.type) {
    case 'acceptTask':
    case 'startTravel':
    case 'claimTravel':
    case 'startArena':
    case 'resolveCombat':
    case 'showReward':
    case 'equipItem':
    case 'unequipItem':
    case 'purchaseItem':
    case 'upgradeItem':
    case 'allocateStat':
    case 'feedPet':
    case 'refillEnergy':
      return true;
    default:
      return false;
  }
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

function resolvedPetIdForCombat(state: BootstrapState, combatId: string) {
  return state.combats.find((combat) => combat.id === combatId)?.log?.petId ?? null;
}

function isKnownPetId(petId: string) {
  return PET_VARIANTS.some((pet) => pet.id === petId);
}

function firstUsableCombatPetId({
  state,
  petRoster,
  preferredPetIds,
}: {
  state: BootstrapState;
  petRoster: NonNullable<BootstrapState['petRoster']>;
  preferredPetIds: Array<string | null | undefined>;
}) {
  for (const petId of preferredPetIds) {
    if (!petId || !isKnownPetId(petId)) {
      continue;
    }
    const rosterEntry = petRoster.find((pet) => pet.petId === petId);
    const definition = state.items.find((item) => item.id === petId && item.slot === 'pet');
    if (rosterEntry && rosterEntry.food > 0 && definition?.petCombatStats) {
      return petId;
    }
  }

  return null;
}

function readInitialSelectedPetId() {
  if (typeof window === 'undefined') {
    return 'kitten';
  }

  const storedPetId = window.localStorage.getItem(SELECTED_PET_STORAGE_KEY);
  return storedPetId && isKnownPetId(storedPetId) ? storedPetId : 'kitten';
}

function persistSelectedPetId(petId: string) {
  if (typeof window === 'undefined' || !isKnownPetId(petId)) {
    return;
  }

  window.localStorage.setItem(SELECTED_PET_STORAGE_KEY, petId);
}
