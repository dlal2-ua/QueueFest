import { useState } from 'react';
import { ChevronLeft, Heart, Clock } from 'lucide-react';
import { useNavigate } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';

interface Favorite {
  id: string;
  name: string;
  cuisine: string;
  image: string;
  waitTime: number;
  type: 'food-truck' | 'bar';
}

export function FavoritesScreen() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [favorites, setFavorites] = useState<Favorite[]>(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [
      {
        id: 'taco-heaven',
        name: 'Taco Heaven',
        cuisine: 'Mexican Street Food',
        image: 'https://images.unsplash.com/photo-1615818449536-f26c1e1fe0f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWNvJTIwZm9vZCUyMHRydWNrfGVufDF8fHx8MTc3MTM0MjgyMnww&ixlib=rb-4.1.0&q=80&w=400',
        waitTime: 8,
        type: 'food-truck'
      },
      {
        id: 'cocktail-club',
        name: 'The Cocktail Club',
        cuisine: 'Craft Cocktails',
        image: 'https://images.unsplash.com/photo-1676475061702-c83659cd90ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2NrdGFpbCUyMGJhciUyMG5pZ2h0fGVufDF8fHx8MTc3MTQxNTc5NHww&ixlib=rb-4.1.0&q=80&w=400',
        waitTime: 12,
        type: 'bar'
      }
    ];
  });

  const handleRemove = (id: string) => {
    const updated = favorites.filter(fav => fav.id !== id);
    setFavorites(updated);
    localStorage.setItem('favorites', JSON.stringify(updated));
    toast.success(t('favorites.removed'));
  };

  const handleCardClick = (favorite: Favorite) => {
    const path = favorite.type === 'food-truck' 
      ? `/food-truck/${favorite.id}` 
      : `/bar/${favorite.id}`;
    navigate(path);
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
          <h1 className="text-xl font-semibold">{t('favorites.title')}</h1>
        </div>
      </div>

      {/* Favorites List */}
      <div className="p-4 space-y-3">
        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('favorites.empty')}</p>
          </div>
        ) : (
          favorites.map((favorite) => (
            <div
              key={favorite.id}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex gap-4 p-4">
                <div 
                  onClick={() => handleCardClick(favorite)}
                  className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden cursor-pointer"
                >
                  <img
                    src={favorite.image}
                    alt={favorite.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div 
                  onClick={() => handleCardClick(favorite)}
                  className="flex-1 cursor-pointer"
                >
                  <h3 className="font-semibold text-lg mb-1">{favorite.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{favorite.cuisine}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{favorite.waitTime} min</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRemove(favorite.id)}
                  className="self-start p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
