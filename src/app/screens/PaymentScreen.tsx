import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '../utils/navigation';
import { ChevronLeft, CreditCard, FlaskConical, MapPin, Clock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatPrice';
import { createPayment, getPaymentConfig, getPuestoEstado } from '../api';
import { toast } from 'sonner';

type PaymentMethod = 'mock' | 'stripe';

export function PaymentScreen() {
  const navigate = useNavigate();
  const { getTotal, items } = useCart();
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('mock');
  const [pickupLocation, setPickupLocation] = useState('Main Stage Area');
  const [loading, setLoading] = useState(false);
  const [puestoEstado, setPuestoEstado] = useState<any>(null);
  const [paymentConfig, setPaymentConfig] = useState<{ provider: string; stripe_enabled: boolean; mock_enabled: boolean } | null>(null);

  useEffect(() => {
    getPaymentConfig()
      .then((config) => {
        setPaymentConfig(config);
        if (config.stripe_enabled) {
          setSelectedPayment('stripe');
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (items.length > 0 && items[0].vendorId) {
      getPuestoEstado(Number(items[0].vendorId))
        .then(setPuestoEstado)
        .catch(console.error);
    }
  }, [items]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout_cancelled') === '1') {
      toast.error('Has cancelado el pago de Stripe y tu pedido no se ha creado.');
    }
  }, []);

  const estimatedTime = useMemo(() => {
    if (items.length === 0) return 0;
    return 15;
  }, [items]);

  const paymentOptions = [
    {
      id: 'stripe' as PaymentMethod,
      enabled: paymentConfig?.stripe_enabled ?? false,
      icon: CreditCard,
      title: 'Stripe Checkout',
      description: 'Modo test: integra pago real sin cobrar dinero real'
    },
    {
      id: 'mock' as PaymentMethod,
      enabled: paymentConfig?.mock_enabled ?? true,
      icon: FlaskConical,
      title: 'Pago Simulado',
      description: 'Crea el pedido gratis sin pasar por una pasarela externa'
    }
  ].filter((option) => option.enabled);

  const handlePay = async () => {
    if (items.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    setLoading(true);
    try {
      const puestoId = parseInt(items[0].vendorId, 10);
      const payload = {
        provider: selectedPayment,
        puesto_id: isNaN(puestoId) ? 1 : puestoId,
        items: items.map((item) => ({
          producto_id: parseInt(item.id, 10) || 1,
          cantidad: item.quantity
        }))
      };

      const result = await createPayment(payload);

      if (result.provider === 'stripe' && result.checkout_url) {
        window.location.href = result.checkout_url;
        return;
      }

      if (result.pedido_id) {
        navigate(`/confirmation?order=${result.pedido_id}&provider=${result.provider || 'mock'}`);
        return;
      }

      throw new Error('No se pudo completar el pago');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Hubo un error al procesar el pago');
    } finally {
      setLoading(false);
    }
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
        {puestoEstado?.abierto === 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl shadow-sm">
            <h3 className="font-bold text-red-800">Cocina al máximo rendimiento</h3>
            <p className="text-sm mt-1">Por alta demanda, hemos pausado los pedidos. Vuelve a intentarlo en unos minutos.</p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-2xl shadow-sm">
          <h3 className="font-bold">Entorno gratuito de desarrollo</h3>
          <p className="text-sm mt-1">
            Stripe se usará en modo test y también tienes un pago simulado. Ninguna de estas opciones debe cobrar dinero real mientras mantengáis claves de prueba.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold mb-4">Método de pago</h2>
          <div className="space-y-3">
            {paymentOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedPayment === option.id;

              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedPayment(option.id)}
                  className={`w-full p-4 border-2 rounded-xl flex items-center gap-3 transition-colors ${isSelected ? 'border-black bg-gray-50' : 'border-gray-200'}`}
                >
                  <Icon className="w-6 h-6" />
                  <div className="text-left flex-1">
                    <p className="font-medium">{option.title}</p>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-black' : 'border-gray-300'}`}>
                    {isSelected && <div className="w-3 h-3 bg-black rounded-full" />}
                  </div>
                </button>
              );
            })}
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
          <div className="flex justify-between">
            <span className="text-gray-600">Total Amount</span>
            <span className="font-bold text-xl">{formatPrice(getTotal())}</span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <button
          onClick={handlePay}
          disabled={loading || puestoEstado?.abierto === 0}
          className="w-full bg-black text-white rounded-full py-4 font-medium text-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Procesando...' : `Pagar ${formatPrice(getTotal())}`}
        </button>
      </div>
    </div>
  );
}
