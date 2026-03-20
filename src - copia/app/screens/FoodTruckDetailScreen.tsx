import { useState } from 'react';
import { useParams, useNavigate } from '../utils/navigation';
import { ChevronLeft, Clock, Tag } from 'lucide-react';
import { foodTrucks } from '../data/mockData';
import { MenuItem } from '../components/MenuItem';
import { StickyBottomCTA } from '../components/StickyBottomCTA';
import { useCart } from '../context/CartContext';
import { StatusBadge } from '../components/StatusBadge';

export function FoodTruckDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, getTotal, getItemCount } = useCart();
  const [localTotal, setLocalTotal] = useState(0);
  const [localCount, setLocalCount] = useState(0);

  const truck = foodTrucks.find(t => t.id === id);

  if (!truck) {
    return <div>Food truck not found</div>;
  }

  const queueStatus = truck.waitTime < 10 ? 'fast' : truck.waitTime > 25 ? 'saturated' : null;

  const handleAddItem = (item: any) => {
    addItem({
      ...item,
      vendorId: truck.id,
      vendorName: truck.name,
      vendorType: 'food-truck'
    });
    setLocalTotal(prev => prev + item.price);
    setLocalCount(prev => prev + 1);
  };

  const handleViewCart = () => {
    navigate('/cart');
  };

  const totalItems = getItemCount() + localCount;
  const totalPrice = getTotal() + localTotal;

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="relative h-64">
        <img src={truck.image} alt={truck.name} className="w-full h-full object-cover" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="absolute top-4 right-4 flex gap-2">
          {truck.hasOffer && <StatusBadge type="offer" />}
          {queueStatus && <StatusBadge type={queueStatus} />}
        </div>
      </div>

      <div className="bg-white rounded-t-3xl -mt-6 relative z-10 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">{truck.name}</h1>
            <p className="text-gray-600">{truck.cuisine}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${truck.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {truck.isOpen ? 'Open' : 'Closed'}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Clock className="w-5 h-5" />
            <span>{truck.waitTime} min wait</span>
          </div>
        </div>

        {truck.hasOffer && (
          <button
            onClick={() => navigate(`/food-truck/${id}/offers`)}
            className="w-full mb-6 p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-700">View Special Offers</span>
            </div>
            <ChevronLeft className="w-5 h-5 rotate-180 text-green-600" />
          </button>
        )}

        <div className="space-y-6">
          {truck.categories.map((category) => (
            <div key={category.name}>
              <h2 className="text-xl font-bold mb-3">{category.name}</h2>
              <div className="bg-white rounded-xl">
                {category.items.map((item) => (
                  <MenuItem
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    description={item.description}
                    price={item.price}
                    onAdd={handleAddItem}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <StickyBottomCTA
        itemCount={totalItems}
        total={totalPrice}
        onClick={handleViewCart}
      />
    </div>
  );
}
