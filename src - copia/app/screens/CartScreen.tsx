import { useNavigate } from '../utils/navigation';
import { Trash2, ChevronLeft } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { QuantitySelector } from '../components/QuantitySelector';
import { CouponInput } from '../components/CouponInput';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatPrice';
import { useLanguage } from '../context/LanguageContext';

export function CartScreen() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const { items, removeItem, updateQuantity, getTotal, applyCoupon, discount, couponCode } = useCart();

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

  return (
    <div className="min-h-screen bg-gray-50 pb-40">
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
            {Object.entries(groupedItems).map(([vendorId, vendor]) => (
              <div key={vendorId} className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-lg mb-4">{vendor.vendorName}</h3>
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
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <QuantitySelector
                          quantity={item.quantity}
                          onIncrease={() => updateQuantity(item.id, item.quantity + 1)}
                          onDecrease={() => updateQuantity(item.id, item.quantity - 1)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-white rounded-2xl p-4 shadow-sm">
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

            <div className="bg-white rounded-2xl p-4 shadow-sm">
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

          <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
            <button
              onClick={handleCheckout}
              className="w-full bg-black text-white rounded-full py-4 font-medium text-lg hover:bg-gray-800 transition-colors"
            >
              {t('cart.checkout')}
            </button>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
