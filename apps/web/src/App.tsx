import { Component, type ErrorInfo, type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import type { BootstrapState, CharacterClassId, CharacterGender } from '@lov2/shared';
import { apiClient } from './lib/api.js';
import { GameShell } from './components/game/GameShell.js';
import { assetPath } from './components/game/assets.js';

const GENDER_OPTIONS: Array<{
  id: CharacterGender;
  label: string;
  glyph: string;
}> = [
  { id: 'male', label: 'Мужчина', glyph: '♂' },
  { id: 'female', label: 'Женщина', glyph: '♀' },
];

const CLASS_OPTIONS: Array<{
  id: CharacterClassId;
  label: string;
  glyph: string;
  description: string;
}> = [
  {
    id: 'swordsman',
    label: 'Мечник',
    glyph: '⚔',
    description:
      'Мечники — самые сильные и чрезвычайно выносливые воины. Вместе с мечами они используют прочные щиты и уверенно держат фронт в долгом бою.',
  },
  {
    id: 'ranger',
    label: 'Стрелок',
    glyph: '🏹',
    description:
      'Стрелки полагаются на ловкость, дистанцию и быстрые вылазки. Они лучше других читают маршрут, первыми замечают опасность и точнее держат темп боя.',
  },
  {
    id: 'mage',
    label: 'Мистик',
    glyph: '✦',
    description:
      'Мистики играют от интуиции и контроля. Их сила раскрывается в точных решениях, магических импульсах и умении переломить дуэль в нужный момент.',
  },
];

const RANDOM_NAMES = ['Даррид', 'Нарек', 'Элира', 'Каэл', 'Мирель', 'Селвин'];

export function App() {
  const [state, setState] = useState<BootstrapState | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [email, setEmail] = useState('player@example.com');
  const [displayName, setDisplayName] = useState('Игрок');
  const [password, setPassword] = useState('change-me-1234');
  const [characterName, setCharacterName] = useState('Даррид');
  const [raceId, setRaceId] = useState('nocturne');
  const [gender, setGender] = useState<CharacterGender>('male');
  const [classId, setClassId] = useState<CharacterClassId>('swordsman');
  const [message, setMessage] = useState('Добро пожаловать в ночной двор.');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient.bootstrap()
      .then(setState)
      .catch(() => setState(null))
      .finally(() => setBootstrapped(true));
  }, []);

  const run = useCallback(async <T,>(action: () => Promise<T>, success: string) => {
    setBusy(true);
    setMessage('');
    try {
      const result = await action();
      if (isBootstrap(result)) {
        setState(result);
      }
      setMessage(success);
      return result;
    } catch (error) {
      setMessage(normalizeUserMessage(error));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const selectedRace = useMemo(
    () => state?.races.find((race) => race.id === raceId) ?? state?.races[0] ?? null,
    [raceId, state?.races],
  );
  const selectedClass = useMemo(
    () => CLASS_OPTIONS.find((entry) => entry.id === classId) ?? CLASS_OPTIONS[0]!,
    [classId],
  );

  function randomizeCreation() {
    const nextGender = GENDER_OPTIONS[Math.floor(Math.random() * GENDER_OPTIONS.length)]!;
    const nextClass = CLASS_OPTIONS[Math.floor(Math.random() * CLASS_OPTIONS.length)]!;
    const nextRace = state?.races[Math.floor(Math.random() * (state.races.length || 1))];
    const nextName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]!;

    setGender(nextGender.id);
    setClassId(nextClass.id);
    if (nextRace) {
      setRaceId(nextRace.id);
    }
    setCharacterName(nextName);
  }

  async function submitAuth(event: FormEvent, mode: 'login' | 'register') {
    event.preventDefault();
    await run(async () => {
      if (mode === 'register') {
        await apiClient.register({ email, displayName, password });
      } else {
        await apiClient.login({ email, password });
      }
      return apiClient.bootstrap();
    }, mode === 'register' ? 'Аккаунт создан.' : 'Вход выполнен.');
  }

  const handleLogout = useCallback(async () => {
    await run(async () => {
      await apiClient.logout();
      setState(null);
      return null;
    }, 'Вы вышли из аккаунта.');
  }, [run]);

  if (!bootstrapped) {
    return (
      <main className="lov-loading-screen" data-testid="loading-screen">
        <section className="lov-loading-card" aria-label="Загрузка">
          <div className="lov-loading-logo">LOV2</div>
          <div className="lov-loading-art" />
          <div className="lov-loading-bar">
            <span>Загрузка</span>
            <i />
          </div>
        </section>
      </main>
    );
  }

  if (!state?.user) {
    return (
      <main className="auth-shell lov-auth-shell">
        <section className="auth-panel lov-auth-panel">
          <p className="eyebrow">LOV2</p>
          <h1>Ночная сага начинается</h1>
          <p>
            Русскоязычная браузерная RPG: контракты, путешествия, дуэли, экипировка,
            питомцы и рост героя в старом фэнтезийном интерфейсе.
          </p>
          <form className="auth-form" onSubmit={(event) => submitAuth(event, 'login')}>
            <label>
              Почта
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              Имя
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
            <label>
              Пароль
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
              />
            </label>
            <div className="button-row">
              <button disabled={busy} type="submit">
                Войти
              </button>
              <button
                disabled={busy}
                type="button"
                className="secondary"
                onClick={() =>
                  void run(async () => {
                    await apiClient.register({ email, displayName, password });
                    return apiClient.bootstrap();
                  }, 'Аккаунт создан.')
                }
              >
                Создать аккаунт
              </button>
            </div>
          </form>
          {message && <p className="message">{message}</p>}
        </section>
        <img src={assetPath('scene-hub')} alt="" className="auth-art" />
      </main>
    );
  }

  if (!state.character) {
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
            onSubmit={(event) => {
              event.preventDefault();
              void run(
                () => apiClient.createCharacter({ name: characterName, raceId, gender, classId }),
                'Персонаж готов.',
              );
            }}
          >
            <header className="lov-creation-header">
              <h1>Создание персонажа</h1>
              <label className="lov-creation-name">
                <span>Имя героя</span>
                <input
                  value={characterName}
                  onChange={(event) => setCharacterName(event.target.value)}
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
                    onClick={() => setGender(option.id)}
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
                    onClick={() => setRaceId(race.id)}
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
                    onClick={() => setClassId(option.id)}
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
                onClick={randomizeCreation}
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
                onClick={randomizeCreation}
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

  return (
    <GameErrorBoundary onLogout={() => void handleLogout()} onRetry={() => window.location.reload()}>
      <GameShell state={state} onBootstrap={setState} onLogout={handleLogout} />
    </GameErrorBoundary>
  );
}

function normalizeUserMessage(error: unknown): string {
  const fallback = error instanceof Error ? error.message : 'Что-то пошло не так';
  if (fallback.includes('Unique constraint') || fallback.includes('already exists')) {
    return 'Аккаунт уже существует. Войдите или используйте другую почту.';
  }
  return fallback;
}

function isBootstrap(value: unknown): value is BootstrapState {
  return typeof value === 'object' && value !== null && 'races' in value && 'quests' in value;
}

class GameErrorBoundary extends Component<
  { children: ReactNode; onLogout: () => void; onRetry: () => void },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="game-error-shell" data-testid="game-error-boundary">
        <section className="panel game-error-panel">
          <p className="eyebrow">LOV2</p>
          <h1>Экран игры временно не загрузился</h1>
          <p>
            Можно повторить загрузку или выйти в экран входа. Прогресс персонажа сохранен.
          </p>
          {import.meta.env.DEV && <pre>{this.state.error.message}</pre>}
          <div className="button-row">
            <button onClick={this.props.onRetry}>Повторить</button>
            <button className="secondary" onClick={this.props.onLogout}>
              Выйти
            </button>
          </div>
        </section>
      </main>
    );
  }
}
