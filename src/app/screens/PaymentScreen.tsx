import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '../utils/navigation';
import { ChevronLeft, CreditCard, FlaskConical, MapPin, Clock, Coins } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatPrice';
import { createPayment, getPaymentConfig, getPuestoEstado } from '../api';
import { toast } from 'sonner';
import { calculateRoyaltiesForPurchase } from '../data/profileData';

type PaymentMethod = 'mock' | 'stripe';

export function PaymentScreen() {
  const navigate = useNavigate();
  const { getTotal, items } = useCart();
  const orderTotal = getTotal();
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
  const estimatedRoyalties = useMemo(() => calculateRoyaltiesForPurchase(orderTotal), [orderTotal]);

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
      toast.error('El carrito esta vacio');
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7,_#fff7ed_25%,_#f8fafc_62%)] pb-40">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="p-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Payment</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Checkout</p>
              <p className="mt-3 text-4xl font-black tracking-tight">{formatPrice(orderTotal)}</p>
              <p className="mt-2 text-sm text-white/75">
                {items[0]?.vendorName ? `Pedido para ${items[0].vendorName}` : 'Confirma tu pedido y termina el pago'}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <CreditCard className="w-7 h-7" />
            </div>
          </div>
        </div>

        {puestoEstado?.abierto === 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl shadow-sm">
            <h3 className="font-bold text-red-800">Cocina al maximo rendimiento</h3>
            <p className="text-sm mt-1">Por alta demanda, hemos pausado los pedidos. Vuelve a intentarlo en unos minutos.</p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-2xl shadow-sm">
          <h3 className="font-bold">Entorno gratuito de desarrollo</h3>
          <p className="text-sm mt-1">
            Stripe se usara en modo test y tambien tienes un pago simulado. Ninguna de estas opciones debe cobrar dinero real mientras mantengais claves de prueba.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-4 shadow-sm border border-white/70">
          <h2 className="font-bold mb-4">Metodo de pago</h2>
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

        <div className="bg-white rounded-3xl p-4 shadow-sm border border-white/70">
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

        <div className="bg-white rounded-3xl p-4 shadow-sm border border-white/70">
          <h2 className="font-bold mb-4">Estimated Time</h2>
          <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
            <Clock className="w-5 h-5 text-orange-600" />
            <div>
              <p className="font-medium">Ready in {estimatedTime} minutes</p>
              <p className="text-sm text-gray-600">We&apos;ll notify you when it&apos;s ready</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 shadow-sm border border-white/70">
          <h2 className="font-bold mb-4">Order Summary</h2>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Amount</span>
            <span className="font-bold text-xl">{formatPrice(orderTotal)}</span>
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <Coins className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-semibold">Esta compra te dara +{estimatedRoyalties} royalties</p>
              <p className="text-sm text-amber-800 mt-1">Regla base actual: 1 royalty por euro gastado y bonus de 5 por pedido confirmado.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-4">
        <div className="rounded-[30px] border border-gray-200 bg-white/95 p-3 shadow-2xl backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between px-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Importe final</p>
              <p className="text-2xl font-black text-gray-900">{formatPrice(orderTotal)}</p>
            </div>
            <div className="rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              +{estimatedRoyalties} royalties
            </div>
          </div>
          <button
            onClick={handlePay}
            disabled={loading || puestoEstado?.abierto === 0}
            className="w-full bg-black text-white rounded-full py-4 font-medium text-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Procesando...' : `Pagar ${formatPrice(orderTotal)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
