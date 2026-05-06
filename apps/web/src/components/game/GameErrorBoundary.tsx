import { Component, type ErrorInfo, type ReactNode } from 'react';

export class GameErrorBoundary extends Component<
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