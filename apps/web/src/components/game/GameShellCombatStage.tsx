import type { ReactNode } from 'react';
import type { BootstrapState, CombatLog } from '@lov2/shared';
import type { GameIntent, InfoWindowId } from '../../game/types.js';
import { CombatResultWindow, CombatStage } from './GamePanels.js';
import { infoWindowTitle } from './GameWindowRouter.js';
import { GameShellModalLayer } from './GameShellModalLayer.js';
import { OverlayLayer } from './OverlayLayer.js';

type CombatReplayFrame = {
  characterCurrent: number;
  characterStart: number;
  enemyCurrent: number;
  enemyStart: number;
  petCurrent: number;
  petStart: number;
  lastActor: 'character' | 'enemy' | 'pet' | null;
};

export function GameShellCombatStage({
  state,
  combatEnemy,
  replayFrame,
  petAssistArmed,
  petAssistAvailable,
  selectedPetId,
  battlePetId,
  combatLocked,
  rewardBattlePetId,
  visibleReplayTurns,
  onIntent,
  worldWindowContent,
  rewardVisible,
  latestResolvedCombat,
  onCloseReward,
  heroInfoContent,
  enemyInfoContent,
  infoWindow,
  infoWindowContent,
  onCloseInfo,
}: {
  state: BootstrapState;
  combatEnemy: BootstrapState['enemies'][number] | undefined;
  replayFrame: CombatReplayFrame;
  petAssistArmed: boolean;
  petAssistAvailable: boolean;
  selectedPetId: string;
  battlePetId: string;
  combatLocked: boolean;
  rewardBattlePetId: string | null | undefined;
  visibleReplayTurns: CombatLog['turns'];
  onIntent: (intent: GameIntent) => void;
  worldWindowContent: ReactNode;
  rewardVisible: boolean;
  latestResolvedCombat: BootstrapState['combats'][number] | undefined;
  onCloseReward: () => void;
  heroInfoContent: ReactNode;
  enemyInfoContent: ReactNode;
  infoWindow: InfoWindowId;
  infoWindowContent: ReactNode;
  onCloseInfo: () => void;
}) {
  return (
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
          petAssistAvailable={petAssistAvailable}
          selectedPetId={selectedPetId}
          battlePetId={battlePetId}
          combatLocked={combatLocked}
          replayTurns={visibleReplayTurns}
          onIntent={onIntent}
        />

        {worldWindowContent ? (
          <GameShellModalLayer testId="world-window-layer">
            {worldWindowContent}
          </GameShellModalLayer>
        ) : null}

        {rewardVisible ? (
          <GameShellModalLayer reward>
            <CombatResultWindow
              latestResolvedCombat={latestResolvedCombat}
              {...(rewardBattlePetId ? { battlePetId: rewardBattlePetId } : {})}
              onContinue={onCloseReward}
            />
          </GameShellModalLayer>
        ) : null}

        {heroInfoContent ? (
          <GameShellModalLayer testId="hero-info-layer">
            {heroInfoContent}
          </GameShellModalLayer>
        ) : null}

        {enemyInfoContent ? (
          <GameShellModalLayer testId="enemy-info-layer">
            {enemyInfoContent}
          </GameShellModalLayer>
        ) : null}

        {!heroInfoContent && !enemyInfoContent && infoWindowContent ? (
          <OverlayLayer title={infoWindowTitle(infoWindow)} placement="info" onClose={onCloseInfo}>
            {infoWindowContent}
          </OverlayLayer>
        ) : null}
      </section>
    </section>
  );
}
