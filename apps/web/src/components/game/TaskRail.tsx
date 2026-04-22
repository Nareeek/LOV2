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
        return (
          <button
            key={exercise.id}
            className={`shell-reset-exercise-card ${toneClass} ${activeExerciseId === exercise.id ? 'active' : ''}`}
            data-testid={`exercise-card-${exercise.id}`}
            type="button"
            onClick={() => onIntent({ type: 'selectExercise', exerciseId: exercise.id })}
          >
            <span>{exercise.subtitleRu}</span>
            <strong>{exercise.titleRu}</strong>
            <small>
              {exercise.locationHintRu} · {exercise.recommendedLevelRu}
            </small>
          </button>
        );
      })}
    </aside>
  );
}
