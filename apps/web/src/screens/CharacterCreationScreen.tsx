import type { FormEvent } from 'react';
import type { BootstrapState, CharacterClassId, CharacterGender, Race } from '@lov2/shared';
import { assetPath } from '../components/game/assets.js';
import { CLASS_OPTIONS, GENDER_OPTIONS } from '../game/characterCreationOptions.js';

type PreviewGenderConfig = {
  label: string;
  assetKey: CharacterGender;
};

type PreviewClassConfig = {
  label: string;
  assetKey: 'swordsman' | 'ranger' | 'mystic';
};

const PREVIEW_GENDERS: Record<CharacterGender, PreviewGenderConfig> = {
  male: {
    label: 'Мужчина',
    assetKey: 'male',
  },
  female: {
    label: 'Женщина',
    assetKey: 'female',
  },
};

const PREVIEW_RACE_ASSET_KEYS: Record<string, 'nocturne' | 'veiled' | 'oracle'> = {
  nocturne: 'nocturne',
  veiled: 'veiled',
  oracle: 'oracle',
};

const PREVIEW_CLASSES: Record<CharacterClassId, PreviewClassConfig> = {
  swordsman: {
    label: 'Мечник',
    assetKey: 'swordsman',
  },
  ranger: {
    label: 'Стрелок',
    assetKey: 'ranger',
  },
  mage: {
    label: 'Мистик',
    assetKey: 'mystic',
  },
};

function characterCreationPreviewPath(gender: CharacterGender, raceId: string, classId: CharacterClassId): string {
  const genderKey = PREVIEW_GENDERS[gender].assetKey;
  const raceKey = PREVIEW_RACE_ASSET_KEYS[raceId] ?? PREVIEW_RACE_ASSET_KEYS.nocturne;
  const classKey = PREVIEW_CLASSES[classId].assetKey;
  return `/assets/generated/character-creation/cc_${genderKey}_${raceKey}_${classKey}.png`;
}

export function CharacterCreationScreen({
  state,
  characterName,
  raceId,
  gender,
  classId,
  message,
  busy,
  onCharacterNameChange,
  onRaceChange,
  onGenderChange,
  onClassChange,
  onRandomize,
  onSubmit,
}: {
  state: BootstrapState;
  characterName: string;
  raceId: string;
  gender: CharacterGender;
  classId: CharacterClassId;
  message: string;
  busy: boolean;
  onCharacterNameChange: (value: string) => void;
  onRaceChange: (value: string) => void;
  onGenderChange: (value: CharacterGender) => void;
  onClassChange: (value: CharacterClassId) => void;
  onRandomize: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const selectedRace = state.races.find((race) => race.id === raceId) ?? state.races[0] ?? null;
  const selectedClass = CLASS_OPTIONS.find((entry) => entry.id === classId) ?? CLASS_OPTIONS[0]!;

  return (
    <main className="lov-creation-shell" data-testid="creation-screen">
      <section className="lov-creation-body">
        <form className="lov-creation-panel" onSubmit={onSubmit}>
          <header className="lov-creation-header">
            <h1>Создание персонажа</h1>
            <label className="lov-creation-name">
              <span>Имя героя</span>
              <input
                data-testid="creation-name-input"
                value={characterName}
                onChange={(event) => onCharacterNameChange(event.target.value)}
                maxLength={24}
              />
            </label>
          </header>

          <section className="lov-creation-section">
            <div className="lov-creation-section-title">Пол</div>
            <div className="lov-creation-grid two">
              {GENDER_OPTIONS.map((option) => {
                const selected = gender === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={selected ? 'active' : ''}
                    data-testid={`creation-gender-${option.id}`}
                    data-selected={selected ? 'true' : 'false'}
                    aria-pressed={selected}
                    onClick={() => onGenderChange(option.id)}
                  >
                    <span className="lov-creation-glyph">{option.glyph}</span>
                    <strong>{option.label}</strong>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="lov-creation-section">
            <div className="lov-creation-section-title">Раса</div>
            <div className="lov-creation-grid race">
              {state.races.map((race) => {
                const selected = raceId === race.id;
                return (
                  <button
                    key={race.id}
                    type="button"
                    className={selected ? 'active' : ''}
                    data-testid={`creation-race-${race.id}`}
                    data-selected={selected ? 'true' : 'false'}
                    aria-pressed={selected}
                    onClick={() => onRaceChange(race.id)}
                  >
                    <strong>{race.nameRu}</strong>
                    <small>{race.passiveRu}</small>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="lov-creation-section">
            <div className="lov-creation-section-title">Класс</div>
            <div className="lov-creation-grid three">
              {CLASS_OPTIONS.map((option) => {
                const selected = classId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={selected ? 'active' : ''}
                    data-testid={`creation-class-${option.id}`}
                    data-selected={selected ? 'true' : 'false'}
                    aria-pressed={selected}
                    onClick={() => onClassChange(option.id)}
                  >
                    <span className="lov-creation-glyph">{option.glyph}</span>
                    <strong>{option.label}</strong>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="lov-creation-description">
            <h2>{selectedClass.label}</h2>
            <p>{selectedClass.description}</p>
            {selectedRace ? <small>{selectedRace.descriptionRu}</small> : null}
          </section>

          <footer className="lov-creation-actions">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              data-testid="creation-random-secondary"
              onClick={onRandomize}
            >
              Случайный выбор
            </button>
            <button disabled={busy || !characterName.trim()} type="submit" data-testid="creation-submit">
              Далее
            </button>
          </footer>
        </form>

        <CharacterCreationPreview
          characterName={characterName}
          race={selectedRace}
          gender={gender}
          classId={classId}
          busy={busy}
          onRandomize={onRandomize}
        />
      </section>

      {message ? <p className="message lov-creation-message">{message}</p> : null}
    </main>
  );
}

function CharacterCreationPreview({
  characterName,
  race,
  gender,
  classId,
  busy,
  onRandomize,
}: {
  characterName: string;
  race: Race | null;
  gender: CharacterGender;
  classId: CharacterClassId;
  busy: boolean;
  onRandomize: () => void;
}) {
  const genderPreview = PREVIEW_GENDERS[gender];
  const classPreview = PREVIEW_CLASSES[classId];
  const raceId = race?.id ?? 'nocturne';
  const previewSrc = characterCreationPreviewPath(gender, raceId, classId);
  const displayName = characterName.trim() || 'Герой';

  return (
    <section className="lov-creation-preview" aria-label="Предпросмотр персонажа">
      <div className="lov-creation-preview-top">
        <button
          type="button"
          className="lov-creation-random"
          disabled={busy}
          data-testid="creation-random"
          onClick={onRandomize}
        >
          <span>Случайный выбор</span>
          <strong aria-hidden="true">⚄</strong>
        </button>
      </div>
      <div
        className="lov-creation-scene"
        data-testid="creation-preview"
        data-gender={gender}
        data-race={raceId}
        data-class={classId}
      >
        <img className="lov-creation-scene-bg" src={assetPath('scene-character')} alt="" />
        <div className="lov-creation-preview-light" aria-hidden="true" />
        <div className="lov-creation-avatar-card">
          <img
            className="lov-creation-character-image"
            data-testid="creation-preview-character"
            src={previewSrc}
            alt=""
          />
        </div>
        <div className="lov-creation-avatar-meta">
          <span>{race?.nameRu ?? 'Раса'}</span>
          <strong>{displayName}</strong>
          <small>
            {genderPreview.label} · {classPreview.label}
          </small>
        </div>
      </div>
    </section>
  );
}
