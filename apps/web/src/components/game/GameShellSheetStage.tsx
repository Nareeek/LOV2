import type { ReactNode } from 'react';
import type { BootstrapState } from '@lov2/shared';
import type { GameIntent, InfoWindowId, SheetTab } from '../../game/types.js';
import { CharacterSheet } from './GamePanels.js';
import { infoWindowTitle } from './GameWindowRouter.js';
import { GameShellModalLayer } from './GameShellModalLayer.js';
import { OverlayLayer } from './OverlayLayer.js';

export function GameShellSheetStage({
  state,
  sheetTab,
  selectedItemStackId,
  selectedPetId,
  onSelectPet,
  onIntent,
  worldWindowContent,
  enemyInfoContent,
  infoWindow,
  infoWindowContent,
  onCloseInfo,
}: {
  state: BootstrapState;
  sheetTab: SheetTab;
  selectedItemStackId: string | null;
  selectedPetId: string;
  onSelectPet: (petId: string) => void;
  onIntent: (intent: GameIntent) => void;
  worldWindowContent: ReactNode;
  enemyInfoContent: ReactNode;
  infoWindow: InfoWindowId;
  infoWindowContent: ReactNode;
  onCloseInfo: () => void;
}) {
  return (
    <section className="stage-playfield single-column">
      <section className="stage-main sheet-main">
        <CharacterSheet
          state={state}
          activeTab={sheetTab}
          selectedItemStackId={selectedItemStackId}
          selectedPetId={selectedPetId}
          onSelectPet={onSelectPet}
          onIntent={onIntent}
        />

        {worldWindowContent ? (
          <GameShellModalLayer testId="world-window-layer">
            {worldWindowContent}
          </GameShellModalLayer>
        ) : null}

        {enemyInfoContent ? (
          <GameShellModalLayer testId="enemy-info-layer">
            {enemyInfoContent}
          </GameShellModalLayer>
        ) : null}

        {infoWindow !== 'heroInfo' && !enemyInfoContent && infoWindowContent ? (
          <OverlayLayer title={infoWindowTitle(infoWindow)} placement="info" onClose={onCloseInfo}>
            {infoWindowContent}
          </OverlayLayer>
        ) : null}
      </section>
    </section>
  );
}