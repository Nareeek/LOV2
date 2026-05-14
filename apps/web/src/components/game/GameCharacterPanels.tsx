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
  levelFromExperience,
  primaryDamageStatForClass,
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
import {
  characterAvatarPath,
  characterImagePath,
  characterRaceClassLabel,
  characterRaceSignPath,
} from '../../game/characterIdentity.js';
import type { GameIntent, MetaTab, RouteState, SheetTab } from '../../game/types.js';
import { assetPath } from './assets.js';
import {
  APPEARANCE_OPTIONS,
  DRAG_STACK_TYPE,
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
  BACKPACK_SLOT_COUNT,
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
import { enemyDisplayName, enemyImagePath, enemyStatRows } from './enemyPresentation.js';
export function CharacterSheet({
  state,
  activeTab,
  selectedItemStackId,
  selectedPetId,
  onSelectPet,
  onIntent,
}: {
  state: BootstrapState;
  activeTab: SheetTab;
  selectedItemStackId: string | null;
  selectedPetId: string;
  onSelectPet: (petId: string) => void;
  onIntent: (intent: GameIntent) => void;
}) {
  const character = state.character;
  const [hoveredStat, setHoveredStat] = useState<BreakdownKey | null>(null);
  const [statTooltipPosition, setStatTooltipPosition] = useState({ x: 0, y: 0 });
  const [inventorySlotOrder, setInventorySlotOrder] = useState<Record<string, number>>({});
  const [appearance, setAppearance] = useState<Record<AppearanceKey, string>>({
    face: APPEARANCE_OPTIONS.face[1]!.id,
    hair: APPEARANCE_OPTIONS.hair[1]!.id,
    color: APPEARANCE_OPTIONS.color[1]!.id,
  });

  if (!character) {
    return null;
  }

  const race = state.races.find((entry) => entry.id === character.raceId);
  const raceLabel = race?.nameRu ?? character.raceId;
  const raceClassLabel = characterRaceClassLabel(raceLabel, character.classId);
  const characterImageSrc = characterImagePath(character);
  const raceSignSrc = characterRaceSignPath(character.raceId);
  const equippedBySlot = getEquippedBySlot(state);
  const equippedEntries = Object.values(equippedBySlot).filter((entry): entry is EquippedEntry => Boolean(entry));
  const backpack = orderBackpackStacks(getBackpackStacks(state), inventorySlotOrder, BACKPACK_SLOT_COUNT);
  const totals = buildCharacterTotals(state, equippedEntries);
  const breakdowns = buildStatBreakdowns(state, race, equippedEntries);
  const healthBreakdown = buildHealthBreakdown(state, race, equippedEntries);
  const armorBreakdown = buildArmorBreakdown(equippedEntries, totals.armor);
  const selectedPet = PET_VARIANTS.find((entry) => entry.id === selectedPetId) ?? PET_VARIANTS[2]!;
  const selectedPetRoster = (state.petRoster ?? []).find((entry) => entry.petId === selectedPet.id);
  const selectedPetDefinition = state.items.find((entry) => entry.id === selectedPet.id && entry.slot === 'pet');
  const selectedPetCombatStats = selectedPetDefinition?.petCombatStats;
  const selectedPetLevel = selectedPetCombatStats
    ? selectedPetCombatStats.level + Math.max(0, levelFromExperience(selectedPetRoster?.experience ?? 0) - 1)
    : selectedPet.level;
  const selectedPetFood = selectedPetRoster?.food ?? 0;
  const selectedPetExperience = selectedPetRoster?.experience ?? 0;
  const selectedPetMaxExperience = 360;
  const primaryDamageStat = primaryDamageStatForClass(character.classId);
  const profileSummaryStats = buildProfileSummaryStats(character, totals);
  const hoveredBreakdown =
    hoveredStat === 'health'
      ? healthBreakdown
      : hoveredStat === 'armor'
        ? armorBreakdown
        : hoveredStat
          ? breakdowns[hoveredStat]
          : null;
  const updateStatTooltipPosition = (event: { clientX: number; clientY: number }) => {
    setStatTooltipPosition({ x: event.clientX, y: event.clientY });
  };
  const feedPet = (requestedAmount: 1 | 10) => {
    onIntent({ type: 'feedPet', petId: selectedPet.id, amount: requestedAmount });
  };

  return (
    <section
      className={`shell-reset-sheet lov-sheet tab-${activeTab}`}
      data-testid={
        activeTab === 'pets' ? 'pet-sheet' : activeTab === 'inventory' ? 'inventory-sheet' : activeTab === 'profile' ? 'profile-sheet' : activeTab === 'appearance' ? 'appearance-sheet' : 'character-sheet'
      }
    >
      <button
        type="button"
        className="lov-sheet-close"
        data-testid="sheet-close-button"
        aria-label="Закрыть окно героя"
        onClick={() => onIntent({ type: 'closeSheet' })}
      >
        <UiIcon name="close" />
      </button>
      <aside className="shell-reset-sheet-rail lov-sheet-rail">
        <button type="button" className={activeTab === 'inventory' ? 'active' : ''} data-testid="character-tab-equipment" onClick={() => onIntent({ type: 'setSheetTab', tab: 'inventory' })}>
          Сумка
        </button>
        <button type="button" className={activeTab === 'character' ? 'active' : ''} data-testid="character-tab-stats" onClick={() => onIntent({ type: 'setSheetTab', tab: 'character' })}>
          Характеристики
        </button>
        <button type="button" className={activeTab === 'achievements' ? 'active' : ''} data-testid="character-tab-achievements" onClick={() => onIntent({ type: 'setSheetTab', tab: 'achievements' })}>
          Достижения
        </button>
        <button type="button" className={activeTab === 'pets' ? 'active' : ''} data-testid="character-tab-pets" onClick={() => onIntent({ type: 'setSheetTab', tab: 'pets' })}>
          Питомцы
        </button>
        <button type="button" className={activeTab === 'profile' ? 'active' : ''} data-testid="character-tab-profile" onClick={() => onIntent({ type: 'setSheetTab', tab: 'profile' })}>
          О герое
        </button>
        <button type="button" className={activeTab === 'appearance' ? 'active' : ''} data-testid="character-tab-appearance" onClick={() => onIntent({ type: 'setSheetTab', tab: 'appearance' })}>
          Внешность
        </button>
        <button type="button" className="back" data-testid="sheet-back-button" onClick={() => onIntent({ type: 'closeSheet' })}>
          <UiIcon name="back" />
        </button>
      </aside>

      <section className={`shell-reset-sheet-left lov-sheet-left tab-${activeTab}`}>
        {activeTab === 'character' ? (
          <div className="lov-stats-panel">
            <header className="lov-panel-header">
              <h2>Характеристики</h2>
            </header>

            <div
              className="lov-core-stat"
              onMouseEnter={() => setHoveredStat('health')}
              onMouseMove={updateStatTooltipPosition}
              onMouseLeave={() => setHoveredStat((current) => (current === 'health' ? null : current))}
            >
              <div className="lov-core-stat-icon">❤</div>
              <div className="lov-core-stat-body">
                <strong>Здоровье</strong>
                <span>{character.maxHealth}</span>
              </div>
            </div>

            <div
              className="lov-core-stat"
              onMouseEnter={() => setHoveredStat('armor')}
              onMouseMove={updateStatTooltipPosition}
              onMouseLeave={() => setHoveredStat((current) => (current === 'armor' ? null : current))}
            >
              <div className="lov-core-stat-icon">🛡</div>
              <div className="lov-core-stat-body">
                <strong>Броня</strong>
                <span>{totals.armor}</span>
              </div>
            </div>

            {PRIMARY_STATS.map((stat) => {
              const row = breakdowns[stat];
              const allocationCost = statAllocationGoldCost(character.stats[stat]);
              return (
                <div
                  key={stat}
                  className="lov-stat-group"
                  onMouseEnter={() => setHoveredStat(stat)}
                  onMouseMove={updateStatTooltipPosition}
                  onMouseLeave={() => setHoveredStat((current) => (current === stat ? null : current))}
                >
                  <div className="lov-primary-stat">
                    <div className="lov-primary-stat-main">
                      <span>{statTitle(stat)}</span>
                      <strong>{row.total}</strong>
                    </div>
                    <button
                      type="button"
                      className="lov-stat-add-button"
                      onClick={() => character.gold >= allocationCost && onIntent({ type: 'allocateStat', stat })}
                      disabled={character.gold < allocationCost}
                      aria-label={`Добавить ${statTitle(stat)}`}
                    >
                      <i>+</i>
                      <span className="lov-stat-add-tooltip">{statAllocationCostLabel(allocationCost)}</span>
                    </button>
                  </div>
                  <div className="lov-secondary-stat">{row.derivedLabel}</div>
                  <div className="lov-secondary-stat value">{row.derivedValue}</div>
                  {stat === primaryDamageStat ? (
                    <div className="lov-damage-row lov-damage-row-inline">
                      <span>Урон</span>
                      <strong>{buildDamageRange(totals.stats, character.classId, character.level)}</strong>
                    </div>
                  ) : null}
                </div>
              );
            })}

            <div className="lov-currency-row">
              <span className="lov-currency-pill gold">
                <img src={assetPath('icon-gold-coin')} alt="" />
                <strong>{character.gold}</strong>
              </span>
              <span className="lov-currency-pill pearls">
                <img src={assetPath('icon-moon-gem')} alt="" />
                <strong>{character.gems}</strong>
              </span>
            </div>

            {hoveredBreakdown ? <StatBreakdownCard breakdown={hoveredBreakdown} position={statTooltipPosition} /> : null}
          </div>
        ) : null}

        {activeTab === 'inventory' ? (
          <div className="lov-bag-screen">
            <header className="lov-panel-header">
              <h2>Рюкзак</h2>
            </header>
            <InventoryGrid
              state={state}
              stacks={backpack}
              selectedStackId={null}
              onSelect={() => onIntent({ type: 'closeInfo' })}
              onDropStack={(inventoryStackId, slotIndex) => {
                setInventorySlotOrder((current) => ({ ...current, [inventoryStackId]: slotIndex }));
                const stack = state.inventory.find((entry) => entry.id === inventoryStackId);
                if (stack?.equippedSlot) {
                  onIntent({ type: 'unequipItem', inventoryStackId });
                }
              }}
              dataTestId="inventory-panel"
              draggable
              fillSlots={BACKPACK_SLOT_COUNT}
            />
          </div>
        ) : null}

        {activeTab === 'pets' ? (
          <div className="lov-pet-screen">
            <header className="lov-panel-header">
              <h2>Питомцы</h2>
            </header>
            <div className="lov-pet-thumb-row">
              {PET_VARIANTS.map((pet) => (
                <button
                  key={pet.id}
                  type="button"
                  className={`lov-pet-thumb ${selectedPet.id === pet.id ? 'active' : ''}`}
                  onClick={() => onSelectPet(pet.id)}
                >
                  <img src={assetPath(pet.assetId)} alt="" />
                </button>
              ))}
            </div>
            <div className="lov-pet-progress-head">
              <div className="lov-pet-level">{selectedPetLevel}</div>
              <div className="lov-pet-name">
                <strong>{selectedPetDefinition?.nameRu ?? selectedPet.name}</strong>
                <Meter
                  label="XP"
                  value={selectedPetExperience % selectedPetMaxExperience}
                  max={selectedPetMaxExperience}
                  tone="xp"
                  displayValue={`${selectedPetExperience}/${selectedPetMaxExperience}`}
                />
              </div>
            </div>
            <div className="lov-pet-preview">
              <img src={assetPath(selectedPet.assetId)} alt="" />
            </div>
            <div className="lov-pet-core-stats">
              <span>❤ {selectedPetCombatStats?.health ?? selectedPet.hp}</span>
              <span>🐾 {selectedPet.damage}</span>
            </div>
            <div className="lov-pet-feeding">
              <div className="lov-pet-satiety">
                <strong>Сытость</strong>
                <span>{selectedPetFood}</span>
              </div>
              <div className="lov-pet-feed-buttons">
                <button type="button" onClick={() => feedPet(1)} disabled={(character.petFood ?? 0) < 1 || selectedPetFood >= 99}>
                  +1
                </button>
                <button type="button" onClick={() => feedPet(10)} disabled={(character.petFood ?? 0) < 1 || selectedPetFood >= 99}>
                  +10
                </button>
              </div>
              <div className="lov-pet-food">
                <strong>Еда</strong>
                <span>{character.petFood ?? 0}</span>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'profile' ? (
          <div className="lov-profile-screen">
            <div className="lov-profile-header">
              <div className="lov-profile-identity-art">
                <img src={characterImageSrc} alt="" data-testid="profile-character-image" />
                <img
                  className="lov-profile-race-sign"
                  src={raceSignSrc}
                  alt={raceLabel}
                  title={raceLabel}
                  data-testid="profile-race-sign"
                />
              </div>
              <div>
                <strong>{character.name}</strong>
                <span>{raceClassLabel}</span>
              </div>
            </div>
            <div className="lov-profile-stats">
              {profileSummaryStats.map((entry) => (
                <div key={entry.id} className="lov-profile-stat">
                  <span>{entry.label}</span>
                  <strong>{entry.value}</strong>
                </div>
              ))}
            </div>
            <div className="lov-quick-slots">
              {[assetPath('icon-onyx'), '', '', ''].map((src, index) => (
                <span key={`${src}-${index}`} className={`lov-quick-slot ${src ? 'filled' : ''}`}>
                  {src ? <img src={src} alt="" /> : null}
                </span>
              ))}
            </div>
            <div className="lov-motto-box">
              <span>Нет девиза</span>
              <button type="button" aria-label="Изменить девиз" disabled>
                ✎
              </button>
            </div>
            <div className="lov-reward-gallery">
              <strong>Награды и подарки</strong>
              <div className="lov-reward-gallery-grid">
                {PROFILE_REWARDS.map((reward) => (
                  <span key={reward.id} className={`lov-profile-reward ${reward.accent}`}>
                    {reward.label === 'Пусто' ? '' : reward.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'appearance' ? (
          <div className="lov-appearance-screen">
            <header className="lov-panel-header">
              <h2>Внешность</h2>
            </header>
            {(['face', 'hair', 'color'] as AppearanceKey[]).map((group) => (
              <AppearanceSelector
                key={group}
                title={appearanceTitle(group)}
                options={APPEARANCE_OPTIONS[group]}
                activeId={appearance[group]}
                onSelect={(value) => setAppearance((current) => ({ ...current, [group]: value }))}
              />
            ))}
            <button type="button" className="lov-danger-button" disabled>
              Начать заново · 9 жемчужин
            </button>
          </div>
        ) : null}

        {activeTab === 'achievements' ? (
          <div className="lov-achievement-screen">
            <header className="lov-panel-header">
              <h2>Достижения</h2>
            </header>
            <div className="lov-achievement-grid">
              {PROFILE_REWARDS.map((reward) => (
                <article key={reward.id} className="lov-journal-card">
                  <h3>{reward.label === 'Пусто' ? 'Свободный слот' : reward.label}</h3>
                  <p>
                    {reward.label === 'Пусто'
                      ? 'Новый знак появится здесь после следующего крупного события.'
                      : 'Памятный знак уже занял своё место в коллекции героя.'}
                  </p>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className={`shell-reset-sheet-right lov-sheet-right tab-${activeTab}`}>
        <PaperDollPanel
          state={state}
          character={character}
          activeTab={activeTab}
          equippedBySlot={equippedBySlot}
          selectedPetAssetId={selectedPet.assetId}
          raceLabel={raceLabel}
          onIntent={onIntent}
        />
      </section>
    </section>
  );
}

export function HeroInfoPanel({
  state,
}: {
  state: BootstrapState;
}) {
  const character = state.character;
  if (!character) {
    return null;
  }

  const race = state.races.find((entry) => entry.id === character.raceId);
  const raceLabel = race?.nameRu ?? character.raceId;
  const raceClassLabel = characterRaceClassLabel(raceLabel, character.classId);
  const equippedEntries = Object.values(getEquippedBySlot(state)).filter((entry): entry is EquippedEntry => Boolean(entry));
  const totals = buildCharacterTotals(state, equippedEntries);

  return (
    <div className="shell-reset-info-card lov-overlay-card" data-testid="character-info-popup">
      <h3>{character.name}</h3>
      <p>{raceClassLabel}</p>
      <div className="lov-profile-stats compact">
        <div className="lov-profile-stat"><span>❤</span><strong>{character.maxHealth}</strong></div>
        <div className="lov-profile-stat"><span>🛡</span><strong>{totals.armor}</strong></div>
        <div className="lov-profile-stat"><span>ATK</span><strong>{totals.stats[STAT_STRENGTH]}</strong></div>
        <div className="lov-profile-stat"><span>DEX</span><strong>{totals.stats[STAT_AGILITY]}</strong></div>
        <div className="lov-profile-stat"><span>INT</span><strong>{totals.stats[STAT_INTUITION]}</strong></div>
        <div className="lov-profile-stat"><span>LCK</span><strong>{totals.stats[STAT_LUCK]}</strong></div>
      </div>
    </div>
  );
}

export function HeroInfoWindow({
  state,
  onClose,
  onIntent,
}: {
  state: BootstrapState;
  onClose: () => void;
  onIntent: (intent: GameIntent) => void;
}) {
  const character = state.character;
  if (!character) {
    return null;
  }

  const race = state.races.find((entry) => entry.id === character.raceId);
  const raceLabel = race?.nameRu ?? character.raceId;
  const raceClassLabel = characterRaceClassLabel(raceLabel, character.classId);
  const characterAvatarSrc = characterAvatarPath(character);
  const characterImageSrc = characterImagePath(character);
  const equippedBySlot = getEquippedBySlot(state);
  const equippedEntries = Object.values(equippedBySlot).filter((entry): entry is EquippedEntry => Boolean(entry));
  const totals = buildCharacterTotals(state, equippedEntries);
  const profileSummaryStats = buildProfileSummaryStats(character, totals);

  return (
    <WorldWindowShell
      title={'\u0421\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u043e \u0433\u0435\u0440\u043e\u0435'}
      onClose={onClose}
      testId="character-info-popup"
      className="lov-hero-info-shell"
      size="hero"
      bodyScroll="none"
    >
      <div className="lov-hero-info-layout">
        <section className="lov-sheet-left lov-hero-info-main">
          <div className="lov-profile-screen lov-profile-screen-window">
            <div className="lov-profile-header">
              <div className="lov-profile-identity-art">
                <img src={characterAvatarSrc} alt="" data-testid="hero-info-character-image" />
                <img className="lov-profile-standing-preview" src={characterImageSrc} alt="" data-testid="hero-info-standing-image" />
              </div>
              <div>
                <strong>{character.name}</strong>
                <span>{raceClassLabel}</span>
              </div>
            </div>
            <div className="lov-profile-stats">
              {profileSummaryStats.map((entry) => (
                <div
                  key={entry.id}
                  className={`lov-profile-stat stat-${entry.id}`}
                  data-testid={`hero-info-stat-${entry.id}`}
                >
                  <span>{entry.label}</span>
                  <strong>{entry.value}</strong>
                </div>
              ))}
            </div>
            <div className="lov-quick-slots">
              {[assetPath('icon-onyx'), '', '', ''].map((src, index) => (
                <span key={`${src}-${index}`} className={`lov-quick-slot ${src ? 'filled' : ''}`}>
                  {src ? <img src={src} alt="" /> : null}
                </span>
              ))}
            </div>
            <div className="lov-motto-box">
              <span>{'\u041d\u0435\u0442 \u0434\u0435\u0432\u0438\u0437\u0430'}</span>
              <button
                type="button"
                aria-label={'\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0434\u0435\u0432\u0438\u0437'}
                disabled
              >
                ✎
              </button>
            </div>
            <div className="lov-reward-gallery">
              <strong>{'\u041d\u0430\u0433\u0440\u0430\u0434\u044b \u0438 \u043f\u043e\u0434\u0430\u0440\u043a\u0438'}</strong>
              <div className="lov-reward-gallery-grid">
                {PROFILE_REWARDS.map((reward) => (
                  <span key={reward.id} className={`lov-profile-reward ${reward.accent}`}>
                    {reward.accent === 'empty' ? '' : reward.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="lov-sheet-right lov-hero-info-side">
          <PaperDollPanel
            state={state}
            character={character}
            activeTab="profile"
            equippedBySlot={equippedBySlot}
            raceLabel={raceLabel}
            onIntent={onIntent}
          />
        </section>
      </div>
    </WorldWindowShell>
  );
}

export function EnemyInfoPanel({
  enemy,
}: {
  enemy: EnemyDefinition | undefined;
}) {
  if (!enemy) {
    return <div className="shell-reset-info-card lov-overlay-card">Противник пока не выбран.</div>;
  }

  const stats = enemyStatRows(enemy);

  return (
    <div className="shell-reset-info-card lov-overlay-card lov-enemy-compact-info" data-testid="enemy-info-popup">
      <h3>{enemyDisplayName(enemy)}</h3>
      <p>{enemy.boss ? 'Босс' : 'Противник'} · {enemy.level} уровень</p>
      <div className="lov-profile-stats compact">
        {stats.map((stat) => (
          <div key={stat.id} className={`lov-profile-stat stat-${stat.id}`} data-testid={`enemy-info-stat-${stat.id}`}>
            <span>{stat.shortLabel}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EnemyInfoWindow({
  enemy,
  onClose,
}: {
  enemy: EnemyDefinition | undefined;
  onClose: () => void;
}) {
  if (!enemy) {
    return null;
  }

  const stats = enemyStatRows(enemy);
  const displayedEnemyName = enemyDisplayName(enemy);
  const displayedEnemyImagePath = enemyImagePath(enemy);

  return (
    <WorldWindowShell
      title="Сведения о противнике"
      onClose={onClose}
      testId="enemy-info-popup"
      className="lov-hero-info-shell lov-enemy-info-shell"
      size="hero"
      bodyScroll="none"
    >
      <div className="lov-hero-info-layout lov-enemy-info-layout">
        <section className="lov-sheet-left lov-hero-info-main">
          <div className="lov-profile-screen lov-profile-screen-window">
            <div className="lov-profile-header">
              <img src={displayedEnemyImagePath} alt="" />
              <div>
                <strong>{displayedEnemyName}</strong>
                <span>{enemy.boss ? 'Босс' : 'Противник'} · {enemy.level} уровень</span>
              </div>
            </div>
            <div className="lov-profile-stats">
              {stats.map((stat) => (
                <div key={stat.id} className={`lov-profile-stat stat-${stat.id}`} data-testid={`enemy-info-stat-${stat.id}`}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lov-sheet-right lov-hero-info-side">
          <div className="lov-enemy-info-portrait">
            <img src={displayedEnemyImagePath} alt="" />
          </div>
        </section>
      </div>
    </WorldWindowShell>
  );
}
export function ItemInfoPanel({
  stack,
  item,
}: {
  stack: InventoryStack | undefined;
  item: ItemDefinition | undefined;
  onIntent: (intent: GameIntent) => void;
}) {
  if (!stack || !item) {
    return <div className="shell-reset-info-card lov-overlay-card">Предмет не найден.</div>;
  }

  const statTags = getItemStatTags(item, stack.enhancementLevel ?? 0);

  return (
    <div className="shell-reset-info-card lov-overlay-card" data-testid="item-info-popup">
      <h3>{item.nameRu}</h3>
      <p>{item.descriptionRu}</p>
      <div className="lov-item-stat-tags">
        {statTags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <small>{formatPrice(item)}</small>
      <small>Улучшение: +{stack.enhancementLevel ?? 0}</small>
    </div>
  );
}

export function PetInfoPanel() {
  return (
    <div className="shell-reset-info-card lov-overlay-card" data-testid="pet-info-popup">
      <h3>Питомец</h3>
      <p>Спутник усиливает героя, растёт рядом с ним и получает собственную полосу прогресса.</p>
      <div className="lov-profile-stats compact">
        <div className="lov-profile-stat"><span>HP</span><strong>2100</strong></div>
        <div className="lov-profile-stat"><span>Урон</span><strong>40-41</strong></div>
        <div className="lov-profile-stat"><span>Еда</span><strong>16</strong></div>
      </div>
    </div>
  );
}

function PaperDollPanel({
  state,
  character,
  activeTab,
  equippedBySlot,
  selectedPetAssetId,
  raceLabel,
  onIntent,
}: {
  state: BootstrapState;
  character: NonNullable<BootstrapState['character']>;
  activeTab: SheetTab;
  equippedBySlot: Partial<Record<EquipmentSlot, EquippedEntry>>;
  selectedPetAssetId?: string | undefined;
  raceLabel?: string | undefined;
  onIntent: (intent: GameIntent) => void;
}) {
  const heroSrc = characterImagePath(character);
  const raceSignSrc = characterRaceSignPath(character.raceId);
  const displayedRaceLabel = raceLabel ?? character.raceId;
  const paperDollPetAssetId = selectedPetAssetId ?? 'pet-wyvern';

  return (
    <div className={`lov-paperdoll ${activeTab === 'profile' ? 'profile' : ''}`}>
      <div className="lov-paperdoll-header">
        <strong>{character.name}</strong>
        <span>{character.level} уровень</span>
      </div>

      <div className="lov-paperdoll-stage">
        <div className="lov-paperdoll-column left">
          {LEFT_SLOTS.map((slot) => (
            <EquipmentSlotButton
              key={slot}
              slot={slot}
              entry={equippedBySlot[slot]}
              onIntent={onIntent}
            />
          ))}
          <span className="shell-reset-slot lov-paperdoll-slot empty reserve" aria-hidden="true" />
        </div>

        <div className="lov-paperdoll-center">
          <img className="lov-paperdoll-hero" src={heroSrc} alt="" data-testid="paperdoll-character-image" />
          {equippedBySlot.pet || selectedPetAssetId ? <img className="lov-paperdoll-pet" src={assetPath(paperDollPetAssetId)} alt="" /> : null}
          <img
            className="lov-paperdoll-race-sign"
            src={raceSignSrc}
            alt={displayedRaceLabel}
            title={displayedRaceLabel}
            data-testid="paperdoll-race-sign"
          />
        </div>

        <div className="lov-paperdoll-column right">
          {RIGHT_SLOTS.map((slot) => (
            <EquipmentSlotButton
              key={slot}
              slot={slot}
              entry={equippedBySlot[slot]}
              onIntent={onIntent}
            />
          ))}
          <span className="shell-reset-slot lov-paperdoll-slot empty reserve" aria-hidden="true" />
        </div>
      </div>

      {activeTab === 'profile' ? (
        <div className="lov-prestige-bar">Уровень величия: 12</div>
      ) : (
        <div className="lov-paperdoll-quickbar">
          {['', '', '', assetPath('icon-onyx'), '', '', ''].map((src, index) => (
            <span key={`${src}-${index}`} className={`lov-quick-slot ${src ? 'filled' : ''}`}>
              {src ? <img src={src} alt="" /> : null}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function AppearanceSelector({
  title,
  options,
  activeId,
  onSelect,
}: {
  title: string;
  options: AppearanceOption[];
  activeId: string;
  onSelect: (value: string) => void;
}) {
  const activeIndex = Math.max(0, options.findIndex((option) => option.id === activeId));
  const prev = options[(activeIndex - 1 + options.length) % options.length]!;
  const current = options[activeIndex]!;
  const next = options[(activeIndex + 1) % options.length]!;

  return (
    <section className="lov-appearance-group">
      <h3>{title}</h3>
      <div className="lov-appearance-carousel">
        <button type="button" aria-label={`Предыдущий вариант ${title}`} onClick={() => onSelect(prev.id)}>
          ‹
        </button>
        {[prev, current, next].map((option, index) => (
          <span
            key={option.id}
            className={`lov-appearance-card ${index === 1 ? 'active' : ''}`}
            style={option.swatch ? ({ '--swatch': option.swatch } as CSSProperties) : undefined}
          >
            {option.imageAssetId ? <img src={assetPath(option.imageAssetId)} alt="" /> : null}
            {option.swatch ? <i /> : null}
          </span>
        ))}
        <button type="button" aria-label={`Следующий вариант ${title}`} onClick={() => onSelect(next.id)}>
          ›
        </button>
      </div>
    </section>
  );
}

function StatBreakdownCard({
  breakdown,
  position,
}: {
  breakdown: StatBreakdown;
  position: { x: number; y: number };
}) {
  const details = breakdown.details ?? [
    { label: 'Базовое значение', value: `${breakdown.base ?? 0}` },
    { label: 'Вручную добавлено', value: `+${breakdown.manual ?? 0}` },
    { label: 'Надетое снаряжение', value: `+${breakdown.equipment ?? 0}` },
    { label: 'Эффект от зелья', value: '+0' },
    { label: 'Эффект от достижений', value: '+0' },
    { label: 'Бонус клана', value: '+0' },
    { label: 'Итог', value: `${breakdown.total}`, tone: 'total' as const },
  ];
  const visibleDetails = details.filter((line) => line.tone === 'total' || !isZeroBreakdownValue(line.value));

  return (
    <div
      className="lov-stat-breakdown"
      data-testid={`stat-breakdown-${breakdown.key}`}
      style={{ '--stat-tooltip-x': `${position.x}px`, '--stat-tooltip-y': `${position.y}px` } as CSSProperties}
    >
      <h3>{breakdown.title}</h3>
      {visibleDetails.map((line) => (
        <div key={line.label} className={`lov-breakdown-line ${line.tone === 'total' ? 'total' : ''}`}>
          <span>{line.label}</span>
          <strong>{line.value}</strong>
        </div>
      ))}
    </div>
  );
}

function isZeroBreakdownValue(value: string) {
  return value.trim() === '0' || value.trim() === '+0';
}

function statAllocationCostLabel(goldCost: number) {
  return `${goldCost} золота`;
}

export function InventoryGrid({
  state,
  stacks,
  selectedStackId,
  onSelect,
  onDropStack,
  onDropStoreItem,
  dataTestId,
  draggable = false,
  fillSlots = BACKPACK_SLOT_COUNT,
}: {
  state: BootstrapState;
  stacks: Array<InventoryStack | null>;
  selectedStackId: string | null;
  onSelect: (inventoryStackId: string) => void;
  onDropStack?: (inventoryStackId: string, slotIndex: number) => void;
  onDropStoreItem?: (itemId: string, slotIndex: number) => void;
  dataTestId?: string;
  draggable?: boolean;
  fillSlots?: number;
}) {
  const cells: Array<InventoryStack | null> = stacks.slice(0, fillSlots);
  while (cells.length < fillSlots) {
    cells.push(null);
  }
  const acceptsDrops = Boolean(onDropStack || onDropStoreItem);
  const handleDrop = (event: DragEvent<HTMLElement>, slotIndex: number) => {
    if (!acceptsDrops) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const inventoryStackId = readDraggedStackId(event);
    if (inventoryStackId && onDropStack) {
      onDropStack(inventoryStackId, slotIndex);
      return;
    }
    const storeItemId = readDraggedStoreItemId(event);
    if (storeItemId && onDropStoreItem) {
      onDropStoreItem(storeItemId, slotIndex);
    }
  };

  return (
    <div
      className="shell-reset-grid lov-inventory-grid"
      data-testid={dataTestId}
      onDragOver={(event) => acceptsDrops && event.preventDefault()}
      onDrop={(event) => handleDrop(event, 0)}
    >
      {cells.map((stack, index) => {
        if (!stack) {
          return (
            <span
              key={`empty-${index}`}
              className="lov-grid-empty"
              onDragOver={(event) => acceptsDrops && event.preventDefault()}
              onDrop={(event) => handleDrop(event, index)}
            />
          );
        }
        const item = state.items.find((entry) => entry.id === stack.itemId);
        return (
          <button
            key={stack.id}
            type="button"
            draggable={draggable}
            className={`shell-reset-grid-item lov-grid-item ${selectedStackId === stack.id ? 'active' : ''}`}
            onClick={() => onSelect(stack.id)}
            onPointerMove={setItemHoverPosition}
            onFocus={setItemHoverPositionFromFocus}
            onDragStart={(event) => {
              if (!draggable) {
                return;
              }
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData(DRAG_STACK_TYPE, stack.id);
            }}
            onDragOver={(event) => acceptsDrops && event.preventDefault()}
            onDrop={(event) => handleDrop(event, index)}
          >
            <ItemChip item={item} compact />
            {stack.quantity > 1 ? <small className="lov-item-quantity">x{stack.quantity}</small> : null}
            {item ? <ItemHoverCard stack={stack} item={item} /> : null}
          </button>
        );
      })}
    </div>
  );
}

function EquipmentSlotButton({
  slot,
  entry,
  onIntent,
}: {
  slot: EquipmentSlot;
  entry: EquippedEntry | undefined;
  onIntent: (intent: GameIntent) => void;
}) {
  return (
    <button
      type="button"
      draggable={Boolean(entry)}
      className={`shell-reset-slot lov-paperdoll-slot ${entry ? 'filled' : 'empty'}`}
      data-slot={slot}
      aria-label={entry ? `${entry.item.nameRu}` : SLOT_LABELS[slot]}
      onPointerMove={setItemHoverPosition}
      onFocus={setItemHoverPositionFromFocus}
      onDragStart={(event) => {
        if (!entry) {
          return;
        }
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(DRAG_STACK_TYPE, entry.stack.id);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const inventoryStackId = readDraggedStackId(event);
        if (inventoryStackId) {
          onIntent({ type: 'equipItem', inventoryStackId });
        }
      }}
    >
      {entry ? (
        <>
          <ItemChip item={entry.item} compact />
          <ItemHoverCard stack={entry.stack} item={entry.item} />
        </>
      ) : (
        <span className="lov-slot-silhouette" aria-hidden="true">
          {SLOT_HINTS[slot]}
        </span>
      )}
    </button>
  );
}

function ItemHoverCard({
  stack,
  item,
}: {
  stack: InventoryStack;
  item: ItemDefinition;
}) {
  const statTags = getItemStatTags(item, stack.enhancementLevel ?? 0);

  return (
    <span className="lov-item-hover-card" role="tooltip">
      <strong>{item.nameRu}</strong>
      <span>{item.descriptionRu}</span>
      <span className="lov-item-hover-tags">
        {statTags.map((tag) => (
          <i key={tag}>{tag}</i>
        ))}
      </span>
      <small>{formatPrice(item)}</small>
      <small>{`Улучшение: +${stack.enhancementLevel ?? 0}`}</small>
    </span>
  );
}
