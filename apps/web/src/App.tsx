import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { BootstrapState, CharacterClassId, CharacterGender } from '@lov2/shared';
import { apiClient } from './lib/api.js';
import { GameShell } from './components/game/GameShell.js';
import { assetPath } from './components/game/assets.js';
import { CLASS_OPTIONS, GENDER_OPTIONS, RANDOM_NAMES } from './game/characterCreationOptions.js';
import { GameErrorBoundary } from './components/game/GameErrorBoundary.js';
import { AuthScreen } from './screens/AuthScreen.js';
import { CharacterCreationScreen } from './screens/CharacterCreationScreen.js';

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
      <AuthScreen
        email={email}
        displayName={displayName}
        password={password}
        message={message}
        busy={busy}
        onEmailChange={setEmail}
        onDisplayNameChange={setDisplayName}
        onPasswordChange={setPassword}
        onSubmitAuth={submitAuth}
        onCreateAccount={() =>
          void run(async () => {
            await apiClient.register({ email, displayName, password });
            return apiClient.bootstrap();
          }, 'Аккаунт создан.')
        }
      />
    );
  }

  if (!state.character) {
    return (
      <CharacterCreationScreen
        state={state}
        characterName={characterName}
        raceId={raceId}
        gender={gender}
        classId={classId}
        message={message}
        busy={busy}
        onCharacterNameChange={setCharacterName}
        onRaceChange={setRaceId}
        onGenderChange={setGender}
        onClassChange={setClassId}
        onRandomize={randomizeCreation}
        onSubmit={(event) => {
          event.preventDefault();
          void run(
            () => apiClient.createCharacter({ name: characterName, raceId, gender, classId }),
            'Персонаж готов.',
          );
        }}
      />
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
