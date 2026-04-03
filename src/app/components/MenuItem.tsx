import { Eye, Plus } from 'lucide-react';
import { formatPrice } from '../utils/formatPrice';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import type { AddItemResult } from '../context/CartContext';

interface MenuItemProps {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  disabled?: boolean;
  onView?: () => void;
  onAdd: (item: any) => AddItemResult;
}

export function MenuItem({ id, name, description, price, image, disabled, onView, onAdd }: MenuItemProps) {
  const { t } = useLanguage();

  const handleAdd = () => {
    if (disabled) return;
    const result = onAdd({ id, name, description, price, quantity: 1 });
    if (!result.ok) {
      toast.error('Solo puedes pedir de un puesto cada vez');
      return;
    }
    toast.success(`${name} - ${t('cart.addedToCart')}`, {
      duration: 2000,
    });
  };

  return (
    <div className={`flex items-center gap-3 py-4 border-b border-gray-100 last:border-b-0 ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium mb-1">{name}</h4>
        <p className="text-sm text-gray-600 mb-2">{description}</p>
        <p className="font-semibold">{formatPrice(price)}</p>
      </div>
      {image && (
        <img src={image} alt={name} className="w-20 h-20 rounded-lg object-cover" />
      )}
      <div className="flex items-center gap-2 self-end">
        {onView && (
          <button
            onClick={onView}
            className="w-10 h-10 rounded-2xl border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors flex items-center justify-center"
            title="Ver detalle"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={handleAdd}
          disabled={disabled}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
            disabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800'
          }`}
          title="Anadir al carrito"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
