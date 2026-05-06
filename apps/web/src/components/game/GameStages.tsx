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
  getEquippedBySlot,
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
import { ItemChip, Meter, UiIcon } from './ui.js';
import { WorldWindowShell } from './GameWindowShell.js';
import { paperDollHeroAssetId } from './GameCharacterPanels.js';
import { enemyAssetId, enemyDisplayName } from './enemyPresentation.js';
export function TravelStage({
  state,
  activeTravel,
  activeTravelReady,
  clock,
  onIntent,
}: {
  state: BootstrapState;
  activeTravel: TravelTask | undefined;
  activeTravelReady: boolean;
  clock: number;
  onIntent: (intent: GameIntent) => void;
}) {
  const activeQuest = activeTravel?.questId ? state.quests.find((quest) => quest.id === activeTravel.questId) : undefined;
  const progress = activeTravel ? buildTravelProgress(activeTravel, clock) : null;
  const progressPercent = progress?.percent ?? 0;
  const canRushTravel = Boolean(activeTravel && (activeTravelReady || (state.character?.gems ?? 0) >= 1));

  return (
    <section
      className="shell-reset-travel-stage lov-travel-stage"
      data-testid="travel-screen"
      style={{ '--travel-progress': progressPercent } as CSSProperties}
    >
      <div className="shell-reset-travel-art">
        <img src={assetPath('scene-map')} alt="" />
      </div>

      <aside className="lov-travel-sidebar">
        <div className="lov-travel-sidecard">
          <span>{progress ? formatDuration(progress.secondsLeft) : '00:41:46'}</span>
        </div>
      </aside>

      <div className="lov-travel-pin">
        <img src="/assets/generated/characters/character-face-portrait.jpg" alt="" />
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
          onClick={() => activeTravel && onIntent({ type: 'claimTravel', travelId: activeTravel.id, rush: !activeTravelReady })}
        >
          Не хочу ждать! · 1 жемчужина
        </button>
      </div>

      {activeQuest ? (
        <div className="lov-travel-quest-tag" data-testid="travel-panel">
          <strong>{activeQuest.titleRu}</strong>
          <span>{activeQuest.locationId}</span>
        </div>
      ) : null}
    </section>
  );
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
  selectedPetId,
  battlePetId,
  combatLocked,
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
  selectedPetId: string;
  battlePetId: string | null;
  combatLocked: boolean;
  replayTurns: CombatTurn[] | undefined;
  onIntent: (intent: GameIntent) => void;
}) {
  const character = state.character;
  if (!character || !enemy) {
    return null;
  }

  const equippedBySlot = getEquippedBySlot(state);
  const heroAssetId = paperDollHeroAssetId(equippedBySlot);
  const displayedEnemyName = enemyDisplayName(enemy);
  const displayedEnemyAssetId = enemyAssetId(enemy);
  const activePetId = battlePetId ?? selectedPetId;
  const selectedPet = PET_VARIANTS.find((pet) => pet.id === activePetId) ?? PET_VARIANTS[2]!;
  const latestReplayTurn = replayTurns?.[replayTurns.length - 1];
  const recentTurns = latestReplayTurn ? [latestReplayTurn] : [];
  const petSummoned = Boolean(battlePetId || petAssistArmed);
  const petActing = petSummoned && latestReplayTurn?.actor === 'pet';
  const latestTurnLabel = latestReplayTurn ? combatTurnLabel(latestReplayTurn, selectedPet.name, displayedEnemyName, character.name) : null;
  const displayedPetHealth = petMaxHealth > 0 ? petHealth : selectedPet.hp;
  const displayedPetMaxHealth = petMaxHealth > 0 ? petMaxHealth : selectedPet.hp;
  const latestTarget = targetForTurn(latestReplayTurn);
  const turnPulseClass = latestReplayTurn ? `turn-${latestReplayTurn.turn % 2}` : '';
  const heroMotionClass = fighterMotionClass(latestReplayTurn, latestTarget, 'character', turnPulseClass);
  const enemyMotionClass = fighterMotionClass(latestReplayTurn, latestTarget, 'enemy', turnPulseClass);
  const petMotionClass = fighterMotionClass(latestReplayTurn, latestTarget, 'pet', turnPulseClass);
  const petButtonActive = Boolean(petAssistArmed || battlePetId);

  return (
    <section className="shell-reset-combat-stage lov-combat-stage" data-testid="combat-screen">
      <div className="shell-reset-combat-art">
        <img src={assetPath('scene-combat')} alt="" />
      </div>

      <div className="lov-combat-top">
        <div className="lov-combat-header ally">
          <button
            type="button"
            className="lov-combat-info-button"
            data-testid="combat-hero-info-button"
            aria-label="Сведения о герое"
            onClick={() => onIntent({ type: 'openInfo', windowId: 'heroInfo' })}
          >
            <UiIcon name="info" />
          </button>
          <div className="lov-combat-avatar hero">
            <img src={assetPath(heroAssetId)} alt="" />
          </div>
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
          <div className="lov-combat-avatar enemy">
            <img src={assetPath(displayedEnemyAssetId)} alt="" />
          </div>
          <button
            type="button"
            className="lov-combat-info-button"
            data-testid="combat-enemy-info-button"
            aria-label="Сведения о противнике"
            onClick={() => onIntent({ type: 'openInfo', windowId: 'enemyInfo' })}
          >
            <UiIcon name="info" />
          </button>
        </div>
      </div>

      <div className="lov-battle-stage">
        <img className={`lov-fighter hero ${heroMotionClass}`} src={assetPath(heroAssetId)} alt="" />
        <img className={`lov-fighter enemy ${enemyMotionClass}`} src={assetPath(displayedEnemyAssetId)} alt="" />
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
              <span>{selectedPet.name}</span>
              <div className="lov-health-track">
                <i style={{ width: `${Math.round((displayedPetHealth / Math.max(1, displayedPetMaxHealth)) * 100)}%` }} />
              </div>
              <small>{displayedPetHealth}</small>
            </div>
          </div>
        ) : null}
      </div>

      {latestTurnLabel ? (
        <div className={`lov-combat-turn-callout actor-${latestReplayTurn?.actor ?? 'none'}`}>
          <strong>{latestTurnLabel.title}</strong>
          <span>{latestTurnLabel.detail}</span>
        </div>
      ) : null}

      <div className="lov-battle-bottom">
        <div className="lov-pet-card">
          <button
            type="button"
            className={`lov-toggle-chip ${petButtonActive ? 'active' : ''}`}
            data-testid="pet-assist-button"
            disabled={combatLocked}
            onClick={() => onIntent({ type: 'togglePetAssist' })}
          >
            Вызывать питомца
          </button>
          <div className="lov-pet-card-body">
            <div className="lov-pet-card-image">
              <img src={assetPath(selectedPet.assetId)} alt="" />
            </div>
            <div className="lov-pet-card-copy">
              <strong>{selectedPet.name}</strong>
              <span>{selectedPet.level} уровень</span>
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
              style={{ '--float-index': `${index}` } as CSSProperties}
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

