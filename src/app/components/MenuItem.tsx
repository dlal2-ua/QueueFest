import { Plus } from 'lucide-react';
import { formatPrice } from '../utils/formatPrice';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';

interface MenuItemProps {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  onAdd: (item: any) => void;
}

export function MenuItem({ id, name, description, price, image, onAdd }: MenuItemProps) {
  const { t } = useLanguage();

  const handleAdd = () => {
    onAdd({ id, name, description, price, quantity: 1 });
    toast.success(t('cart.addedToCart'), {
      duration: 2000,
    });
  };

  return (
    <div className="flex gap-3 py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex-1">
        <h4 className="font-medium mb-1">{name}</h4>
        <p className="text-sm text-gray-600 mb-2">{description}</p>
        <p className="font-semibold">{formatPrice(price)}</p>
      </div>
      {image && (
        <img src={image} alt={name} className="w-20 h-20 rounded-lg object-cover" />
      )}
      <button
        onClick={handleAdd}
        className="self-end w-8 h-8 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}
