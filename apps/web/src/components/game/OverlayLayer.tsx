import type { ReactNode } from 'react';

export function OverlayLayer({
  title,
  placement = 'side',
  onClose,
  children,
}: {
  title: string;
  placement?: 'side' | 'center' | 'info';
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <section
      className={`overlay-panel ${placement}`}
      data-testid="game-modal"
      role="dialog"
      aria-label={title}
    >
      <header>
        <h2>{title}</h2>
        <button className="icon-close" onClick={onClose} aria-label="Закрыть">
          x
        </button>
      </header>
      <div className="overlay-body">{children}</div>
    </section>
  );
}
