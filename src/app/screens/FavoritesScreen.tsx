import { useState, useEffect } from 'react';
import { ChevronLeft, Heart, Clock, MapPin } from 'lucide-react';
import { useNavigate } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';
import { getFavoritos, removeFavorito, FavoriteProduct, buildImageUrl } from '../api';

const ITEMS_PER_PAGE = 20;

export function FavoritesScreen() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [displayedFavorites, setDisplayedFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showingCount, setShowingCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    setDisplayedFavorites(favorites.slice(0, showingCount));
  }, [favorites, showingCount]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const data = await getFavoritos();
      setFavorites(data);
    } catch (error) {
      console.error('Error al cargar favoritos:', error);
      // Si el error es por tabla inexistente, no mostrar error toast
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('favoritos_productos')) {
        toast.error(t('favorites.error_loading') || 'Error al cargar favoritos');
      }
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setShowingCount(prev => prev + ITEMS_PER_PAGE);
  };

  const handleRemove = async (producto_id: number) => {
    try {
      await removeFavorito(producto_id);
      setFavorites(prev => prev.filter(fav => fav.producto_id !== producto_id));
      toast.success(t('favorites.removed') || 'Producto eliminado de favoritos');
    } catch (error) {
      console.error('Error al eliminar favorito:', error);
      toast.error(t('favorites.error_removing') || 'Error al eliminar favorito');
    }
  };

  const handleProductClick = (favorite: FavoriteProduct) => {
    navigate(`/product/${favorite.producto_id}`);
  };

  const getPrecioFinal = (producto: FavoriteProduct) => {
    return Number(producto.precio_dinamico ?? producto.precio);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <h1 className="text-xl font-semibold">{t('favorites.title') || 'Favoritos'}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">{t('common.loading') || 'Cargando...'}</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('favorites.empty') || 'No tienes productos favoritos'}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
            >
              {t('favorites.explore') || 'Explorar productos'}
            </button>
          </div>
        ) : (
          <>
          {displayedFavorites.map((favorite) => (
            <div
              key={favorite.id}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex gap-4 p-4">
                <div
                  onClick={() => handleProductClick(favorite)}
                  className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden cursor-pointer"
                >
                  <img
                    src={buildImageUrl(favorite.foto_url)}
                    alt={favorite.nombre}
                    className="w-full h-full object-cover"
                  />
                  {favorite.stock === 0 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white text-xs font-bold px-2 py-1 bg-red-600 rounded">
                        {t('product.out_of_stock') || 'Agotado'}
                      </span>
                    </div>
                  )}
                </div>

                <div
                  onClick={() => handleProductClick(favorite)}
                  className="flex-1 cursor-pointer"
                >
                  <h3 className="font-semibold text-lg mb-1">{favorite.nombre}</h3>
                  {favorite.descripcion && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{favorite.descripcion}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span>{favorite.puesto_nombre}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">
                      {favorite.puesto_tipo === 'foodtruck' ? 'Food Truck' : 'Barra'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-purple-600">
                      {getPrecioFinal(favorite).toFixed(2)}€
                    </span>
                    {favorite.precio_dinamico && favorite.precio_dinamico !== favorite.precio && (
                      <span className="text-sm text-gray-400 line-through">
                        {Number(favorite.precio).toFixed(2)}€
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleRemove(favorite.producto_id)}
                  className="self-start p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                </button>
              </div>
            </div>
          ))}

          {/* Botón Cargar más */}
          {showingCount < favorites.length && (
            <button
              onClick={loadMore}
              className="w-full mt-4 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Cargar más ({favorites.length - showingCount} restantes)
            </button>
          )}
          </>
        )}
      </div>
    </div>
  );
}
