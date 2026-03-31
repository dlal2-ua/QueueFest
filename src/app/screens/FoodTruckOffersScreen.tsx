import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '../utils/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { OfferCard } from '../components/OfferCard';
import { useCart } from '../context/CartContext';
import { getPromociones, getPuesto } from '../api';

export function FoodTruckOffersScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [offers, setOffers] = useState<any[]>([]);
  const [truckNombre, setTruckNombre] = useState<string>(`Food Truck #${id}`);
  const [loading, setLoading] = useState(true);

  // Festival elegido en la pantalla anterior
  const festival = JSON.parse(sessionStorage.getItem('festivalSeleccionado') || '{}');

  useEffect(() => {
    const load = async () => {
      try {
        const puesto = await getPuesto(Number(id));
        if (puesto?.tipo === 'foodtruck') {
          if (!festival?.id || Number(puesto.festival_id) === Number(festival.id)) {
            setTruckNombre(puesto.nombre);
          }
        }

        // Ofertas del puesto
        const data = await getPromociones(Number(id));
        if (Array.isArray(data)) {
          setOffers(data
            .filter((p: any) => p.activa)
            .map((p: any) => ({
              id: p.id,
              title: p.titulo,
              description: p.descripcion,
              price: p.precio_promo,
              discount: 'PROMO',
              originalPrice: undefined
            }))
          );
        }
      } catch (err) {
        console.error('Error cargando ofertas de food truck:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, festival?.id]);

  const handleAddOffer = (offer: any) => {
    return addItem({
      id: offer.id,
      vendorId: String(id),
      vendorName: truckNombre,
      vendorType: 'food-truck',
      name: offer.title,
      description: offer.description,
      price: offer.price,
      quantity: 1
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="p-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Ofertas Especiales</h1>
            <p className="text-sm text-gray-500">{truckNombre}{festival?.nombre ? ` · ${festival.nombre}` : ''}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : offers.length > 0 ? (
          offers.map(offer => (
            <OfferCard
              key={offer.id}
              title={offer.title}
              description={offer.description}
              discount={offer.discount}
              originalPrice={offer.originalPrice}
              price={offer.price}
              onAdd={() => handleAddOffer(offer)}
            />
          ))
        ) : (
          <p className="text-gray-500 text-center py-8">No hay ofertas disponibles en este momento.</p>
        )}
      </div>
    </div>
  );
}
