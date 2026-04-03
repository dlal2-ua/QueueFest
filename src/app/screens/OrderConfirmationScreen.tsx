import { useNavigate } from '../utils/navigation';
import { CheckCircle, Clock, Loader2, Coins } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { PickupQR } from '../components/PickupQR';
import { getPaymentSession } from '../api';
import { applyRoyaltyReward, calculateRoyaltiesForPurchase } from '../data/profileData';

export function OrderConfirmationScreen() {
  const navigate = useNavigate();
  const { clearCart, items, getTotal } = useCart();
  const [orderTotal] = useState(() => getTotal());
  const [vendorName] = useState(() => items[0]?.vendorName || 'QueueFest');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState('mock');
  const [error, setError] = useState<string | null>(null);
  const [royaltiesEarned] = useState(() => calculateRoyaltiesForPurchase(orderTotal));

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const directOrder = params.get('order');
  const sessionId = params.get('session_id');
  const provider = params.get('provider') || (sessionId ? 'stripe' : 'mock');

  useEffect(() => {
    let cancelled = false;

    const resolveOrder = async () => {
      setPaymentProvider(provider);

      if (directOrder) {
        setOrderNumber(directOrder);
        clearCart();
        return;
      }

      if (!sessionId) {
        setError('No se ha encontrado informacion del pago');
        return;
      }

      setLoading(true);
      try {
        const payment = await getPaymentSession(sessionId);
        if (cancelled) return;

        if (payment.pedido_id) {
          setOrderNumber(String(payment.pedido_id));
          clearCart();
          return;
        }

        setError('El pago todavia no ha generado un pedido confirmado.');
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'No se pudo validar el pago');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    resolveOrder();
    return () => {
      cancelled = true;
    };
  }, [clearCart, directOrder, provider, sessionId]);

  useEffect(() => {
    if (!orderNumber || orderTotal <= 0) return;

    applyRoyaltyReward({
      orderNumber,
      total: orderTotal,
      vendorName
    });
  }, [orderNumber, orderTotal, vendorName]);

  const handleContinue = () => {
    navigate('/home');
  };

  const handleTrackOrder = () => {
    if (orderNumber) {
      navigate(`/track-order/${orderNumber}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-black mb-4" />
        <p className="font-semibold">Confirmando tu pago...</p>
        <p className="text-sm text-gray-600 mt-2">Estamos esperando a que el backend valide la operacion y cree el pedido.</p>
      </div>
    );
  }

  if (error || !orderNumber) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold mb-3">Pago no confirmado</h1>
        <p className="text-gray-600 mb-6">{error || 'No se pudo completar el pedido.'}</p>
        <button
          onClick={() => navigate('/payment')}
          className="bg-black text-white rounded-full px-6 py-3 font-medium"
        >
          Volver al pago
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl p-8 shadow-lg text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-16 h-16 text-green-600" />
          </motion.div>

          <h1 className="text-2xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-gray-600 mb-2">Your order has been placed successfully</p>
          <p className="text-xs text-gray-400 mb-6 uppercase tracking-wide">Payment via {paymentProvider}</p>

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

          {royaltiesEarned > 0 && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl mb-6 text-left">
              <Coins className="w-6 h-6 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">Has ganado +{royaltiesEarned} royalties</p>
                <p className="text-sm text-amber-800">Los hemos sumado a tu perfil para que sigas progresando dentro del programa.</p>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            <p className="text-sm text-gray-600 mb-4">QR y numero de pedido para recogida</p>
            <PickupQR orderId={Number(orderNumber)} />
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
