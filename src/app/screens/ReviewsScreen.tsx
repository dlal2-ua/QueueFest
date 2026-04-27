import { ChevronLeft } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { ReviewsList } from '../components/ReviewsList';
import { useLocation, useNavigate } from '../utils/navigation';

export function ReviewsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isProfileReviews = location.pathname === '/profile/reviews';
  const rawScope = params.get('scope') || (isProfileReviews ? 'mine' : 'puesto');
  const scope = rawScope === 'product' || rawScope === 'puesto' || rawScope === 'pedido' || rawScope === 'mine'
    ? rawScope
    : 'puesto';
  const id = params.get('id') || undefined;
  const title = isProfileReviews
    ? 'Mis resenas'
    : params.get('title') || 'Resenas';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 transition-colors hover:bg-gray-100">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500">
              {isProfileReviews ? 'Todas las resenas que has publicado' : 'Opiniones verificadas de pedidos reales'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <ReviewsList
          scope={scope}
          id={id}
          title={title}
          subtitle={isProfileReviews ? 'Tambien veras los royalties que ganaste en cada una.' : undefined}
          limit={50}
        />
      </div>

      <BottomNav />
    </div>
  );
}
