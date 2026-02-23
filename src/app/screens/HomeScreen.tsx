import { useState } from 'react';
import { BottomNav } from '../components/BottomNav';
import { VendorCard } from '../components/VendorCard';
import { foodTrucks, bars } from '../data/mockData';
import { Search } from 'lucide-react';

export function HomeScreen() {
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
          <h1 className="text-2xl font-bold mb-4 capitalize">{service}</h1>
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
