import { useEffect, useMemo, useRef, useState } from 'react';
import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text } from 'pixi.js';
import type { CombatLog, SceneAction, SceneDefinition, SceneHotspot, SceneId } from '@lov2/shared';
import { assetPath } from './game/assets.js';

interface SceneViewportProps {
  scene: SceneDefinition;
  enemyName?: string | undefined;
  equippedPetName?: string | undefined;
  combatLog?: CombatLog | undefined;
  replayTurnsVisible?: number | undefined;
  hotspotBadges?: Record<string, string> | undefined;
  hotspotToneById?: Record<string, HotspotTone> | undefined;
  disabledHotspotIds?: string[] | undefined;
  onHotspotClick: (action: SceneAction, hotspot: SceneHotspot) => void;
}

type HotspotTone = 'neutral' | 'available' | 'traveling' | 'ready' | 'locked' | 'active';

const WIDTH = 1040;
const HEIGHT = 610;

export function SceneViewport({
  scene,
  enemyName,
  equippedPetName,
  combatLog,
  replayTurnsVisible,
  hotspotBadges,
  hotspotToneById,
  disabledHotspotIds,
  onHotspotClick,
}: SceneViewportProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const disabledIds = useMemo(() => new Set(disabledHotspotIds ?? []), [disabledHotspotIds]);

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
          background: '#111417',
          antialias: true,
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio, 2),
        });
        initialized = true;

        if (cancelled || !hostRef.current) {
          destroyApp();
          return;
        }

        hostRef.current.replaceChildren(app.canvas);

        const stage = new Container();
        app.stage.addChild(stage);

        const backgroundTexture = await Assets.load(assetPath(scene.sceneAssetId));
        if (cancelled || destroyed) {
          return;
        }
        const background = new Sprite(backgroundTexture);
        background.width = WIDTH;
        background.height = HEIGHT;
        stage.addChild(background);

        const frameLayer = new Graphics();
        drawSceneFrame(frameLayer, scene.id);
        stage.addChild(frameLayer);

        const ambientLayer = new Graphics();
        stage.addChild(ambientLayer);

        const hotspotLayer = new Container();
        stage.addChild(hotspotLayer);
        for (const hotspot of scene.hotspots) {
          const disabled = disabledIds.has(hotspot.id);
          const tone = hotspotToneById?.[hotspot.id] ?? 'neutral';
          const graphic = new Graphics();
          drawHotspot(graphic, hotspot, tone, disabled, false);
          const rect = toCanvasRect(hotspot);
          graphic.hitArea = new Rectangle(rect.x, rect.y, rect.width, rect.height);
          graphic.eventMode = disabled ? 'none' : 'static';
          graphic.cursor = disabled ? 'default' : 'pointer';
          if (!disabled) {
            graphic.on('pointerover', () => drawHotspot(graphic, hotspot, tone, false, true));
            graphic.on('pointerout', () => drawHotspot(graphic, hotspot, tone, false, false));
            graphic.on('pointertap', () => onHotspotClick(hotspot.action, hotspot));
          }
          hotspotLayer.addChild(graphic);
        }

        const heroTexture = await Assets.load(assetPath('hero-nocturne'));
        if (cancelled || destroyed) {
          return;
        }
        const hero = new Sprite(heroTexture);
        const heroPose = getHeroPose(scene.id);
        hero.anchor.set(0.5, 1);
        hero.position.set(heroPose.x, heroPose.y);
        hero.scale.set(heroPose.scale);
        stage.addChild(hero);

        let enemy: Sprite | null = null;
        if (scene.id === 'combat') {
          const enemyTexture = await Assets.load(assetPath('enemy-ash-baron'));
          if (cancelled || destroyed) {
            return;
          }
          enemy = new Sprite(enemyTexture);
          enemy.anchor.set(0.5, 1);
          enemy.position.set(748, 500);
          enemy.scale.set(0.9);
          stage.addChild(enemy);
        }

        if (['combat', 'inventory', 'character', 'pets'].includes(scene.id)) {
          const petTexture = await Assets.load(assetPath('pet-wyvern'));
          if (cancelled || destroyed) {
            return;
          }
          const pet = new Sprite(petTexture);
          pet.anchor.set(0.5, 1);
          pet.position.set(scene.id === 'pets' ? 520 : heroPose.x + 110, heroPose.y - 4);
          pet.scale.set(scene.id === 'pets' ? 1.05 : 0.58);
          stage.addChild(pet);
        }

        if (enemyName && scene.id === 'combat') {
          const enemyLabel = new Text({
            text: enemyName,
            style: {
              fontFamily: 'Georgia, serif',
              fontSize: 20,
              fill: '#ffe7a6',
              stroke: { color: '#181212', width: 4 },
            },
          });
          enemyLabel.position.set(760, 84);
          stage.addChild(enemyLabel);
        }

        if (equippedPetName && ['character', 'pets'].includes(scene.id)) {
          const petLabel = new Text({
            text: equippedPetName,
            style: {
              fontFamily: 'Arial, sans-serif',
              fontSize: 16,
              fill: '#d7f8ef',
              stroke: { color: '#111315', width: 3 },
            },
          });
          petLabel.position.set(scene.id === 'pets' ? 492 : heroPose.x + 84, heroPose.y - 246);
          stage.addChild(petLabel);
        }

        const visibleTurns = combatLog?.turns.slice(0, replayTurnsVisible ?? combatLog.turns.length);
        drawDamageNumbers(stage, scene.id, visibleTurns);

        let tick = 0;
        app.ticker.add(() => {
          if (destroyed) {
            return;
          }

          tick += 0.04;
          ambientLayer.clear();
          drawAmbient(ambientLayer, scene.id, tick);
          hero.y = heroPose.y + Math.sin(tick * 1.2) * heroPose.float;
          if (enemy) {
            enemy.y = 500 + Math.cos(tick * 1.05) * 3;
          }
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
  }, [
    combatLog,
    disabledIds,
    enemyName,
    equippedPetName,
    hotspotToneById,
    onHotspotClick,
    replayTurnsVisible,
    scene,
  ]);

  return (
    <div className="scene-canvas" data-testid="scene-canvas">
      <div ref={hostRef} className="scene-pixi-host" />
      <div className="scene-hotspot-layer" aria-label={`${scene.nameRu}: интерактивные места`}>
        {scene.hotspots.map((hotspot) => {
          const disabled = disabledIds.has(hotspot.id);
          const style = {
            left: `${hotspot.rect.x * 100}%`,
            top: `${hotspot.rect.y * 100}%`,
            width: `${hotspot.rect.width * 100}%`,
            height: `${hotspot.rect.height * 100}%`,
          };
          const tone = hotspotToneById?.[hotspot.id] ?? 'neutral';
          return (
            <button
              key={hotspot.id}
              type="button"
              className={`scene-hotspot ${tone}`}
              style={style}
              disabled={disabled}
              aria-label={hotspot.labelRu}
              title={hotspot.descriptionRu}
              data-testid={`hotspot-${hotspot.id}`}
              onClick={() => onHotspotClick(hotspot.action, hotspot)}
            >
              <span className="hotspot-marker" aria-hidden="true" />
              {hotspotBadges?.[hotspot.id] && <strong>{hotspotBadges[hotspot.id]}</strong>}
            </button>
          );
        })}
      </div>
      {sceneError && (
        <div className="scene-fallback" data-testid="scene-fallback">
          <strong>Сцена временно недоступна</strong>
          <span>{sceneError}</span>
        </div>
      )}
    </div>
  );
}

