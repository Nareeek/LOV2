import type { ReactNode } from 'react';
import type {
  BootstrapState,
  SceneAction,
  SceneDefinition,
  SceneHotspot,
  TravelTask,
} from '@lov2/shared';
import type { GameIntent, InfoWindowId } from '../../game/types.js';
import { SceneViewport } from '../SceneViewport.js';
import { ActionDock } from './ActionDock.js';
import { GameShellModalLayer } from './GameShellModalLayer.js';
import { infoWindowTitle } from './GameWindowRouter.js';
import { OverlayLayer } from './OverlayLayer.js';
import { TaskRail } from './TaskRail.js';
import { TravelStage } from './GamePanels.js';

type HotspotTone = 'neutral' | 'available' | 'traveling' | 'ready' | 'locked' | 'active';

export function GameShellWorldStage({
  baseStage,
  selectedExerciseId,
  onIntent,
  activeScene,
  hotspotBadges,
  hotspotToneById,
  onHotspotClick,
  state,
  activeTravel,
  activeTravelReady,
  clock,
  worldWindowContent,
  heroInfoContent,
  enemyInfoContent,
  infoWindow,
  infoWindowContent,
  showActionDock,
  onCloseInfo,
}: {
  baseStage: 'world' | 'travel';
  selectedExerciseId: string | null;
  onIntent: (intent: GameIntent) => void;
  activeScene: SceneDefinition;
  hotspotBadges: Record<string, string>;
  hotspotToneById: Record<string, HotspotTone>;
  onHotspotClick: (action: SceneAction, hotspot: SceneHotspot) => void | Promise<void>;
  state: BootstrapState;
  activeTravel: TravelTask | undefined;
  activeTravelReady: boolean;
  clock: number;
  worldWindowContent: ReactNode;
  heroInfoContent: ReactNode;
  enemyInfoContent: ReactNode;
  infoWindow: InfoWindowId;
  infoWindowContent: ReactNode;
  showActionDock: boolean;
  onCloseInfo: () => void;
}) {
  return (
    <section className={`stage-playfield ${baseStage === 'travel' ? 'travel-layout' : ''}`}>
      {baseStage === 'world' ? (
        <aside className="stage-left-stack">
          <TaskRail activeExerciseId={selectedExerciseId} onIntent={onIntent} />
        </aside>
      ) : null}

      <section className="stage-main">
        {baseStage === 'world' ? (
          <SceneViewport
            scene={activeScene}
            hotspotBadges={hotspotBadges}
            hotspotToneById={hotspotToneById}
            onHotspotClick={onHotspotClick}
          />
        ) : (
          <TravelStage
            state={state}
            activeTravel={activeTravel}
            activeTravelReady={activeTravelReady}
            clock={clock}
            onIntent={onIntent}
          />
        )}

        {worldWindowContent ? (
          <GameShellModalLayer testId="world-window-layer">
            {worldWindowContent}
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

      {showActionDock ? (
        <aside className="stage-right-rail">
          <ActionDock onIntent={onIntent} />
        </aside>
      ) : null}
    </section>
  );
}