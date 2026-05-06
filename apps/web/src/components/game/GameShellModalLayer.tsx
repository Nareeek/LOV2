import type { ReactNode } from 'react';

export function GameShellModalLayer({
  children,
  testId,
  reward = false,
}: {
  children: ReactNode;
  testId?: string;
  reward?: boolean;
}) {
  return (
    <div
      className={`shell-reset-modal-layer${reward ? ' reward' : ''}`}
      data-testid={testId}
    >
      <div className="shell-reset-scrim" aria-hidden="true" />
      <div className="shell-reset-modal-card">{children}</div>
    </div>
  );
}