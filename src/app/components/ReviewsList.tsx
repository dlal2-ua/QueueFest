import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Loader2, MessageSquare, Star } from 'lucide-react';
import { useNavigate } from '../utils/navigation';
import { getReviews, type ReviewRecord } from '../api';
import { StarRatingDisplay } from './StarRating';

type ReviewScope = 'mine' | 'puesto' | 'product' | 'pedido';

interface ReviewsListProps {
  scope: ReviewScope;
  id?: string | number;
  title?: string;
  subtitle?: string;
  limit?: number;
  compact?: boolean;
  showViewAll?: boolean;
}

export function ReviewsList({ scope, id, title = 'Resenas', subtitle, limit = 5, compact = false, showViewAll = false }: ReviewsListProps) {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const params =
          scope === 'mine'
            ? { mine: true, limit }
            : scope === 'puesto'
              ? { puesto_id: id, limit }
              : scope === 'product'
                ? { producto_id: id, limit }
                : { pedido_id: id, limit };

        const data = await getReviews(params);
        if (!cancelled) setReviews(data);
      } catch (error) {
        console.error('Error cargando resenas:', error);
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, limit, scope]);

  const average = useMemo(() => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + Number(review.estrellas_general || 0), 0);
    return Number((total / reviews.length).toFixed(1));
  }, [reviews]);

  const viewAllHref = scope === 'mine'
    ? '/profile/reviews'
    : `/reviews?scope=${scope}&id=${id || ''}&title=${encodeURIComponent(title)}`;

  return (
    <section className={`${compact ? '' : 'rounded-3xl bg-white p-5 shadow-sm'}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {reviews.length > 0 && (
          <div className="rounded-2xl bg-amber-50 px-3 py-2 text-right">
            <div className="flex items-center gap-1 text-amber-700">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-bold">{average}</span>
            </div>
            <p className="text-[11px] text-amber-700">{reviews.length} resenas</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
          Todavia no hay resenas para mostrar.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{review.usuario_nombre}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(review.creado_en).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <StarRatingDisplay value={review.estrellas_general} />
              </div>

              {review.comentario && (
                <p className="mt-3 text-sm leading-6 text-gray-700">{review.comentario}</p>
              )}

              {(review.estrellas_servicio || review.estrellas_personal || review.estrellas_rapidez) && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-600">
                  <span>Servicio {review.estrellas_servicio || '-'}/5</span>
                  <span>Personal {review.estrellas_personal || '-'}/5</span>
                  <span>Rapidez {review.estrellas_rapidez || '-'}/5</span>
                </div>
              )}

              {review.productos?.length > 0 && (
                <div className="mt-3 space-y-2 rounded-2xl bg-gray-50 p-3">
                  {review.productos.map((product) => (
                    <div key={product.id} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{product.producto_nombre}</p>
                        {product.comentario && <p className="text-xs text-gray-500">{product.comentario}</p>}
                      </div>
                      <StarRatingDisplay value={product.estrellas} />
                    </div>
                  ))}
                </div>
              )}

              {scope === 'mine' && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <MessageSquare className="h-3.5 w-3.5" />
                  +{review.puntos_sumados} royalties
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {showViewAll && reviews.length > 0 && (
        <button
          onClick={() => navigate(viewAllHref)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50"
        >
          Ver todas
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </section>
  );
}
