import { Clock } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { useNavigate } from '../utils/navigation';

type VendorType = 'food-truck' | 'bar';

interface VendorCardProps {
  id: string;
  image: string;
  name: string;
  cuisine: string;
  waitTime: number;
  hasOffer?: boolean;
  type: VendorType;
}

export function VendorCard({ id, image, name, cuisine, waitTime, hasOffer, type }: VendorCardProps) {
  const navigate = useNavigate();
  const queueStatus = waitTime < 10 ? 'fast' : waitTime > 25 ? 'saturated' : null;

  const handleClick = () => {
    navigate(type === 'food-truck' ? `/food-truck/${id}` : `/bar/${id}`);
  };

  return (
    <div 
      className="bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      <div className="relative h-40">
        <img src={image} alt={name} className="w-full h-full object-cover" />
        <div className="absolute top-2 left-2 flex gap-2">
          {hasOffer && <StatusBadge type="offer" />}
          {queueStatus && <StatusBadge type={queueStatus} />}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-1">{name}</h3>
        <p className="text-gray-600 text-sm mb-3">{cuisine}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-gray-700">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{waitTime} min</span>
          </div>
          <button className="px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
            View Menu
          </button>
        </div>
      </div>
    </div>
  );
}
