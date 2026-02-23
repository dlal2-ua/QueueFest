import { useParams, useNavigate } from '../utils/navigation';
import { ChevronLeft } from 'lucide-react';
import { bars } from '../data/mockData';
import { OfferCard } from '../components/OfferCard';
import { useCart } from '../context/CartContext';

export function BarOffersScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const bar = bars.find(b => b.id === id);

  if (!bar) {
    return <div>Bar not found</div>;
  }

  const handleAddOffer = (offer: any) => {
    addItem({
      id: offer.id,
      vendorId: bar.id,
      vendorName: bar.name,
      vendorType: 'bar',
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
            <p className="text-sm text-gray-600">{bar.name}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {bar.offers.map((offer) => (
          <OfferCard
            key={offer.id}
            title={offer.title}
            description={offer.description}
            discount={offer.discount}
            originalPrice={offer.originalPrice}
            price={offer.price}
            onAdd={() => handleAddOffer(offer)}
          />
        ))}
      </div>
    </div>
  );
}
