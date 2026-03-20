import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  min?: number;
}

export function QuantitySelector({ quantity, onIncrease, onDecrease, min = 1 }: QuantitySelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onDecrease}
        disabled={quantity <= min}
        className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="font-medium w-8 text-center">{quantity}</span>
      <button
        onClick={onIncrease}
        className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center hover:bg-gray-100 transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