function combatTurnLabel(turn: CombatTurn, petName: string, enemyName: string, heroName: string) {
  const actor = turn.actor === 'pet' ? petName : turn.actor === 'character' ? heroName : enemyName;
  const turnTarget = targetForTurn(turn);
  const target = turnTarget === 'pet' ? petName : turnTarget === 'enemy' ? enemyName : heroName;
  return {
    title: turn.critical ? 'Критический удар' : 'Удар',
    detail: `${actor} → ${target}: ${turn.damage}`,
  };
}

function rewardPetForCombat(latestResolvedCombat: CombatEncounter | undefined, battlePetId?: string | null) {
  const petId = latestResolvedCombat?.log?.petId ?? battlePetId;
  const pet = PET_VARIANTS.find((entry) => entry.id === petId);
  const petTookTurn = Boolean(latestResolvedCombat?.log?.turns.some((turn) => turn.actor === 'pet'));
  return pet && petTookTurn ? pet : null;
}

export function RewardWindow({
  latestResolvedCombat,
  battlePetId,
  onContinue,
}: {
  latestResolvedCombat: CombatEncounter | undefined;
  battlePetId?: string | null;
  onContinue: () => void;
}) {
  const reward = latestResolvedCombat?.log?.reward;
  const didWin =
    latestResolvedCombat?.status === 'won'
    || latestResolvedCombat?.log?.winner === 'character';
  const showRewardValues = didWin && Boolean((reward?.gold ?? 0) > 0 || (reward?.experience ?? 0) > 0);
  const rewardPet = rewardPetForCombat(latestResolvedCombat, battlePetId);

  return (
    <section className={`lov-victory-window ${didWin ? 'is-victory' : 'is-defeat'}`} data-testid="reward-screen">
      <div className="lov-victory-left">
        <img src={assetPath('hero-nocturne')} alt="" />
      </div>
      <div className="lov-victory-right">
        <h2>Победа!</h2>
        <p>Теперь ты можешь гордиться собой!</p>
        <span>Твоя награда:</span>
        <div className="lov-victory-rewards">
          <strong>{reward?.gold ?? 0} золота</strong>
          <strong>{reward?.experience ?? 0} XP</strong>
        </div>
        <div className="lov-reward-drop" aria-hidden="true" />
        {showRewardValues && rewardPet ? (
          <div className="lov-pet-xp">
            <img src={assetPath(rewardPet.assetId)} alt="" />
            <strong>1 XP</strong>
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
  latestResolvedCombat,
  battlePetId,
  onContinue,
}: {
  latestResolvedCombat: CombatEncounter | undefined;
  battlePetId?: string | null;
  onContinue: () => void;
}) {
  const reward = latestResolvedCombat?.log?.reward;
  const didWin =
    latestResolvedCombat?.status === 'won'
    || latestResolvedCombat?.log?.winner === 'character';
  const showRewardValues = didWin && Boolean((reward?.gold ?? 0) > 0 || (reward?.experience ?? 0) > 0);
  const rewardPet = rewardPetForCombat(latestResolvedCombat, battlePetId);

  return (
    <section className={`lov-victory-window ${didWin ? 'is-victory' : 'is-defeat'}`} data-testid="reward-screen">
      <div className="lov-victory-left">
        <img src={assetPath('hero-nocturne')} alt="" />
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
            </div>
            <div className="lov-reward-drop" aria-hidden="true" />
            {rewardPet ? (
              <div className="lov-pet-xp">
                <img src={assetPath(rewardPet.assetId)} alt="" />
                <strong>1 XP</strong>
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


