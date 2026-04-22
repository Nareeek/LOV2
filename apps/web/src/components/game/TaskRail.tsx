import { exerciseDefinitions } from '@lov2/game-data';
import type { GameIntent } from '../../game/types.js';

export function TaskRail({
  activeExerciseId,
  onIntent,
}: {
  activeExerciseId: string | null;
  onIntent: (intent: GameIntent) => void;
}) {
  return (
    <aside className="shell-reset-exercise-feed" data-testid="exercise-feed">
      {exerciseDefinitions.map((exercise, index) => {
        const toneClass = exercise.tone === 'mint' ? 'tone-mint' : exercise.tone === 'ember' ? 'tone-ember' : 'tone-gold';
        const glyph = exercise.titleRu.slice(0, 1).toUpperCase();
        const levelBadge = exercise.recommendedLevelRu.split(' ')[1] ?? `${index + 1}`;

        return (
          <button
            key={exercise.id}
            className={`shell-reset-exercise-card ${toneClass} ${activeExerciseId === exercise.id ? 'active' : ''}`}
            data-testid={`exercise-card-${exercise.id}`}
            type="button"
            title={`${exercise.titleRu} · ${exercise.locationHintRu}`}
            aria-label={`${exercise.titleRu}. ${exercise.locationHintRu}. ${exercise.recommendedLevelRu}.`}
            onClick={() => onIntent({ type: 'selectExercise', exerciseId: exercise.id })}
          >
            <span className="shell-reset-exercise-glyph" aria-hidden="true">
              {glyph}
            </span>
            <small>{levelBadge}</small>
          </button>
        );
      })}
    </aside>
  );
}