function toCanvasRect(hotspot: SceneHotspot) {
  return {
    x: hotspot.rect.x * WIDTH,
    y: hotspot.rect.y * HEIGHT,
    width: hotspot.rect.width * WIDTH,
    height: hotspot.rect.height * HEIGHT,
  };
}

function toneColors(tone: HotspotTone) {
  switch (tone) {
    case 'available':
      return { border: '#7ed2bd', fill: '#7ed2bd' };
    case 'traveling':
      return { border: '#f6cc6f', fill: '#f6cc6f' };
    case 'ready':
      return { border: '#ffd86f', fill: '#ffd86f' };
    case 'locked':
      return { border: '#646a67', fill: '#646a67' };
    case 'active':
      return { border: '#ef8f68', fill: '#ef8f68' };
    default:
      return { border: '#72d1bf', fill: '#ffffff' };
  }
}

function drawHotspot(
  graphic: Graphics,
  hotspot: SceneHotspot,
  tone: HotspotTone,
  disabled: boolean,
  active: boolean,
) {
  const rect = toCanvasRect(hotspot);
  const colors = toneColors(tone);
  graphic.clear();
  graphic
    .roundRect(rect.x, rect.y, rect.width, rect.height, 16)
    .fill({ color: colors.fill, alpha: disabled ? 0 : active ? 0.08 : 0 })
    .stroke({
      color: disabled ? '#5d5d5d' : colors.border,
      width: active ? 3 : 1.5,
      alpha: disabled ? 0.08 : active ? 0.62 : 0.08,
    });
}

