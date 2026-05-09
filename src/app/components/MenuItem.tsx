import { useState, useEffect } from 'react';
import { Eye, Plus, Heart } from 'lucide-react';
import { formatPrice } from '../utils/formatPrice';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import type { AddItemResult } from '../context/CartContext';
import { checkFavorito, addFavorito, removeFavorito } from '../api';

interface MenuItemProps {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  priceCaption?: string;
  cartPayload?: Record<string, any>;
  image?: string;
  disabled?: boolean;
  stock?: number;
  onView?: () => void;
  onAdd: (item: any) => AddItemResult;
}

export function MenuItem({ id, name, description, price, originalPrice, badge, priceCaption, cartPayload, image, disabled, stock = 100, onView, onAdd }: MenuItemProps) {
  const { t } = useLanguage();
  const isOutOfStock = stock === 0;
  const isDisabled = disabled || isOutOfStock;
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const loadFavoriteStatus = async () => {
      try {
        const result = await checkFavorito(Number(id));
        setIsFavorite(result.isFavorite);
      } catch (error) {
        console.error('Error al verificar favorito:', error);
        setIsFavorite(false);
      }
    };
    loadFavoriteStatus();
  }, [id]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isFavorite) {
        await removeFavorito(Number(id));
        setIsFavorite(false);
        toast.success('Eliminado de favoritos');
      } else {
        await addFavorito(Number(id));
        setIsFavorite(true);
        toast.success('Añadido a favoritos');
      }
    } catch (error) {
      console.error('Error al actualizar favorito:', error);
      toast.error('Error al actualizar favorito');
    }
  };

  const handleAdd = () => {
    if (isDisabled) return;
    const result = onAdd({ id, name, description, price, quantity: 1, ...(cartPayload || {}) });
    if (!result.ok) {
      toast.error('Solo puedes pedir de un puesto cada vez');
      return;
    }
    toast.success(`${name} - ${t('cart.addedToCart')}`, {
      duration: 2000,
    });
  };

  return (
    <div className={`flex items-center gap-3 py-4 border-b border-gray-100 last:border-b-0 ${isDisabled ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className={`font-medium ${isOutOfStock ? 'text-gray-500' : ''}`}>{name}</h4>
          {badge && !isOutOfStock && (
            <span className="text-xs font-semibold px-2 py-0.5 bg-green-100 text-green-700 rounded-full uppercase">
              {badge}
            </span>
          )}
          {isOutOfStock && (
            <span className="text-xs font-semibold px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full uppercase">
              Agotado
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mb-2">{description}</p>
        <div>
          {originalPrice && originalPrice > price && !isOutOfStock && (
            <p className="text-xs text-gray-400 line-through">{formatPrice(originalPrice)}</p>
          )}
          <p className={`font-semibold ${isOutOfStock ? 'text-gray-400 line-through' : ''}`}>{formatPrice(price)}</p>
          {priceCaption && !isOutOfStock && (
            <p className="text-xs text-gray-500">{priceCaption}</p>
          )}
        </div>
      </div>
      {image && (
        <img src={image} alt={name} className="w-20 h-20 rounded-lg object-cover" />
      )}
      <div className="flex items-center gap-2 self-end">
        <button
          onClick={handleToggleFavorite}
          className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-colors ${
            isFavorite
              ? 'bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100'
              : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-rose-500'
          }`}
          title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
        </button>
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
          disabled={isDisabled}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
            isDisabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800'
          }`}
          title={isOutOfStock ? 'Agotado' : 'Anadir al carrito'}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
