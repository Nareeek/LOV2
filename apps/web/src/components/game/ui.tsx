import type { ItemDefinition } from '@lov2/shared';
import { assetPath } from './assets.js';

export function Meter({
  label,
  value,
  max,
  tone,
  percent,
  displayValue,
}: {
  label: string;
  value: number;
  max: number;
  tone: 'health' | 'xp' | 'energy';
  percent?: number;
  displayValue?: string;
}) {
  const width = percent ?? Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div className={`meter ${tone}`}>
      <span>{label}</span>
      <div>
        <i style={{ width: `${width}%` }} />
      </div>
      <strong>{displayValue ?? `${value}/${max}`}</strong>
    </div>
  );
}

export function ItemChip({
  item,
  compact = false,
}: {
  item: ItemDefinition | undefined;
  compact?: boolean;
}) {
  if (!item) {
    return <span className="item-chip empty">Пусто</span>;
  }

  return (
    <span className={`item-chip ${item.rarity} ${compact ? 'compact' : ''}`}>
      <img src={assetPath(item.iconAssetId)} alt="" />
      <span>{item.nameRu}</span>
    </span>
  );
}

export function UiIcon({
  name,
  className = '',
}: {
  name:
    | 'hero'
    | 'info'
    | 'map'
    | 'arena'
    | 'store'
    | 'forge'
    | 'tower'
    | 'boat'
    | 'inventory'
    | 'pets'
    | 'journal'
    | 'gift'
    | 'logout'
    | 'trophy'
    | 'settings'
    | 'close'
    | 'back';
  className?: string;
}) {
  return (
    <svg className={`ui-icon ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
      {iconShape(name)}
    </svg>
  );
}

function iconShape(name: Parameters<typeof UiIcon>[0]['name']) {
  const stroke = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'hero':
      return (
        <>
          <circle cx="12" cy="8" r="3.2" {...stroke} />
          <path d="M6.5 19c1.4-3 3.3-4.5 5.5-4.5s4.1 1.5 5.5 4.5" {...stroke} />
        </>
      );
    case 'info':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" {...stroke} />
          <path d="M12 10.2v5.1" {...stroke} />
          <path d="M12 7.2h.01" {...stroke} />
        </>
      );
    case 'map':
      return (
        <>
          <path d="M4.5 6.5 9 4l6 2 4.5-2v13.5L15 20l-6-2-4.5 2Z" {...stroke} />
          <path d="M9 4v14" {...stroke} />
          <path d="M15 6v14" {...stroke} />
        </>
      );
    case 'arena':
      return (
        <>
          <path d="M7 6.5 17.5 17" {...stroke} />
          <path d="M16.5 6.5 6 17" {...stroke} />
          <path d="m5.2 8.2 1.8-1.8 2.2 2.2-1.8 1.8Z" {...stroke} />
          <path d="m14.8 15.6 1.8-1.8 2.2 2.2-1.8 1.8Z" {...stroke} />
        </>
      );
    case 'store':
      return (
        <>
          <path d="M5.5 9.5h13l-1 10h-11Z" {...stroke} />
          <path d="M7 9.5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 1 1 5 0" {...stroke} />
          <path d="M9.5 13h5" {...stroke} />
        </>
      );
    case 'forge':
      return (
        <>
          <path d="m6 8 4 4" {...stroke} />
          <path d="m10 8-4 4" {...stroke} />
          <path d="M13 7h4l1.5 1.5-5.5 5.5H9.5" {...stroke} />
          <path d="M14 15.5h5" {...stroke} />
        </>
      );
    case 'tower':
      return (
        <>
          <path d="M8 20V9.5l4-3 4 3V20" {...stroke} />
          <path d="M6.5 9.5h11" {...stroke} />
          <path d="M9.5 13.5h5" {...stroke} />
          <path d="M11 20v-3h2v3" {...stroke} />
        </>
      );
    case 'boat':
      return (
        <>
          <path d="M4 16.5c1.3 1 2.7 1.5 4 1.5s2.7-.5 4-1.5 2.7-1.5 4-1.5 2.7.5 4 1.5" {...stroke} />
          <path d="M6 14h12l-2 3H8Z" {...stroke} />
          <path d="M11 6v8" {...stroke} />
          <path d="M11 6c3 0 4.5 1.3 5 3.5-2-.3-3.7.2-5 1.5" {...stroke} />
        </>
      );
    case 'inventory':
      return (
        <>
          <rect x="5.5" y="6" width="13" height="12.5" rx="2" {...stroke} />
          <path d="M9 9h6" {...stroke} />
          <path d="M9 12.5h6" {...stroke} />
          <path d="M9 16h3" {...stroke} />
        </>
      );
    case 'pets':
      return (
        <>
          <circle cx="8" cy="9" r="1.5" {...stroke} />
          <circle cx="12" cy="7.5" r="1.5" {...stroke} />
          <circle cx="16" cy="9" r="1.5" {...stroke} />
          <path d="M8.5 14.5c1-1.4 2.1-2.1 3.5-2.1s2.5.7 3.5 2.1c0 1.8-1.6 3.5-3.5 3.5s-3.5-1.7-3.5-3.5Z" {...stroke} />
        </>
      );
    case 'journal':
      return (
        <>
          <path d="M7 5.5h9.5A2.5 2.5 0 0 1 19 8v10.5H9A2 2 0 0 0 7 20.5Z" {...stroke} />
          <path d="M7 5.5v15" {...stroke} />
          <path d="M10.5 10h5" {...stroke} />
          <path d="M10.5 13.5h5" {...stroke} />
        </>
      );
    case 'gift':
      return (
        <>
          <rect x="5.5" y="10" width="13" height="9" rx="1.5" {...stroke} />
          <path d="M12 10v9" {...stroke} />
          <path d="M6 13.5h12" {...stroke} />
          <path d="M12 10c-2.2 0-4-1-4-2.5S9.4 5 12 10Zm0 0c2.2 0 4-1 4-2.5S14.6 5 12 10Z" {...stroke} />
        </>
      );
    case 'logout':
      return (
        <>
          <path d="M10 5.5H7.5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2H10" {...stroke} />
          <path d="M13.5 8.5 18 12l-4.5 3.5" {...stroke} />
          <path d="M18 12H10" {...stroke} />
        </>
      );
    case 'trophy':
      return (
        <>
          <path d="M8 5.5h8v2.5a4 4 0 0 1-4 4 4 4 0 0 1-4-4Z" {...stroke} />
          <path d="M8 7H5.8a1.8 1.8 0 0 0 0 3.6H8" {...stroke} />
          <path d="M16 7h2.2a1.8 1.8 0 0 1 0 3.6H16" {...stroke} />
          <path d="M12 12v3.5" {...stroke} />
          <path d="M9 19h6" {...stroke} />
          <path d="M10 15.5h4" {...stroke} />
        </>
      );
    case 'settings':
      return (
        <>
          <circle cx="12" cy="12" r="2.7" {...stroke} />
          <path d="M12 4.8v2" {...stroke} />
          <path d="M12 17.2v2" {...stroke} />
          <path d="m17.1 6.9-1.4 1.4" {...stroke} />
          <path d="m8.3 15.7-1.4 1.4" {...stroke} />
          <path d="M19.2 12h-2" {...stroke} />
          <path d="M6.8 12h-2" {...stroke} />
          <path d="m17.1 17.1-1.4-1.4" {...stroke} />
          <path d="m8.3 8.3-1.4-1.4" {...stroke} />
        </>
      );
    case 'close':
      return (
        <>
          <path d="M6.8 6.8 17.2 17.2" {...stroke} />
          <path d="M17.2 6.8 6.8 17.2" {...stroke} />
        </>
      );
    case 'back':
      return (
        <>
          <path d="M17.5 12H7" {...stroke} />
          <path d="m11 7-5 5 5 5" {...stroke} />
        </>
      );
    default:
      return null;
  }
}
