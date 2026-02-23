import { ShoppingBag } from 'lucide-react';
import { formatPrice } from '../utils/formatPrice';
import { useLanguage } from '../context/LanguageContext';

interface StickyBottomCTAProps {
  itemCount: number;
  total: number;
  onClick: () => void;
}

export function StickyBottomCTA({ itemCount, total, onClick }: StickyBottomCTAProps) {
  const { t } = useLanguage();

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
      <button
        onClick={onClick}
        className="w-full bg-black text-white rounded-full py-4 px-6 flex items-center justify-between font-medium hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          <span>{t('cart.title')} ({itemCount})</span>
        </div>
        <span className="font-bold">{formatPrice(total)}</span>
      </button>
    </div>
  );
}
