import { useNavigate } from '../utils/navigation';
import { Trash2, ChevronLeft, ArrowUp } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { QuantitySelector } from '../components/QuantitySelector';
import { CouponInput } from '../components/CouponInput';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatPrice';
import { useLanguage } from '../context/LanguageContext';
import { getPuestoEstado } from '../api';
import { useEffect, useState } from 'react';

export function CartScreen() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { items, removeItem, updateQuantity, getTotal, applyCoupon, discount, couponCode } = useCart();
  const [puestoEstado, setPuestoEstado] = useState<any>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    if (items.length > 0 && items[0].vendorId) {
      getPuestoEstado(Number(items[0].vendorId))
        .then(setPuestoEstado)
        .catch(console.error);
    }
  }, [items]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 280);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.vendorId]) {
      acc[item.vendorId] = {
        vendorName: item.vendorName,
        vendorType: item.vendorType,
        items: []
      };
    }
    acc[item.vendorId].items.push(item);
    return acc;
  }, {} as Record<string, { vendorName: string; vendorType: string; items: typeof items }>);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = getTotal();

  const handleCheckout = () => {
    if (items.length > 0) {
      navigate('/payment');
    }
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_55%,_#f8fafc)] pb-32">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="p-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">{t('cart.title')}</h1>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">🛒</span>
          </div>
          <h2 className="text-xl font-bold mb-2">{t('cart.empty')}</h2>
          <p className="text-gray-600 mb-6">Add items to get started</p>
          <button
            onClick={() => navigate('/home')}
            className="px-6 py-3 bg-black text-white rounded-full font-medium"
          >
            Browse Menu
          </button>
        </div>
      ) : (
        <>
          <div className="p-4 space-y-6">
            {puestoEstado?.abierto === 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <h3 className="font-bold text-red-800">Cocina al máximo rendimiento</h3>
                    <p className="text-sm mt-1">Por alta demanda, hemos pausado los pedidos. Volvemos a servir en 5-10 min. Por favor, espera para continuar.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-[28px] border border-white/70 bg-white/95 p-4 shadow-lg backdrop-blur-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total</p>
                  <p className="mt-1 text-3xl font-black text-gray-900">{formatPrice(total)}</p>
                </div>
                <p className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
                  {items.length} lineas en el carrito
                </p>
              </div>
              <button
                onClick={handleCheckout}
                disabled={puestoEstado?.abierto === 0}
                className="mt-4 w-full bg-black text-white rounded-full py-4 font-medium text-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('cart.checkout')}
              </button>
            </div>

            {Object.entries(groupedItems).map(([vendorId, vendor]) => (
              <div key={vendorId} className="bg-white rounded-3xl p-4 shadow-sm border border-white/70">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-lg">{vendor.vendorName}</h3>
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      {vendor.items.length} {vendor.items.length === 1 ? 'producto' : 'productos'}
                    </p>
                  </div>
                  <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                    {vendor.vendorType === 'bar' ? 'Barra' : 'Food truck'}
                  </div>
                </div>
                <div className="space-y-4">
                  {vendor.items.map((item) => (
                    <div key={item.id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-b-0">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{item.name}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                        )}
                        <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => removeItem(item.id, item.vendorId)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <QuantitySelector
                          quantity={item.quantity}
                          onIncrease={() => updateQuantity(item.id, item.quantity + 1, item.vendorId)}
                          onDecrease={() => updateQuantity(item.id, item.quantity - 1, item.vendorId)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-white rounded-3xl p-4 shadow-sm border border-white/70">
              <h3 className="font-bold mb-3">{t('cart.applyCoupon')}</h3>
              <CouponInput onApply={applyCoupon} />
              {couponCode && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">
                    Coupon "{couponCode}" applied! You saved {formatPrice(discount)}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl p-4 shadow-sm border border-white/70">
              <h3 className="font-bold mb-4">Price Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.subtotal')}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between font-bold text-lg">
                    <span>{t('cart.total')}</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {items.length > 0 && showScrollTop && (
        <div className="fixed bottom-28 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-4">
          <div className="flex justify-end">
            <button
              onClick={handleScrollToTop}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-2xl transition-transform hover:-translate-y-0.5 hover:bg-gray-800"
              title="Subir arriba"
              aria-label="Subir arriba"
            >
              <ArrowUp className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
