import { BottomNav } from '../components/BottomNav';
import { OfferCard } from '../components/OfferCard';
import { foodTrucks, bars } from '../data/mockData';
import { useCart } from '../context/CartContext';

export function OffersScreen() {
  const { addItem } = useCart();
  const allOffers = [
    ...foodTrucks.flatMap(truck => 
      truck.offers.map(offer => ({
        ...offer,
        vendorId: truck.id,
        vendorName: truck.name,
        vendorType: 'food-truck' as const
      }))
    ),
    ...bars.flatMap(bar => 
      bar.offers.map(offer => ({
        ...offer,
        vendorId: bar.id,
        vendorName: bar.name,
        vendorType: 'bar' as const
      }))
    )
  ];

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
          <h1 className="text-2xl font-bold">Special Offers</h1>
          <p className="text-gray-600 text-sm">Limited time deals and combos</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {allOffers.length > 0 ? (
          allOffers.map((offer) => (
            <div key={offer.id} className="space-y-2">
              <p className="text-sm text-gray-600 font-medium">{offer.vendorName}</p>
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
          <div className="text-center py-12">
            <p className="text-gray-500">No offers available at the moment</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
