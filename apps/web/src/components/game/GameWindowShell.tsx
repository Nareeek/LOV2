import type { ReactNode } from 'react';
import type { WindowBodyScroll, WindowSize } from './GamePanels.data.js';
import { UiIcon } from './ui.js';
export function WorldWindowShell({
  title,
  onClose,
  children,
  testId,
  className = '',
  size = 'standard',
  bodyScroll = 'body',
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
  className?: string;
  size?: WindowSize;
  bodyScroll?: WindowBodyScroll;
}) {
  return (
    <section
      className={`shell-reset-window lov-window-shell size-${size} scroll-${bodyScroll} ${className}`.trim()}
      data-testid={testId}
    >
      <header className="shell-reset-window-header lov-window-header">
        <h2>{title}</h2>
        <button
          className="shell-reset-icon-button lov-window-close"
          aria-label="Закрыть"
          data-testid="world-window-close-button"
          onClick={onClose}
        >
          <UiIcon name="close" />
        </button>
      </header>
      <div className={`shell-reset-window-body lov-window-body body-scroll-${bodyScroll}`}>{children}</div>
      <footer className="shell-reset-window-footer lov-window-footer">
        <button className="lov-close-button" data-testid="world-window-bottom-close" onClick={onClose}>
          Закрыть
        </button>
      </footer>
    </section>
  );
}


