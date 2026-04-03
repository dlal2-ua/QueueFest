import { useState, useEffect } from 'react';
import { BottomNav } from '../components/BottomNav';
import { OfferCard } from '../components/OfferCard';
import { RoyaltiesPanel } from '../components/RoyaltiesPanel';
import { useCart } from '../context/CartContext';
import { getPuestosByFestival, getPromociones } from '../api';
import { Loader2, Tag, Coins } from 'lucide-react';

export function OffersScreen() {
  const { addItem } = useCart();

  const [allOffers, setAllOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'offers' | 'royalties'>('offers');

  const festival = JSON.parse(sessionStorage.getItem('festivalSeleccionado') || '{}');

  useEffect(() => {
    const load = async () => {
      if (!festival?.id) {
        setLoading(false);
        return;
      }

      try {
        const puestos = await getPuestosByFestival(festival.id);
        if (!Array.isArray(puestos) || puestos.length === 0) {
          setLoading(false);
          return;
        }

        const resultados = await Promise.allSettled(
          puestos.map((p: any) => getPromociones(p.id).then((ofertas: any[]) => ({ puesto: p, ofertas })))
        );

        const combinadas: any[] = [];
        resultados.forEach((result) => {
          if (result.status === 'fulfilled') {
            const { puesto, ofertas } = result.value;
            if (Array.isArray(ofertas)) {
              ofertas
                .filter((offer: any) => offer.activa)
                .forEach((offer: any) => {
                  combinadas.push({
                    id: offer.id,
                    title: offer.titulo,
                    description: offer.descripcion,
                    price: offer.precio_promo,
                    discount: 'PROMO',
                    originalPrice: undefined,
                    vendorId: String(puesto.id),
                    vendorName: puesto.nombre,
                    vendorType: puesto.tipo === 'foodtruck' ? 'food-truck' : 'bar'
                  });
                });
            }
          }
        });

        setAllOffers(combinadas);
      } catch (err) {
        console.error('Error cargando ofertas:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [festival?.id]);

  const handleAddOffer = (offer: any) => {
    return addItem({
      id: offer.id,
      vendorId: offer.vendorId,
      vendorName: offer.vendorName,
      vendorType: offer.vendorType,
      name: offer.title,
      description: offer.description,
      price: offer.price,
      quantity: 1
    });
  };

  const renderOffers = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-gray-400" />
        </div>
      );
    }

    if (allOffers.length > 0) {
      return allOffers.map((offer) => (
        <div key={offer.id} className="space-y-1">
          <div className="flex items-center gap-1.5 px-1">
            <Tag className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-500 font-medium">{offer.vendorName}</p>
          </div>
          <OfferCard
            title={offer.title}
            description={offer.description}
            discount={offer.discount}
            originalPrice={offer.originalPrice}
            price={offer.price}
            onAdd={() => handleAddOffer(offer)}
          />
        </div>
      ));
    }

    return (
      <div className="text-center py-16 flex flex-col items-center gap-3">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
          <Tag className="w-7 h-7 text-gray-300" />
        </div>
        <p className="text-gray-500 text-sm">
          {festival?.id
            ? 'No hay ofertas disponibles en este festival.'
            : 'Selecciona un festival para ver sus ofertas.'}
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="p-4">
          <h1 className="text-2xl font-bold">Ofertas y Royalties</h1>
          <p className="text-gray-500 text-sm">
            {selectedTab === 'offers'
              ? festival?.nombre
                ? `${festival.nombre} - Promociones y combos del momento`
                : 'Promociones y combos del momento'
              : 'Consulta tu saldo, tu QR y la actividad de loyalty'}
          </p>
        </div>

        <div className="px-4 pb-4">
          <div className="bg-gray-100 rounded-2xl p-1 grid grid-cols-2 gap-1">
            <button
              onClick={() => setSelectedTab('offers')}
              className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                selectedTab === 'offers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Ofertas
            </button>
            <button
              onClick={() => setSelectedTab('royalties')}
              className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                selectedTab === 'royalties' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Royalties
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {selectedTab === 'offers' ? (
          renderOffers()
        ) : (
          <>
            <div className="flex items-center gap-2 px-1 text-sm text-gray-500">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>Este QR sirve para identificar al usuario en compras presenciales.</span>
            </div>
            <RoyaltiesPanel />
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
