import { Component, type ErrorInfo, type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import type { BootstrapState } from '@lov2/shared';
import { apiClient } from './lib/api.js';
import { GameShell } from './components/game/GameShell.js';

export function App() {
  const [state, setState] = useState<BootstrapState | null>(null);
  const [email, setEmail] = useState('player@example.com');
  const [displayName, setDisplayName] = useState('Игрок');
  const [password, setPassword] = useState('change-me-1234');
  const [characterName, setCharacterName] = useState('Матвей');
  const [raceId, setRaceId] = useState('nocturne');
  const [message, setMessage] = useState('Добро пожаловать в ночной двор.');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient.bootstrap().then(setState).catch(() => setState(null));
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

  if (!state?.user) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <p className="eyebrow">LOV2</p>
          <h1>Ночная сага начинается</h1>
          <p>
            Русскоязычная браузерная RPG: контракты, путешествия, дуэли, экипировка и рост героя.
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
        <img src="/assets/original/scene-hub.svg" alt="" className="auth-art" />
      </main>
    );
  }

  if (!state.character) {
    return (
      <main className="creation-shell">
        <section className="creation-copy">
          <p className="eyebrow">Выбор крови</p>
          <h1>Создайте героя</h1>
          <p>У каждой расы свои стартовые характеристики и стиль первых контрактов.</p>
        </section>
        <section className="race-grid">
          {state.races.map((race) => (
            <button
              key={race.id}
              className={`race-tile ${raceId === race.id ? 'selected' : ''}`}
              onClick={() => setRaceId(race.id)}
            >
              <strong>{race.nameRu}</strong>
              <span>{race.descriptionRu}</span>
              <small>{race.passiveRu}</small>
            </button>
          ))}
        </section>
        <form
          className="creation-form"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              () => apiClient.createCharacter({ name: characterName, raceId }),
              'Персонаж готов.',
            );
          }}
        >
          <input value={characterName} onChange={(event) => setCharacterName(event.target.value)} />
          <button disabled={busy}>Начать</button>
        </form>
        {message && <p className="message">{message}</p>}
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
          <p>Можно повторить загрузку или выйти в экран входа. Прогресс персонажа сохранен.</p>
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
