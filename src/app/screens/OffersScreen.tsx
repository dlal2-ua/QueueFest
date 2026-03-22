import { useState, useEffect } from 'react';
import { BottomNav } from '../components/BottomNav';
import { OfferCard } from '../components/OfferCard';
import { useCart } from '../context/CartContext';
import { getPuestosByFestival, getPromociones } from '../api';
import { Loader2, Tag } from 'lucide-react';

export function OffersScreen() {
  const { addItem } = useCart();

  const [allOffers, setAllOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Festival elegido al entrar a la app
  const festival = JSON.parse(sessionStorage.getItem('festivalSeleccionado') || '{}');

  useEffect(() => {
    const load = async () => {
      if (!festival?.id) { setLoading(false); return; }

      try {
        // 1. Puestos del festival
        const puestos = await getPuestosByFestival(festival.id);
        if (!Array.isArray(puestos) || puestos.length === 0) { setLoading(false); return; }

        // 2. Ofertas de cada puesto en paralelo
        const resultados = await Promise.allSettled(
          puestos.map((p: any) => getPromociones(p.id).then((ofertas: any[]) => ({ puesto: p, ofertas })))
        );

        const combinadas: any[] = [];
        resultados.forEach(r => {
          if (r.status === 'fulfilled') {
            const { puesto, ofertas } = r.value;
            if (Array.isArray(ofertas)) {
              ofertas
                .filter((o: any) => o.activa)
                .forEach((o: any) => {
                  combinadas.push({
                    id: o.id,
                    title: o.titulo,
                    description: o.descripcion,
                    price: o.precio_promo,
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
    addItem({
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

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="p-4">
          <h1 className="text-2xl font-bold">Ofertas Especiales</h1>
          <p className="text-gray-500 text-sm">
            {festival?.nombre ? `${festival.nombre} · ` : ''}Promociones y combos del momento
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-gray-400" />
          </div>
        ) : allOffers.length > 0 ? (
          allOffers.map(offer => (
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
          ))
        ) : (
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
        )}
      </div>

      <BottomNav />
    </div>
  );
}
