import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '../utils/navigation';
import { ChevronLeft, Clock, Tag, Loader2 } from 'lucide-react';
import { MenuItem } from '../components/MenuItem';
import { OfferCard } from '../components/OfferCard';
import { useCart } from '../context/CartContext';
import { StatusBadge } from '../components/StatusBadge';
import { BottomNav } from '../components/BottomNav';
import { ReviewsList } from '../components/ReviewsList';
import { useLanguage } from '../context/LanguageContext';
import { getProductos, getPuesto, buildImageUrl, getPuestoPromociones } from '../api';
import { buildPromotionOffer, getBestPromotionForProduct } from '../utils/promotions';

export function BarDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { t } = useLanguage();

  const [bar, setBar] = useState<any | null>(null);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<'menu' | 'promotions'>('menu');
  const [loading, setLoading] = useState(true);

  const festival = JSON.parse(sessionStorage.getItem('festivalSeleccionado') || '{}');

  useEffect(() => {
    const load = async () => {
      try {
        const puesto = await getPuesto(Number(id));

        if (!puesto || puesto.tipo !== 'barra') {
          setBar(null);
          setCategorias([]);
          return;
        }

        if (festival?.id && Number(puesto.festival_id) !== Number(festival.id)) {
          setBar(null);
          setCategorias([]);
          return;
        }

        setBar(puesto);

        const [productos, promociones] = await Promise.all([
          getProductos(Number(id)),
          getPuestoPromociones(Number(id))
        ]);

        const promotionsData = Array.isArray(promociones) ? promociones : [];

        if (Array.isArray(productos)) {
          const grupos: Record<string, any[]> = {};
          productos.forEach((producto: any) => {
            const bestPromotion = getBestPromotionForProduct(promotionsData, producto?.id);
            const normalizedProduct = {
              ...producto,
              nombre: producto?.nombre ?? 'Producto sin nombre',
              descripcion: producto?.descripcion ?? '',
              precio: Number(producto?.precio ?? 0),
              precio_dinamico: Number(producto?.precio_dinamico ?? 0),
              categoria: producto?.categoria || 'Menu',
              promotionOffer: bestPromotion
            };

            const categoria = normalizedProduct.categoria;
            if (!grupos[categoria]) grupos[categoria] = [];
            grupos[categoria].push(normalizedProduct);
          });
          setCategorias(
            Object.entries(grupos).map(([nombre, items]) => ({ nombre, items }))
          );
        } else {
          setCategorias([]);
        }

        setPromotions(
          promotionsData
            ? promotionsData.map((promotion: any) => buildPromotionOffer(promotion))
            : []
        );
      } catch (err) {
        console.error('Error cargando barra:', err);
        setBar(null);
        setCategorias([]);
        setPromotions([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [festival?.id, id]);

  const handleAddItem = (item: any) => {
    if (item.promotionOffer) {
      return addItem({
        id: item.promotionOffer.id,
        productId: item.promotionOffer.productId,
        promotionId: item.promotionOffer.promotionId,
        promotionType: item.promotionOffer.promotionType,
        promotionLabel: item.promotionOffer.discount,
        unitsPerPromotion: item.promotionOffer.unitsPerPromotion,
        name: item.promotionOffer.title,
        description: item.promotionOffer.description,
        price: item.promotionOffer.price,
        quantity: 1,
        vendorId: String(id),
        vendorName: bar?.nombre || `Barra #${id}`,
        vendorType: 'bar'
      });
    }

    return addItem({
      id: String(item.id),
      productId: String(item.productId || item.id),
      name: item.name,
      description: item.description,
      price: item.price,
      quantity: 1,
      vendorId: String(id),
      vendorName: bar?.nombre || `Barra #${id}`,
      vendorType: 'bar'
    });
  };

  const handleViewItem = (item: any) => {
    navigate(`/product/${item.id}?vendorId=${id}&vendorType=bar`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!bar) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50 p-6">
        <p className="text-gray-500 text-center">No se encontro esta barra en el festival actual.</p>
        <button onClick={() => navigate(-1)} className="text-sm text-red-600 font-medium">Volver</button>
      </div>
    );
  }

  const waitTime = bar.tiempo_servicio_medio ?? 0;
  const queueStatus = waitTime < 10 ? 'fast' : waitTime > 25 ? 'saturated' : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="relative h-48 bg-gradient-to-br from-purple-600 to-pink-500 flex items-end overflow-hidden">
        {bar.foto_url && (
          <img
            src={buildImageUrl(bar.foto_url)}
            alt={bar.nombre}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg z-20"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="absolute top-4 right-4 flex gap-2 z-20">
          {bar.abierto && <StatusBadge type="offer" />}
          {queueStatus && <StatusBadge type={queueStatus} />}
        </div>
        <div className="p-5 pb-6 relative z-10">
          <p className="text-white text-xs font-medium uppercase tracking-wide drop-shadow-lg">{festival?.nombre}</p>
        </div>
      </div>

      <div className="bg-white rounded-t-3xl -mt-4 relative z-10 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">{bar.nombre}</h1>
            <p className="text-gray-500 text-sm capitalize">{bar.tipo} de bebidas</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${bar.abierto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {bar.abierto ? 'Abierto' : 'Pausado'}
          </div>
        </div>

        {bar.abierto === 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 shadow-sm flex items-start gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <h3 className="font-bold text-red-800">Barra al maximo rendimiento</h3>
              <p className="text-sm mt-1">Por alta demanda, hemos pausado los pedidos. Volvemos a servir en 5-10 min.</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-gray-700 mb-6">
          <Clock className="w-5 h-5" />
          <span>{waitTime} min de espera</span>
        </div>

        <div className="mb-6 rounded-2xl bg-gray-100 p-1 grid grid-cols-2 gap-1">
          <button
            onClick={() => setSelectedTab('menu')}
            className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
              selectedTab === 'menu' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Menu
          </button>
          <button
            onClick={() => setSelectedTab('promotions')}
            className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
              selectedTab === 'promotions' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Promociones{promotions.length > 0 ? ` (${promotions.length})` : ''}
          </button>
        </div>

        {selectedTab === 'promotions' ? (
          promotions.length > 0 ? (
            <div className="space-y-4">
              {promotions.map((promotion) => (
                <OfferCard
                  key={promotion.id}
                  title={promotion.title}
                  description={promotion.description}
                  discount={promotion.discount}
                  originalPrice={promotion.originalPrice}
                  price={promotion.price}
                  priceCaption={promotion.priceCaption}
                  onAdd={() => handleAddItem({ promotionOffer: promotion })}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">
              Este negocio no tiene promociones activas ahora mismo.
            </div>
          )
        ) : (
          <>
            {categorias.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sin productos disponibles.</p>
            ) : (
              <div className="space-y-6">
                {categorias.map((cat) => (
                  <div key={cat.nombre}>
                    <h2 className="text-lg font-bold mb-3">{cat.nombre}</h2>
                    <div className="bg-white rounded-xl divide-y divide-gray-50">
                      {cat.items.map((item: any) => (
                        <MenuItem
                          key={item.id}
                          id={String(item.id)}
                          name={item.promotionOffer?.title || item.nombre}
                          description={item.promotionOffer?.description || item.descripcion}
                          price={item.promotionOffer?.price ?? (item.precio_dinamico > 0 ? item.precio_dinamico : item.precio)}
                          originalPrice={item.promotionOffer?.originalPrice}
                          badge={item.promotionOffer?.discount}
                          priceCaption={item.promotionOffer?.priceCaption}
                          cartPayload={item.promotionOffer ? { promotionOffer: item.promotionOffer } : { productId: String(item.id) }}
                          image={buildImageUrl(item.foto_url)}
                          stock={item.stock}
                          onView={() => handleViewItem(item)}
                          disabled={bar.abierto === 0}
                          onAdd={handleAddItem}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-8">
          <ReviewsList
            scope="puesto"
            id={id}
            title={t('reviews.barTitle')}
            subtitle={t('reviews.barSubtitle')}
            limit={3}
            showViewAll
          />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
