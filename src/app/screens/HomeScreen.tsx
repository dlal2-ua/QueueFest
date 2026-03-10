import { useState } from 'react';
import { BottomNav } from '../components/BottomNav';
import { VendorCard } from '../components/VendorCard';
import { foodTrucks, bars } from '../data/mockData';
import { Search, ChevronLeft } from 'lucide-react';
import { useNavigate } from '../utils/navigation';

export function HomeScreen() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const service = localStorage.getItem('selectedService') || 'food trucks';
  const vendors = service === 'bars' ? bars : foodTrucks;

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (('cuisine' in v ? v.cuisine : v.type).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/selection')}
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gray-100"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold capitalize m-0">{service}</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {filteredVendors.map((vendor) => (
          <VendorCard
            key={vendor.id}
            id={vendor.id}
            image={vendor.image}
            name={vendor.name}
            cuisine={'cuisine' in vendor ? vendor.cuisine : vendor.type}
            waitTime={vendor.waitTime}
            hasOffer={vendor.hasOffer}
            type={service === 'bars' ? 'bar' : 'food-truck'}
          />
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
