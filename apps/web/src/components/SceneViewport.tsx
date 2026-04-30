import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import type { SceneAction, SceneDefinition, SceneHotspot } from '@lov2/shared';
import { assetPath } from './game/assets.js';

interface SceneViewportProps {
  scene: SceneDefinition;
  hotspotBadges?: Record<string, string> | undefined;
  hotspotToneById?: Record<string, HotspotTone> | undefined;
  disabledHotspotIds?: string[] | undefined;
  onHotspotClick: (action: SceneAction, hotspot: SceneHotspot) => void;
}

type HotspotTone = 'neutral' | 'available' | 'traveling' | 'ready' | 'locked' | 'active';

const WIDTH = 908;
const HEIGHT = 498;
const HOTSPOT_ASSET_BY_ID: Record<string, string> = {
  'hub-tavern': 'ui-hotspot-hub-tavern',
  'hub-arena': 'ui-hotspot-hub-arena',
  'hub-store': 'ui-hotspot-hub-store',
  'hub-sign': 'ui-hotspot-hub-sign',
  'hub-fountain': 'ui-hotspot-hub-fountain',
  'map-town': 'ui-hotspot-map-town',
  'map-forge': 'ui-hotspot-map-forge',
  'map-tower': 'ui-hotspot-map-tower',
  'map-boatman': 'ui-hotspot-map-boatman',
};

export function SceneViewport({
  scene,
  hotspotBadges,
  hotspotToneById,
  disabledHotspotIds,
  onHotspotClick,
}: SceneViewportProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const clickRef = useRef(onHotspotClick);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const disabledIds = useMemo(() => new Set(disabledHotspotIds ?? []), [disabledHotspotIds]);
  const appCounterRef = useRef(0);

  clickRef.current = onHotspotClick;

  useEffect(() => {
    let cancelled = false;
    let initialized = false;
    let destroyed = false;
    let app: Application | undefined;

    function destroyApp() {
      if (!app || !initialized || destroyed) {
        return;
      }
      destroyed = true;
      app.destroy(true);
    }

    async function run() {
      if (!hostRef.current) {
        return;
      }

      setSceneError(null);
      app = new Application();

      try {
        await app.init({
          width: WIDTH,
          height: HEIGHT,
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio, 2),
        });
        initialized = true;

        if (cancelled || !hostRef.current) {
          destroyApp();
          return;
        }

        const appInstanceId = `scene-${scene.id}-${++appCounterRef.current}`;
        app.canvas.dataset.appInstanceId = appInstanceId;
        hostRef.current.dataset.appInstanceId = appInstanceId;
        hostRef.current.replaceChildren(app.canvas);

        const stage = new Container();
        app.stage.addChild(stage);

        const frameLayer = new Graphics();
        const ambientLayer = new Graphics();
        stage.addChild(frameLayer);
        stage.addChild(ambientLayer);

        drawSceneFrame(frameLayer);

        let tick = 0;
        app.ticker.add(() => {
          if (destroyed) {
            return;
          }
          tick += 0.018;
          ambientLayer.clear();
          drawAmbient(ambientLayer, scene.id, tick);
        });
      } catch (error) {
        console.error(error);
        destroyApp();
        if (!cancelled) {
          setSceneError(error instanceof Error ? error.message : 'Не удалось загрузить сцену.');
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
      destroyApp();
    };
  }, [scene.id, scene.sceneAssetId]);

  return (
    <div className="scene-canvas shell-reset-scene" data-testid="scene-canvas">
      <img className="scene-backdrop" src={assetPath(scene.sceneAssetId)} alt="" />
      <div ref={hostRef} className="scene-pixi-host" data-testid="scene-pixi-host" />

      <div className="scene-hotspot-layer" aria-label={`${scene.nameRu}: интерактивные места`}>
        {scene.hotspots.map((hotspot) => {
          const disabled = disabledIds.has(hotspot.id);
          const tone = hotspotToneById?.[hotspot.id] ?? 'neutral';
          const kind = hotspot.visual?.kind ?? 'portal';
          const accent = hotspot.visual?.accent ?? 'gold';
          const labelSide = hotspot.visual?.labelSide ?? 'top';
          const overlayAssetId = HOTSPOT_ASSET_BY_ID[hotspot.id];
          const style = {
            left: `${hotspot.rect.x * 100}%`,
            top: `${hotspot.rect.y * 100}%`,
            width: `${hotspot.rect.width * 100}%`,
            height: `${hotspot.rect.height * 100}%`,
          } as CSSProperties;

          return (
            <span
              key={hotspot.id}
              className={`scene-hotspot-wrap ${overlayAssetId ? 'has-hotspot-art' : ''}`}
              data-hotspot-id={hotspot.id}
              style={style}
            >
              {overlayAssetId ? (
                <img className="hotspot-art" src={assetPath(overlayAssetId)} alt="" aria-hidden="true" />
              ) : null}
              <button
                type="button"
                className={`scene-hotspot ${tone} kind-${kind} accent-${accent}`}
                disabled={disabled}
                aria-label={hotspot.labelRu}
                data-testid={`hotspot-${hotspot.id}`}
                onClick={() => clickRef.current(hotspot.action, hotspot)}
              >
                <span className="hotspot-marker" aria-hidden="true">
                  <span className="hotspot-core" />
                </span>
                <span className={`hotspot-label side-${labelSide}`}>
                  <strong>{hotspot.labelRu}</strong>
                  <small>{hotspot.descriptionRu}</small>
                </span>
                {hotspotBadges?.[hotspot.id] ? <strong className="hotspot-badge">{hotspotBadges[hotspot.id]}</strong> : null}
              </button>
            </span>
          );
        })}
      </div>

      {sceneError ? (
        <div className="scene-fallback" data-testid="scene-fallback">
          <strong>Сцена временно недоступна</strong>
          <span>{sceneError}</span>
        </div>
      ) : null}
    </div>
  );
}

function drawSceneFrame(layer: Graphics) {
  layer.clear();
}

function drawAmbient(layer: Graphics, sceneId: SceneDefinition['id'], tick: number) {
  const pulse = Math.sin(tick) * 0.5 + 0.5;

  if (sceneId === 'hub') {
    layer
      .circle(440, 350, 28 + pulse * 2)
      .fill({ color: '#ffcc77', alpha: 0.05 })
      .circle(760, 160, 20 + pulse * 2)
      .fill({ color: '#ffd28a', alpha: 0.04 });
  }

  if (sceneId === 'map') {
    layer
      .circle(120, 110, 14 + pulse * 1.5)
      .fill({ color: '#8fe8c2', alpha: 0.08 })
      .ellipse(520, 392, 110, 9 + pulse * 1.5)
      .fill({ color: '#82d9ff', alpha: 0.05 });
  }

  if (sceneId === 'combat') {
    layer
      .circle(146, 204, 26 + pulse * 2)
      .fill({ color: '#e07c58', alpha: 0.06 })
      .circle(762, 204, 26 + pulse * 2)
      .fill({ color: '#e07c58', alpha: 0.06 });
  }
}
