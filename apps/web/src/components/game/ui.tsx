import type { ItemDefinition } from '@lov2/shared';
import { assetPath } from './assets.js';

export function Meter({
  label,
  value,
  max,
  tone,
  percent,
}: {
  label: string;
  value: number;
  max: number;
  tone: 'health' | 'xp' | 'energy';
  percent?: number;
}) {
  const width = percent ?? Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div className={`meter ${tone}`}>
      <span>{label}</span>
      <div>
        <i style={{ width: `${width}%` }} />
      </div>
      <strong>
        {value}/{max}
      </strong>
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
    return <span className="item-chip empty">неизвестно</span>;
  }

  return (
    <span className={`item-chip ${item.rarity} ${compact ? 'compact' : ''}`}>
      <img src={assetPath(item.iconAssetId)} alt="" />
      <span>{item.nameRu}</span>
    </span>
  );
}
