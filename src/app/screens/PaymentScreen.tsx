import { useState } from 'react';
import { useNavigate } from '../utils/navigation';
import { ChevronLeft, CreditCard, Smartphone, MapPin, Clock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatPrice';
import { useLanguage } from '../context/LanguageContext';

export function PaymentScreen() {
  const navigate = useNavigate();
  const { getTotal, items } = useCart();
  const [selectedPayment, setSelectedPayment] = useState<'card' | 'apple' | 'google'>('card');
  const [pickupLocation, setPickupLocation] = useState('Main Stage Area');

  const estimatedTime = Math.max(...items.map(item => {
    // Mock wait time based on vendor
    return 15;
  }));

  const handlePay = () => {
    navigate('/confirmation');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="p-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Payment</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold mb-4">Payment Method</h2>
          <div className="space-y-3">
            <button
              onClick={() => setSelectedPayment('card')}
              className={`w-full p-4 border-2 rounded-xl flex items-center gap-3 transition-colors ${
                selectedPayment === 'card' ? 'border-black bg-gray-50' : 'border-gray-200'
              }`}
            >
              <CreditCard className="w-6 h-6" />
              <div className="text-left flex-1">
                <p className="font-medium">Credit / Debit Card</p>
                <p className="text-sm text-gray-600">Visa, Mastercard, Amex</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedPayment === 'card' ? 'border-black' : 'border-gray-300'
              }`}>
                {selectedPayment === 'card' && <div className="w-3 h-3 bg-black rounded-full" />}
              </div>
            </button>

            <button
              onClick={() => setSelectedPayment('apple')}
              className={`w-full p-4 border-2 rounded-xl flex items-center gap-3 transition-colors ${
                selectedPayment === 'apple' ? 'border-black bg-gray-50' : 'border-gray-200'
              }`}
            >
              <Smartphone className="w-6 h-6" />
              <div className="text-left flex-1">
                <p className="font-medium">Apple Pay</p>
                <p className="text-sm text-gray-600">Quick & secure</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedPayment === 'apple' ? 'border-black' : 'border-gray-300'
              }`}>
                {selectedPayment === 'apple' && <div className="w-3 h-3 bg-black rounded-full" />}
              </div>
            </button>

            <button
              onClick={() => setSelectedPayment('google')}
              className={`w-full p-4 border-2 rounded-xl flex items-center gap-3 transition-colors ${
                selectedPayment === 'google' ? 'border-black bg-gray-50' : 'border-gray-200'
              }`}
            >
              <Smartphone className="w-6 h-6" />
              <div className="text-left flex-1">
                <p className="font-medium">Google Pay</p>
                <p className="text-sm text-gray-600">Fast checkout</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedPayment === 'google' ? 'border-black' : 'border-gray-300'
              }`}>
                {selectedPayment === 'google' && <div className="w-3 h-3 bg-black rounded-full" />}
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold mb-4">Pickup Location</h2>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <MapPin className="w-5 h-5 text-gray-600" />
            <select
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              className="flex-1 bg-transparent outline-none font-medium"
            >
              <option>Main Stage Area</option>
              <option>Food Court East</option>
              <option>Food Court West</option>
              <option>VIP Section</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold mb-4">Estimated Time</h2>
          <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
            <Clock className="w-5 h-5 text-orange-600" />
            <div>
              <p className="font-medium">Ready in {estimatedTime} minutes</p>
              <p className="text-sm text-gray-600">We'll notify you when it's ready</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold mb-4">Order Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount</span>
              <span className="font-bold text-xl">{formatPrice(getTotal())}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <button
          onClick={handlePay}
          className="w-full bg-black text-white rounded-full py-4 font-medium text-lg hover:bg-gray-800 transition-colors"
        >
          Pay {formatPrice(getTotal())}
        </button>
      </div>
    </div>
  );
}
