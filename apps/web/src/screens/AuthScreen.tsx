import type { FormEvent } from 'react';
import { assetPath } from '../components/game/assets.js';

export function AuthScreen({
  email,
  displayName,
  password,
  message,
  busy,
  onEmailChange,
  onDisplayNameChange,
  onPasswordChange,
  onSubmitAuth,
  onCreateAccount,
}: {
  email: string;
  displayName: string;
  password: string;
  message: string;
  busy: boolean;
  onEmailChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmitAuth: (event: FormEvent, mode: 'login' | 'register') => void | Promise<void>;
  onCreateAccount: () => void;
}) {
  return (
      <main className="auth-shell lov-auth-shell">
        <section className="auth-panel lov-auth-panel">
          <p className="eyebrow">LOV2</p>
          <h1>Ночная сага начинается</h1>
          <p>
            Русскоязычная браузерная RPG: контракты, путешествия, дуэли, экипировка,
            питомцы и рост героя в старом фэнтезийном интерфейсе.
          </p>
          <form className="auth-form" onSubmit={(event) => void onSubmitAuth(event, 'login')}>
            <label>
              Почта
              <input value={email} onChange={(event) => onEmailChange(event.target.value)} />
            </label>
            <label>
              Имя
              <input value={displayName} onChange={(event) => onDisplayNameChange(event.target.value)} />
            </label>
            <label>
              Пароль
              <input
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
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
                onClick={onCreateAccount}
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