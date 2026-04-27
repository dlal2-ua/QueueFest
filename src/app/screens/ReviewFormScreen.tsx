import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ChevronLeft, Coins, Loader2, MessageSquare, PackageCheck, Send } from 'lucide-react';
import { toast } from 'sonner';
import { buildImageUrl, createReview, getReviewContext, type ReviewContext } from '../api';
import { StarRating } from '../components/StarRating';
import { useLanguage } from '../context/LanguageContext';
import { useLocation, useNavigate } from '../utils/navigation';

interface ProductReviewDraft {
  estrellas: number;
  comentario: string;
}

export function ReviewFormScreen() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const pedidoId = Number(searchParams.get('pedidoId') || searchParams.get('pedido_id'));
  const highlightedProductId = Number(searchParams.get('productId') || searchParams.get('producto_id') || 0);

  const [context, setContext] = useState<ReviewContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generalStars, setGeneralStars] = useState(0);
  const [comment, setComment] = useState('');
  const [serviceStars, setServiceStars] = useState(0);
  const [staffStars, setStaffStars] = useState(0);
  const [speedStars, setSpeedStars] = useState(0);
  const [productReviews, setProductReviews] = useState<Record<number, ProductReviewDraft>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!pedidoId) {
        setLoading(false);
        return;
      }

      try {
        const data = await getReviewContext(pedidoId);
        if (cancelled) return;
        setContext(data);

        if (highlightedProductId && data.productos.some((product) => Number(product.producto_id) === highlightedProductId)) {
          setProductReviews({
            [highlightedProductId]: { estrellas: 0, comentario: '' }
          });
        }
      } catch (error: any) {
        toast.error(error.message || t('reviews.orderNotFoundBody'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [highlightedProductId, pedidoId]);

  const selectedProductReviews = Object.entries(productReviews)
    .map(([productId, draft]) => ({ productId: Number(productId), ...draft }))
    .filter((draft) => draft.estrellas > 0);

  const extraReviewActions = [
    comment.trim().length >= 10,
    serviceStars > 0 && staffStars > 0 && speedStars > 0
  ].filter(Boolean).length;
  const paidProductReviewActions = Math.min(selectedProductReviews.length, Math.max(0, 5 - extraReviewActions));
  const estimatedPoints = 50
    + extraReviewActions * 20
    + paidProductReviewActions * 20;

  const updateProductReview = (productId: number, patch: Partial<ProductReviewDraft>) => {
    setProductReviews((current) => ({
      ...current,
      [productId]: {
        estrellas: current[productId]?.estrellas || 0,
        comentario: current[productId]?.comentario || '',
        ...patch
      }
    }));
  };

  const clearProductReview = (productId: number) => {
    setProductReviews((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!context || !pedidoId) return;

    if (generalStars === 0) {
      toast.error(t('reviews.requiredGeneral'));
      return;
    }

    setSaving(true);
    try {
      const result = await createReview({
        pedido_id: pedidoId,
        estrellas_general: generalStars,
        comentario: comment.trim() || null,
        estrellas_servicio: serviceStars || null,
        estrellas_personal: staffStars || null,
        estrellas_rapidez: speedStars || null,
        productos: selectedProductReviews.map((draft) => ({
          producto_id: draft.productId,
          estrellas: draft.estrellas,
          comentario: draft.comentario.trim() || null
        }))
      });

      toast.success(`${t('reviews.savedToast')} ${t('loyalty.pointsEarned').replace('{points}', String(result.puntos_sumados))}`);
      navigate('/profile/reviews');
    } catch (error: any) {
      toast.error(error.message || t('reviews.orderNotFoundBody'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!context || !pedidoId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('reviews.orderNotFoundTitle')}</h1>
        <p className="mt-2 text-sm text-gray-500">{t('reviews.orderNotFoundBody')}</p>
        <button onClick={() => navigate('/profile/orders')} className="mt-6 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white">
          {t('common.back')}
        </button>
      </div>
    );
  }

  if (!context.can_review) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('reviews.alreadyReviewedTitle')}</h1>
        <p className="mt-2 text-sm text-gray-500">{t('reviews.alreadyReviewedBody')}</p>
        <button onClick={() => navigate('/profile/reviews')} className="mt-6 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white">
          {t('reviews.viewMyReviews')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="min-h-screen bg-gray-50 pb-10">
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 px-4 py-4">
          <button type="button" onClick={() => navigate(-1)} className="rounded-full p-2 transition-colors hover:bg-gray-100">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('reviews.writeTitle')}</h1>
            <p className="text-sm text-gray-500">{t('orders.orderNumber')}{context.pedido.id} · {context.pedido.puesto_nombre}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t('reviews.generalSectionTitle')}</h2>
              <p className="text-sm text-gray-500">{t('reviews.generalSectionSubtitle')}</p>
            </div>
          </div>

          <StarRating value={generalStars} onChange={setGeneralStars} label={t('reviews.generalStars')} />

          <label className="mt-5 block text-sm font-semibold text-gray-800">{t('reviews.comment')}</label>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            placeholder={t('reviews.commentPlaceholder')}
            className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:bg-white"
          />
          <p className="mt-2 text-xs text-gray-500">{t('reviews.commentBonus')}</p>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">{t('reviews.optionalConceptsTitle')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('reviews.optionalConceptsSubtitle')}</p>
          <div className="mt-4 grid grid-cols-1 gap-4">
            <StarRating value={serviceStars} onChange={setServiceStars} label={t('reviews.service')} />
            <StarRating value={staffStars} onChange={setStaffStars} label={t('reviews.staff')} />
            <StarRating value={speedStars} onChange={setSpeedStars} label={t('reviews.speed')} />
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t('reviews.orderProductsTitle')}</h2>
              <p className="text-sm text-gray-500">{t('reviews.orderProductsSubtitle')}</p>
            </div>
          </div>

          <div className="space-y-3">
            {context.productos.map((product) => {
              const draft = productReviews[product.producto_id];
              return (
                <div key={product.producto_id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-start gap-3">
                    {product.foto_url && (
                      <img src={buildImageUrl(product.foto_url)} alt={product.nombre} className="h-14 w-14 rounded-xl object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">{product.nombre}</p>
                      <p className="text-xs text-gray-500">{t('reviews.quantity')}: {product.cantidad}</p>
                    </div>
                    {draft ? (
                      <button type="button" onClick={() => clearProductReview(product.producto_id)} className="text-xs font-semibold text-red-600">
                        {t('common.remove')}
                      </button>
                    ) : (
                      <button type="button" onClick={() => updateProductReview(product.producto_id, {})} className="text-xs font-semibold text-sky-700">
                        {t('reviews.rate')}
                      </button>
                    )}
                  </div>

                  {draft && (
                    <div className="mt-4 space-y-3">
                      <StarRating
                        value={draft.estrellas}
                        onChange={(value) => updateProductReview(product.producto_id, { estrellas: value })}
                        label={t('reviews.productStars')}
                      />
                      <textarea
                        value={draft.comentario}
                        onChange={(event) => updateProductReview(product.producto_id, { comentario: event.target.value })}
                        rows={2}
                        placeholder={t('reviews.productCommentPlaceholder')}
                        className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-5 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <Coins className="h-7 w-7" />
            <div>
              <p className="text-sm text-white/80">{t('reviews.estimatedRoyalties')}</p>
              <p className="text-3xl font-black">+{estimatedPoints}</p>
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t('reviews.publish')}
        </button>
      </div>
    </form>
  );
}
