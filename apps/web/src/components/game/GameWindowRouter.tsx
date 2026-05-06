import type { BootstrapState, ScenePanelId } from '@lov2/shared';
import type { GameIntent, InfoWindowId, MetaTab, RouteState, WorldWindowId } from '../../game/types.js';
import {
  ArenaPreviewWindow,
  BoatmanWindow,
  EnemyInfoPanel,
  ExerciseDetailWindow,
  ForgeWindow,
  FountainWindow,
  JournalWindow,
  PaymentWindow,
  PetInfoPanel,
  SettingsWindow,
  StoreWindow,
  TavernWindow,
  TowerWindow,
  WorldLeaderboardWindow,
} from './GamePanels.js';

export function renderWorldWindow({
  worldWindow,
  state,
  selectedQuest,
  routeStates,
  selectedStoreItem,
  selectedItemStackId,
  selectedForgeStack,
  selectedArenaEnemy,
  selectedExerciseId,
  metaTab,
  busy,
  onClose,
  onIntent,
}: {
  worldWindow: WorldWindowId;
  state: BootstrapState;
  selectedQuest: BootstrapState['quests'][number] | undefined;
  routeStates: Record<string, RouteState>;
  selectedStoreItem: BootstrapState['items'][number] | undefined;
  selectedItemStackId: string | null;
  selectedForgeStack: BootstrapState['inventory'][number] | undefined;
  selectedArenaEnemy: BootstrapState['enemies'][number] | undefined;
  selectedExerciseId: string | null;
  metaTab: MetaTab;
  busy: boolean;
  onClose: () => void;
  onIntent: (intent: GameIntent) => void;
}) {
  switch (worldWindow) {
    case 'tavern':
      return (
        <TavernWindow
          state={state}
          selectedQuest={selectedQuest}
          routeStates={routeStates}
          busy={busy}
          onClose={onClose}
          onIntent={onIntent}
        />
      );
    case 'arenaPreview':
      return <ArenaPreviewWindow enemy={selectedArenaEnemy} onClose={onClose} onIntent={onIntent} />;
    case 'store':
      return (
        <StoreWindow
          state={state}
          selectedStoreItem={selectedStoreItem}
          selectedItemStackId={selectedItemStackId}
          onClose={onClose}
          onIntent={onIntent}
        />
      );
    case 'payments':
      return <PaymentWindow onClose={onClose} />;
    case 'forge':
      return <ForgeWindow state={state} selectedForgeStack={selectedForgeStack} onClose={onClose} onIntent={onIntent} />;
    case 'tower':
      return <TowerWindow state={state} onClose={onClose} />;
    case 'boatman':
      return <BoatmanWindow onClose={onClose} />;
    case 'fountain':
      return <FountainWindow onClose={onClose} />;
    case 'exerciseDetail':
      return <ExerciseDetailWindow exerciseId={selectedExerciseId} onClose={onClose} />;
    case 'leaderboard':
      return <WorldLeaderboardWindow state={state} onClose={onClose} />;
    case 'journal':
      return <JournalWindow activeTab={metaTab} onClose={onClose} />;
    case 'settings':
      return <SettingsWindow onClose={onClose} />;
    default:
      return null;
  }
}

export function renderInfoWindow({
  infoWindow,
  combatEnemy,
}: {
  infoWindow: InfoWindowId;
  state: BootstrapState;
  combatEnemy: BootstrapState['enemies'][number] | undefined;
  selectedItem: BootstrapState['items'][number] | undefined;
  selectedItemStack: BootstrapState['inventory'][number] | undefined;
  onIntent: (intent: GameIntent) => void;
}) {
  switch (infoWindow) {
    case 'heroInfo':
      return null;
    case 'enemyInfo':
      return <EnemyInfoPanel enemy={combatEnemy} />;
    case 'itemInfo':
      return null;
    case 'petInfo':
      return <PetInfoPanel />;
    default:
      return null;
  }
}

export function windowForPanel(panelId: ScenePanelId): Exclude<WorldWindowId, 'none'> | null {
  switch (panelId) {
    case 'contracts':
      return 'tavern';
    case 'arena':
      return 'arenaPreview';
    case 'store':
      return 'store';
    case 'forge':
      return 'forge';
    case 'tower':
      return 'tower';
    case 'boatman':
      return 'boatman';
    case 'fountain':
      return 'fountain';
    case 'journal':
      return 'journal';
    default:
      return null;
  }
}

export function infoWindowTitle(infoWindow: InfoWindowId) {
  switch (infoWindow) {
    case 'heroInfo':
      return 'Сведения о герое';
    case 'enemyInfo':
      return 'Сведения о противнике';
    case 'itemInfo':
      return 'Сведения о предмете';
    case 'petInfo':
      return 'Сведения о питомце';
    default:
      return 'Сведения';
  }
}
