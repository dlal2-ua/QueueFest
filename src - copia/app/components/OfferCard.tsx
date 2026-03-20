import { Tag, Plus } from 'lucide-react';
import { formatPrice } from '../utils/formatPrice';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';

interface OfferCardProps {
  title: string;
  description: string;
  discount?: string;
  originalPrice?: number;
  price: number;
  onAdd: () => void;
}

export function OfferCard({ title, description, discount, originalPrice, price, onAdd }: OfferCardProps) {
  const { t } = useLanguage();

  const handleAdd = () => {
    onAdd();
    toast.success(t('cart.addedToCart'), {
      duration: 2000,
    });
  };

  return (
    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <Tag className="w-4 h-4 text-white" />
          </div>
          {discount && (
            <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
              {discount}
            </span>
          )}
        </div>
      </div>
      <h4 className="font-semibold mb-1">{title}</h4>
      <p className="text-sm text-gray-700 mb-3">{description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {originalPrice && (
            <span className="text-sm text-gray-500 line-through">{formatPrice(originalPrice)}</span>
          )}
          <span className="text-lg font-bold text-green-700">{formatPrice(price)}</span>
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-green-500 text-white rounded-full text-sm font-medium flex items-center gap-1 hover:bg-green-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('common.add')}
        </button>
      </div>
    </div>
  );
}
