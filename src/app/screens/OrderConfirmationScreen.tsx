import { useNavigate } from '../utils/navigation';
import { CheckCircle, Clock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import { PickupQR } from '../components/PickupQR';

export function OrderConfirmationScreen() {
  const navigate = useNavigate();
  const { clearCart } = useCart();

  // Extract the real order ID from the URL: ?order=123
  const params = new URLSearchParams(window.location.search);
  const orderNumber = params.get('order') || 'Desconocido';

  useEffect(() => {
    // We clear the cart here instead of relying on handleContinue
    clearCart();
  }, [clearCart]);

  const handleContinue = () => {
    navigate('/home');
  };

  const handleTrackOrder = () => {
    // Navigate directly to the tracking screen with the real order ID 
    // It will fetch the real data from the backend.
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

          {/* QR real de recogida */}
          {orderNumber !== 'Desconocido' && (
            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
              <PickupQR orderId={Number(orderNumber)} />
            </div>
          )}

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
