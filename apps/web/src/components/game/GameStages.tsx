import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type DragEvent,
} from 'react';
import { exerciseDefinitions } from '@lov2/game-data';
import {
  forgeUpgradeCost,
  statAllocationGoldCost,
  type BootstrapState,
  type CombatEncounter,
  type CombatTurn,
  type EnemyDefinition,
  type EquipmentSlot,
  type InventoryStack,
  type ItemDefinition,
  type QuestDefinition,
  type Race,
  type TravelTask,
} from '@lov2/shared';
import { characterAvatarPath, characterImagePath } from '../../game/characterIdentity.js';
import type { GameIntent, MetaTab, RouteState, SheetTab } from '../../game/types.js';
import { assetPath } from './assets.js';
import {
  APPEARANCE_OPTIONS,
  DRAG_STACK_TYPE,
  DRAG_STORE_ITEM_TYPE,
  EXERCISE_BRIEFS,
  JOURNAL_COPY,
  LEADERBOARD_CATEGORIES,
  LEADERBOARD_COPY,
  LEFT_SLOTS,
  META_LABELS,
  PAYMENT_OFFERS,
  PET_VARIANTS,
  PRIMARY_STATS,
  PROFILE_REWARDS,
  QUEST_HINTS,
  RIGHT_SLOTS,
  SLOT_HINTS,
  SLOT_LABELS,
  STAT_AGILITY,
  STAT_INTUITION,
  STAT_LUCK,
  STAT_STRENGTH,
  STORE_CONTRACTS,
  TOWER_HALLS,
  type AppearanceKey,
  type AppearanceOption,
} from './GamePanels.data.js';
import {
  appearanceTitle,
  buildArmorBreakdown,
  buildCharacterTotals,
  buildDamageRange,
  buildHealthBreakdown,
  buildProfileSummaryStats,
  buildStatBreakdowns,
  buildTravelProgress,
  formatDuration,
  formatPrice,
  getBackpackStacks,
  getItemStatTags,
  orderBackpackStacks,
  readDraggedStackId,
  readDraggedStoreItemId,
  setItemHoverPosition,
  setItemHoverPositionFromFocus,
  statTitle,
  type BreakdownKey,
  type EquippedEntry,
  type StatBreakdown,
} from './GamePanels.logic.js';
import { ItemChip, Meter } from './ui.js';
import { WorldWindowShell } from './GameWindowShell.js';
import { enemyAssetId, enemyAvatarAssetId, enemyDisplayName } from './enemyPresentation.js';
export function TravelStage({
  state,
  activeTravel,
  activeTravelReady,
  clock,
  busy = false,
  onIntent,
}: {
  state: BootstrapState;
  activeTravel: TravelTask | undefined;
  activeTravelReady: boolean;
  clock: number;
  busy?: boolean;
  onIntent: (intent: GameIntent) => void;
}) {
  const activeQuest = activeTravel?.questId ? state.quests.find((quest) => quest.id === activeTravel.questId) : undefined;
  const activeLocation = activeTravel?.locationId
    ? state.locations.find((location) => location.id === activeTravel.locationId)
    : undefined;
  const progress = activeTravel ? buildTravelProgress(activeTravel, clock) : null;
  const progressPercent = progress?.percent ?? 0;
  const canRushTravel = Boolean(!busy && activeTravel && !activeTravelReady && (state.character?.gems ?? 0) >= 1);
  const characterImageSrc = state.character ? characterAvatarPath(state.character) : null;
  const travelMap = selectTravelMap(activeTravel?.locationId, activeQuest?.id, activeLocation?.sceneAssetId);
  const travelOffset = progressPercent / 100;
  const travelStyle = {
    '--travel-progress': progressPercent,
    '--travel-map-x': `${-6 - travelOffset * 18}%`,
    '--travel-map-y': `${-3 - travelOffset * 8}%`,
    '--travel-map-scale': `${1.1 + travelOffset * 0.04}`,
  } as CSSProperties;

  return (
    <section
      className="shell-reset-travel-stage lov-travel-stage"
      data-testid="travel-screen"
      data-travel-location={activeTravel?.locationId ?? activeQuest?.locationId ?? 'unknown'}
      style={travelStyle}
    >
      <div className="shell-reset-travel-art lov-travel-map-viewport">
        <img
          className="lov-travel-map-layer"
          data-testid="travel-map-layer"
          src={travelMap.path}
          alt=""
        />
        <img
          className="lov-travel-map-layer lov-travel-map-ghost"
          src={travelMap.path}
          alt=""
          aria-hidden="true"
        />
      </div>

      <div className="lov-travel-pin" data-testid="travel-hero-marker">
        {characterImageSrc ? <img src={characterImageSrc} alt="" data-testid="travel-character-image" /> : null}
      </div>

      <div className="lov-travel-bottom">
        <div className="shell-reset-travel-progress lov-travel-progress">
          <span style={{ width: `${progress?.percent ?? 0}%` }} />
        </div>
        <strong>{progress ? formatDuration(progress.secondsLeft) : '00:01:50'}</strong>
        <button
          type="button"
          className="lov-skip-button"
          data-testid="travel-rush-button"
          disabled={!canRushTravel}
          onClick={() => activeTravel && onIntent({ type: 'claimTravel', travelId: activeTravel.id, rush: true })}
        >
          Не хочу ждать! · 1 жемчужина
        </button>
      </div>

      {activeQuest ? (
        <div className="lov-travel-quest-tag" data-testid="travel-panel">
          <strong>{activeQuest.titleRu}</strong>
          <span>{activeLocation?.nameRu ?? activeQuest.locationId}</span>
        </div>
      ) : null}
    </section>
  );
}

