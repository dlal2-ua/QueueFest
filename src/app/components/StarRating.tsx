import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function StarRating({ value, onChange, label, disabled = false, size = 'md' }: StarRatingProps) {
  const iconClass = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';
  const buttonClass = size === 'sm' ? 'p-0.5' : 'p-1';

  return (
    <div>
      {label && <p className="mb-2 text-sm font-semibold text-gray-800">{label}</p>}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= value;
          return (
            <button
              key={star}
              type="button"
              disabled={disabled || !onChange}
              onClick={() => onChange?.(star)}
              className={`${buttonClass} rounded-full transition-colors ${
                disabled || !onChange ? 'cursor-default' : 'hover:bg-amber-50'
              }`}
              aria-label={`${star} estrellas`}
            >
              <Star
                className={`${iconClass} ${active ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StarRatingDisplay({ value, size = 'sm' }: Pick<StarRatingProps, 'value' | 'size'>) {
  return <StarRating value={Number(value) || 0} size={size} disabled />;
}
