import { useNavigate } from '../utils/navigation';
import { CheckCircle, Clock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { motion } from 'motion/react';

export function OrderConfirmationScreen() {
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const orderNumber = Math.floor(1000 + Math.random() * 9000).toFixed(0);

  const handleContinue = () => {
    clearCart();
    navigate('/home');
  };

  const handleTrackOrder = () => {
    // Save current order for tracking
    const currentOrder = {
      orderNumber: orderNumber,
      vendor: 'QueueFest Vendor',
      items: [
        { name: 'Sample Item 1', quantity: 2 },
        { name: 'Sample Item 2', quantity: 1 }
      ],
      total: 23.40,
      status: 'in-queue',
      estimatedTime: 15
    };
    localStorage.setItem('currentOrder', JSON.stringify(currentOrder));
    
    // Save order to history
    const existingOrders = localStorage.getItem('orderHistory');
    const orders = existingOrders ? JSON.parse(existingOrders) : [];
    
    const newOrder = {
      id: Date.now().toString(),
      orderNumber: orderNumber,
      date: new Date().toISOString().split('T')[0],
      vendor: 'QueueFest Vendor',
      total: 23.40,
      status: 'preparing'
    };
    
    orders.unshift(newOrder);
    localStorage.setItem('orderHistory', JSON.stringify(orders));
    
    navigate(`/track-order/${orderNumber}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl p-8 shadow-lg text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-16 h-16 text-green-600" />
          </motion.div>

          <h1 className="text-2xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-gray-600 mb-6">Your order has been placed successfully</p>

          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            <p className="text-sm text-gray-600 mb-1">Order Number</p>
            <p className="text-3xl font-bold">#{orderNumber}</p>
          </div>

          <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl mb-6">
            <Clock className="w-6 h-6 text-orange-600" />
            <div className="text-left">
              <p className="font-medium">Estimated Preparation Time</p>
              <p className="text-sm text-gray-600">15-20 minutes</p>
            </div>
          </div>

          <div className="bg-gray-100 rounded-2xl p-8 mb-6">
            <div className="w-32 h-32 mx-auto bg-white rounded-xl flex items-center justify-center">
              <div className="text-6xl">📱</div>
            </div>
            <p className="text-sm text-gray-600 mt-4">Show this QR at pickup</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleTrackOrder}
              className="w-full bg-black text-white rounded-full py-3 font-medium hover:bg-gray-800 transition-colors"
            >
              Track Order
            </button>
            <button
              onClick={handleContinue}
              className="w-full border-2 border-gray-300 rounded-full py-3 font-medium hover:bg-gray-50 transition-colors"
            >
              Continue Browsing
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