type TravelMapChoice = {
  path: string;
  match: (locationId?: string, questId?: string, sceneAssetId?: string) => boolean;
};

const TRAVEL_MAPS: TravelMapChoice[] = [
  {
    path: '/assets/generated/travel-maps/travel_map_fog_harbor_pan_01.png',
    match: (locationId, questId) =>
      locationId === 'fog-harbor' || questId === 'harbor-lantern' || questId === 'ember-whelp-first-flight',
  },
  {
    path: '/assets/generated/travel-maps/travel_map_mountain_pass_pan_01.png',
    match: (locationId, questId, sceneAssetId) =>
      locationId === 'crimson-arena' || questId === 'ash-baron-duel' || sceneAssetId === 'scene-combat',
  },
  {
    path: '/assets/generated/travel-maps/travel_map_ruined_coast_pan_01.png',
    match: (locationId, questId, sceneAssetId) =>
      locationId === 'old-tavern' || questId === 'tavern-first-contract' || sceneAssetId === 'scene-tavern',
  },
];

function selectTravelMap(locationId?: string, questId?: string, sceneAssetId?: string) {
  return TRAVEL_MAPS.find((map) => map.match(locationId, questId, sceneAssetId)) ?? TRAVEL_MAPS[0]!;
}

export function CombatStage({
  state,
  enemy,
  characterHealth,
  characterMaxHealth,
  enemyHealth,
  enemyMaxHealth,
  petHealth,
  petMaxHealth,
  petAssistArmed,
  petAssistAvailable,
  selectedPetId,
  battlePetId,
  replayTurns,
  onIntent,
}: {
  state: BootstrapState;
  enemy: EnemyDefinition | undefined;
  characterHealth: number;
  characterMaxHealth: number;
  enemyHealth: number;
  enemyMaxHealth: number;
  petHealth: number;
  petMaxHealth: number;
  petAssistArmed: boolean;
  petAssistAvailable: boolean;
  selectedPetId: string;
  battlePetId: string | null;
  replayTurns: CombatTurn[] | undefined;
  onIntent: (intent: GameIntent) => void;
}) {
  const character = state.character;
  if (!character || !enemy) {
    return null;
  }

  const heroSrc = characterImagePath(character);
  const heroAvatarSrc = characterAvatarPath(character);
  const displayedEnemyName = enemyDisplayName(enemy);
  const displayedEnemyAssetId = enemyAssetId(enemy);
  const displayedEnemyAvatarAssetId = enemyAvatarAssetId(enemy) ?? displayedEnemyAssetId;
  const activePetId = battlePetId ?? selectedPetId;
  const selectedPet = PET_VARIANTS.find((pet) => pet.id === activePetId) ?? PET_VARIANTS[2]!;
  const selectedPetDefinition = state.items.find((item) => item.id === activePetId && item.slot === 'pet');
  const selectedPetCombatStats = selectedPetDefinition?.petCombatStats;
  const selectedPetName = selectedPetDefinition?.nameRu ?? selectedPet.name;
  const selectedPetLevel = selectedPetCombatStats?.level ?? selectedPet.level;
  const latestReplayTurn = replayTurns?.[replayTurns.length - 1];
  const recentTurns = latestReplayTurn ? [latestReplayTurn] : [];
  const petSummoned = Boolean(battlePetId || petAssistArmed);
  const petActing = petSummoned && latestReplayTurn?.actor === 'pet';
  const displayedPetHealth = petMaxHealth > 0 ? petHealth : selectedPetCombatStats?.health ?? selectedPet.hp;
  const displayedPetMaxHealth = petMaxHealth > 0 ? petMaxHealth : selectedPetCombatStats?.health ?? selectedPet.hp;
  const latestTarget = targetForTurn(latestReplayTurn);
  const turnPulseClass = latestReplayTurn ? `turn-${latestReplayTurn.turn % 2}` : '';
  const heroMotionClass = fighterMotionClass(latestReplayTurn, latestTarget, 'character', turnPulseClass);
  const enemyMotionClass = fighterMotionClass(latestReplayTurn, latestTarget, 'enemy', turnPulseClass);
  const petMotionClass = fighterMotionClass(latestReplayTurn, latestTarget, 'pet', turnPulseClass);
  const petButtonActive = petAssistAvailable && Boolean(petAssistArmed || battlePetId);

  return (
    <section className="shell-reset-combat-stage lov-combat-stage" data-testid="combat-screen">
      <div className="shell-reset-combat-art">
        <img src={assetPath('scene-combat')} alt="" />
      </div>

      <div className="lov-combat-top">
        <div className="lov-combat-header ally">
          <button
            type="button"
            className="lov-combat-avatar hero"
            data-testid="combat-hero-info-button"
            aria-label="Сведения о герое"
            onClick={() => onIntent({ type: 'openInfo', windowId: 'heroInfo' })}
          >
            <img src={heroAvatarSrc} alt="" data-testid="combat-character-avatar" />
          </button>
          <div className="lov-combat-meta">
            <strong>{character.name}</strong>
            <span>{character.level}</span>
            <div className="lov-health-track">
              <i style={{ width: `${Math.round((characterHealth / Math.max(1, characterMaxHealth)) * 100)}%` }} />
            </div>
            <small>{characterHealth}</small>
          </div>
        </div>

        <button
          type="button"
          className="lov-skip-battle"
          data-testid="combat-skip-button"
          onClick={() => onIntent({ type: 'showReward' })}
        >
          Пропустить бой
        </button>

        <div className="lov-combat-header enemy">
          <div className="lov-combat-meta">
            <strong>{displayedEnemyName}</strong>
            <span>{enemy.level}</span>
            <div className="lov-health-track">
              <i style={{ width: `${Math.round((enemyHealth / Math.max(1, enemyMaxHealth)) * 100)}%` }} />
            </div>
            <small>{enemyHealth}</small>
          </div>
          <button
            type="button"
            className="lov-combat-avatar enemy"
            data-testid="combat-enemy-info-button"
            aria-label="Сведения о противнике"
            onClick={() => onIntent({ type: 'openInfo', windowId: 'enemyInfo' })}
          >
            <img src={assetPath(displayedEnemyAvatarAssetId)} alt="" />
          </button>
        </div>
      </div>

      <div className="lov-battle-stage">
        <div className="lov-fighter-slot hero">
          <img className={`lov-fighter hero ${heroMotionClass}`} src={heroSrc} alt="" data-testid="combat-character-fighter" />
        </div>
        <div className="lov-fighter-slot enemy">
          <img
            className={`lov-fighter enemy ${enemyMotionClass}`}
            src={assetPath(displayedEnemyAssetId)}
            alt=""
            data-testid="combat-enemy-fighter"
          />
        </div>
        {petSummoned ? (
          <div className={`lov-battle-pet-wrap pet-${selectedPet.id}`}>
            <img
              className={`lov-battle-pet summoned armed ${petMotionClass} ${petActing ? 'assisting' : ''}`}
              data-testid="combat-summoned-pet"
              src={assetPath(selectedPet.assetId)}
              alt=""
              aria-hidden="true"
            />
            <div className="lov-pet-battle-health">
              <span>{selectedPetName}</span>
              <div className="lov-health-track">
                <i style={{ width: `${Math.round((displayedPetHealth / Math.max(1, displayedPetMaxHealth)) * 100)}%` }} />
              </div>
              <small>{displayedPetHealth}</small>
            </div>
          </div>
        ) : null}
      </div>

      <div className="lov-battle-bottom">
        <div className={`lov-pet-card ${petButtonActive ? 'active' : ''}`}>
          <button
            type="button"
            className={`lov-toggle-chip ${petButtonActive ? 'active' : ''}`}
            disabled={!petAssistAvailable}
            onClick={() => onIntent({ type: 'togglePetAssist' })}
          >
            Вызывать питомца
          </button>
          <div className="lov-pet-card-body">
            <button
              type="button"
              className="lov-pet-card-image"
              data-testid="pet-assist-button"
              aria-label="Вызвать питомца"
              disabled={!petAssistAvailable}
              onClick={() => onIntent({ type: 'togglePetAssist' })}
            >
              <img src={assetPath(selectedPet.assetId)} alt="" />
            </button>
            <div className="lov-pet-card-copy">
              <strong>{selectedPetName}</strong>
              <span>{selectedPetLevel} уровень</span>
              <div className="lov-health-track">
                <i style={{ width: `${Math.round((displayedPetHealth / Math.max(1, displayedPetMaxHealth)) * 100)}%` }} />
              </div>
              <small>{displayedPetHealth}</small>
            </div>
          </div>
        </div>
      </div>

      {recentTurns.length ? (
        <div className="shell-reset-damage-layer" aria-hidden="true">
          {recentTurns.map((turn: CombatTurn, index: number) => (
            <span
              key={`${turn.turn}-${turn.actor}-${turn.damage}-${index}`}
              className={`shell-reset-damage ${damageTargetClass(turn)} actor-${turn.actor} ${turn.critical ? 'critical' : ''}`}
              style={{ '--damage-stack-offset': `${index * 30}px` } as CSSProperties}
            >
              -{turn.damage}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function damageTargetClass(turn: CombatTurn) {
  if (turn.target === 'pet') {
    return 'to-pet';
  }
  if (turn.target === 'enemy' || (!turn.target && turn.actor === 'character')) {
    return 'to-enemy';
  }
  return 'to-hero';
}

type CombatTarget = NonNullable<CombatTurn['target']>;

function targetForTurn(turn: CombatTurn | undefined): CombatTarget | null {
  if (!turn) {
    return null;
  }
  if (turn.target) {
    return turn.target;
  }
  return turn.actor === 'enemy' ? 'character' : 'enemy';
}

function fighterMotionClass(
  turn: CombatTurn | undefined,
  target: CombatTarget | null,
  fighter: CombatTarget,
  pulseClass: string,
) {
  if (!turn) {
    return '';
  }

  const classes = [];
  if (target === fighter) {
    classes.push('hit', pulseClass);
  }
  if (turn.actor === fighter) {
    classes.push('attacking', pulseClass);
  }
  return classes.join(' ');
}

function rewardPetForCombat(latestResolvedCombat: CombatEncounter | undefined, battlePetId?: string | null) {
  const petId = latestResolvedCombat?.log?.petId ?? battlePetId;
  const pet = PET_VARIANTS.find((entry) => entry.id === petId);
  const petTookTurn = Boolean(latestResolvedCombat?.log?.turns.some((turn) => turn.actor === 'pet'));
  return pet && petTookTurn ? pet : null;
}

function combatSourceLabel(source: CombatEncounter['source'] | undefined) {
  if (source === 'arena') {
    return '\u0436\u0435\u043c\u0447\u0443\u0433 \u0441 \u0430\u0440\u0435\u043d\u044b';
  }
  if (source === 'travel') {
    return '\u0436\u0435\u043c\u0447\u0443\u0433 \u0438\u0437 \u0434\u043e\u0440\u043e\u0436\u043d\u043e\u0433\u043e \u0431\u043e\u044f';
  }
  return '\u0436\u0435\u043c\u0447\u0443\u0433 \u0437\u0430 \u0431\u043e\u0439';
}

export function RewardWindow({
  character,
  latestResolvedCombat,
  battlePetId,
  onContinue,
}: {
  character: NonNullable<BootstrapState['character']>;
  latestResolvedCombat: CombatEncounter | undefined;
  battlePetId?: string | null;
  onContinue: () => void;
}) {
  const reward = latestResolvedCombat?.log?.reward;
  const didWin =
    latestResolvedCombat?.status === 'won'
    || latestResolvedCombat?.log?.winner === 'character';
  const showRewardValues = didWin && Boolean((reward?.gold ?? 0) > 0 || (reward?.experience ?? 0) > 0 || (reward?.gems ?? 0) > 0);
  const rewardPet = rewardPetForCombat(latestResolvedCombat, battlePetId);

  return (
    <section className={`lov-victory-window ${didWin ? 'is-victory' : 'is-defeat'}`} data-testid="reward-screen">
      <div className="lov-victory-left">
        <img src={characterImagePath(character)} alt="" data-testid="reward-character-image" />
      </div>
      <div className="lov-victory-right">
        <h2>Победа!</h2>
        <p>Теперь ты можешь гордиться собой!</p>
        <span>Твоя награда:</span>
        <div className="lov-victory-rewards">
          <strong>{reward?.gold ?? 0} золота</strong>
          <strong>{reward?.experience ?? 0} XP</strong>
          {(reward?.gems ?? 0) > 0 ? <strong>{reward?.gems ?? 0} {combatSourceLabel(latestResolvedCombat?.source)}</strong> : null}
        </div>
        <div className="lov-reward-drop" aria-hidden="true" />
        {showRewardValues && rewardPet ? (
          <div className="lov-pet-xp">
            <img src={assetPath(rewardPet.assetId)} alt="" />
            <strong>{latestResolvedCombat?.log?.petExperienceGained ?? 0} XP</strong>
          </div>
        ) : null}
        <button type="button" data-testid="reward-continue-button" onClick={onContinue}>
          Закрыть
        </button>
      </div>
    </section>
  );
}

export function CombatResultWindow({
  character,
  latestResolvedCombat,
  battlePetId,
  onContinue,
}: {
  character: NonNullable<BootstrapState['character']>;
  latestResolvedCombat: CombatEncounter | undefined;
  battlePetId?: string | null;
  onContinue: () => void;
}) {
  const reward = latestResolvedCombat?.log?.reward;
  const didWin =
    latestResolvedCombat?.status === 'won'
    || latestResolvedCombat?.log?.winner === 'character';
  const showRewardValues = didWin && Boolean((reward?.gold ?? 0) > 0 || (reward?.experience ?? 0) > 0 || (reward?.gems ?? 0) > 0);
  const rewardPet = rewardPetForCombat(latestResolvedCombat, battlePetId);

  return (
    <section className={`lov-victory-window ${didWin ? 'is-victory' : 'is-defeat'}`} data-testid="reward-screen">
      <div className="lov-victory-left">
        <img src={characterImagePath(character)} alt="" data-testid="reward-character-image" />
      </div>
      <div className="lov-victory-right">
        <h2>{didWin ? '\u041f\u043e\u0431\u0435\u0434\u0430!' : '\u041f\u043e\u0440\u0430\u0436\u0435\u043d\u0438\u0435!'}</h2>
        <p>
          {didWin
            ? '\u0422\u0435\u043f\u0435\u0440\u044c \u0442\u044b \u043c\u043e\u0436\u0435\u0448\u044c \u0433\u043e\u0440\u0434\u0438\u0442\u044c\u0441\u044f \u0441\u043e\u0431\u043e\u0439!'
            : '\u041d\u0430 \u044d\u0442\u043e\u0442 \u0440\u0430\u0437 \u043f\u0440\u043e\u0442\u0438\u0432\u043d\u0438\u043a \u043e\u043a\u0430\u0437\u0430\u043b\u0441\u044f \u0441\u0438\u043b\u044c\u043d\u0435\u0435. \u0421\u043e\u0431\u0435\u0440\u0438 \u0441\u0438\u043b\u044b \u0438 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439 \u0441\u043d\u043e\u0432\u0430.'}
        </p>
        {showRewardValues ? (
          <>
            <span>{'\u0422\u0432\u043e\u044f \u043d\u0430\u0433\u0440\u0430\u0434\u0430:'}</span>
            <div className="lov-victory-rewards">
              <strong>{reward?.gold ?? 0} {'\u0437\u043e\u043b\u043e\u0442\u0430'}</strong>
              <strong>{reward?.experience ?? 0} XP</strong>
              {(reward?.gems ?? 0) > 0 ? <strong>{reward?.gems ?? 0} {combatSourceLabel(latestResolvedCombat?.source)}</strong> : null}
            </div>
            <div className="lov-reward-drop" aria-hidden="true" />
            {rewardPet ? (
              <div className="lov-pet-xp">
                <img src={assetPath(rewardPet.assetId)} alt="" />
                <strong>{latestResolvedCombat?.log?.petExperienceGained ?? 0} XP</strong>
              </div>
            ) : null}
          </>
        ) : null}
        <button type="button" data-testid="reward-continue-button" onClick={onContinue}>
          {'\u0417\u0430\u043a\u0440\u044b\u0442\u044c'}
        </button>
      </div>
    </section>
  );
}