function drawSceneFrame(layer: Graphics, sceneId: SceneId) {
  layer.clear();
  layer
    .roundRect(14, 14, WIDTH - 28, HEIGHT - 28, 22)
    .stroke({ color: '#8a6b43', width: 2.5, alpha: 0.65 })
    .roundRect(28, 28, WIDTH - 56, HEIGHT - 56, 18)
    .stroke({ color: '#2d4040', width: 2, alpha: 0.6 });

  if (sceneId === 'combat') {
    layer
      .roundRect(66, 68, 320, 82, 16)
      .fill({ color: '#1d1717', alpha: 0.35 })
      .roundRect(654, 68, 320, 82, 16)
      .fill({ color: '#1d1717', alpha: 0.35 });
  }
}

function getHeroPose(sceneId: SceneId) {
  switch (sceneId) {
    case 'combat':
      return { x: 312, y: 500, scale: 0.86, float: 3 };
    case 'inventory':
      return { x: 530, y: 506, scale: 0.72, float: 2 };
    case 'character':
      return { x: 560, y: 516, scale: 0.78, float: 2 };
    case 'pets':
      return { x: 392, y: 500, scale: 0.62, float: 2 };
    case 'map':
      return { x: 168, y: 484, scale: 0.48, float: 2 };
    case 'tavern':
      return { x: 245, y: 512, scale: 0.55, float: 2 };
    case 'journal':
      return { x: 820, y: 510, scale: 0.55, float: 2 };
    default:
      return { x: 520, y: 520, scale: 0.64, float: 4 };
  }
}

function drawDamageNumbers(stage: Container, sceneId: SceneId, turns?: CombatLog['turns']) {
  if (sceneId !== 'combat' || !turns) {
    return;
  }

  for (const [index, turn] of turns.slice(-4).entries()) {
    const text = new Text({
      text: `${turn.critical ? '!' : ''}-${turn.damage}`,
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: turn.critical ? 32 : 24,
        fill: turn.actor === 'character' ? '#ffdd76' : '#ff7872',
        stroke: { color: '#1a1010', width: 4 },
      },
    });
    text.position.set(turn.actor === 'character' ? 690 + index * 14 : 300 + index * 14, 206 + index * 34);
    stage.addChild(text);
  }
}

function drawAmbient(layer: Graphics, sceneId: SceneId, tick: number) {
  const pulse = Math.sin(tick) * 0.5 + 0.5;
  if (sceneId === 'hub') {
    layer
      .ellipse(520, 376, 95 + pulse * 8, 23 + pulse * 4)
      .fill({ color: '#9be9f4', alpha: 0.16 })
      .circle(786, 330, 40 + pulse * 4)
      .fill({ color: '#ffd56f', alpha: 0.12 });
  }
  if (sceneId === 'tavern') {
    layer
      .circle(828, 112, 68 + pulse * 8)
      .fill({ color: '#f4a04c', alpha: 0.16 })
      .ellipse(636, 450, 140, 26 + pulse * 4)
      .fill({ color: '#ffd26c', alpha: 0.12 });
  }
  if (sceneId === 'map') {
    layer
      .ellipse(562, 414, 150, 14 + pulse * 6)
      .fill({ color: '#b9ffff', alpha: 0.11 })
      .circle(552, 308, 44 + pulse * 8)
      .fill({ color: '#62ffc0', alpha: 0.15 });
  }
  if (sceneId === 'combat') {
    layer
      .circle(150, 260, 72 + pulse * 8)
      .fill({ color: '#f86636', alpha: 0.14 })
      .circle(890, 260, 72 + pulse * 8)
      .fill({ color: '#f86636', alpha: 0.14 });
  }
  if (sceneId === 'inventory' || sceneId === 'character') {
    layer.circle(528, 252, 88 + pulse * 10).fill({ color: '#7bf0d6', alpha: 0.1 });
  }
  if (sceneId === 'pets') {
    layer.circle(508, 378, 126 + pulse * 8).fill({ color: '#ffc36c', alpha: 0.13 });
  }
  if (sceneId === 'journal') {
    layer.circle(556, 396, 60 + pulse * 8).fill({ color: '#e84b57', alpha: 0.12 });
  }
}
