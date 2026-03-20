import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '../utils/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { foodTrucks } from '../data/mockData';
import { OfferCard } from '../components/OfferCard';
import { useCart } from '../context/CartContext';
import { getPromociones } from '../api';

export function FoodTruckOffersScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const truck = foodTrucks.find(t => t.id === id);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const numericId = !isNaN(Number(id)) ? Number(id) : undefined;
        const data = await getPromociones(numericId);
        if (Array.isArray(data) && data.length > 0) {
          setOffers(data.map(p => ({
            id: p.id,
            title: p.titulo,
            description: p.descripcion,
            price: p.precio_promo,
            discount: 'PROMO',
            originalPrice: undefined
          })));
        } else {
          setOffers(truck?.offers || []);
        }
      } catch (error) {
        console.error('Failed to fetch offers:', error);
        setOffers(truck?.offers || []);
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, [id, truck]);

  const handleAddOffer = (offer: any) => {
    addItem({
      id: offer.id,
      vendorId: id,
      vendorName: truck?.name || `Vendor ${id}`,
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
            <h1 className="text-xl font-bold">Special Offers</h1>
            <p className="text-sm text-gray-600">{truck?.name || `Food Truck #${id}`}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-500" /></div>
        ) : offers.length > 0 ? (
          offers.map((offer) => (
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
          <p className="text-gray-500 text-center py-8">No offers available at the moment</p>
        )}
      </div>
    </div>
  );
}
