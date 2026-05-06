import type { FormEvent } from 'react';
import type { BootstrapState, CharacterClassId, CharacterGender } from '@lov2/shared';
import { CLASS_OPTIONS, GENDER_OPTIONS } from '../game/characterCreationOptions.js';

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
    <div className="lov-creation-ruler" aria-hidden="true">
        {['0%', '20%', '40%', '60%', '80%', '100%'].map((label) => (
        <span key={label}>{label}</span>
        ))}
    </div>

    <section className="lov-creation-body">
        <form
        className="lov-creation-panel"
        onSubmit={onSubmit}
        >
        <header className="lov-creation-header">
            <h1>Создание персонажа</h1>
            <label className="lov-creation-name">
            <span>Имя героя</span>
            <input
                value={characterName}
                onChange={(event) => onCharacterNameChange(event.target.value)}
                maxLength={24}
            />
            </label>
        </header>

        <section className="lov-creation-section">
            <div className="lov-creation-section-title">Пол</div>
            <div className="lov-creation-grid two">
            {GENDER_OPTIONS.map((option) => (
                <button
                key={option.id}
                type="button"
                className={gender === option.id ? 'active' : ''}
                onClick={() => onGenderChange(option.id)}
                >
                <span className="lov-creation-glyph">{option.glyph}</span>
                <strong>{option.label}</strong>
                </button>
            ))}
            </div>
        </section>

        <section className="lov-creation-section">
            <div className="lov-creation-section-title">Раса</div>
            <div className="lov-creation-grid race">
            {state.races.map((race) => (
                <button
                key={race.id}
                type="button"
                className={raceId === race.id ? 'active' : ''}
                onClick={() => onRaceChange(race.id)}
                >
                <strong>{race.nameRu}</strong>
                <small>{race.passiveRu}</small>
                </button>
            ))}
            </div>
        </section>

        <section className="lov-creation-section">
            <div className="lov-creation-section-title">Класс</div>
            <div className="lov-creation-grid three">
            {CLASS_OPTIONS.map((option) => (
                <button
                key={option.id}
                type="button"
                className={classId === option.id ? 'active' : ''}
                onClick={() => onClassChange(option.id)}
                >
                <span className="lov-creation-glyph">{option.glyph}</span>
                <strong>{option.label}</strong>
                </button>
            ))}
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
            onClick={onRandomize}
            >
            Случайный выбор
            </button>
            <button disabled={busy || !characterName.trim()} type="submit">
            Далее
            </button>
        </footer>
        </form>

        <section className="lov-creation-preview">
        <div className="lov-creation-preview-top">
            <button
            type="button"
            className="lov-creation-random"
            disabled={busy}
            onClick={onRandomize}
            >
            <span>Случайный выбор</span>
            <strong>⚄</strong>
            </button>
        </div>
        <div className="lov-creation-scene">
            <img src="/assets/original/scene-hub.svg" alt="" />
            <div className="lov-creation-avatar-card">
            <div className="lov-creation-avatar-meta">
                <span>{selectedRace?.nameRu ?? 'Раса'}</span>
                <strong>{selectedClass.label}</strong>
                <small>{gender === 'male' ? 'Мужчина' : 'Женщина'}</small>
            </div>
            <img src="/assets/original/hero-nocturne.svg" alt="" />
            </div>
        </div>
        </section>
    </section>

    {message ? <p className="message lov-creation-message">{message}</p> : null}
    </main>
  );
}