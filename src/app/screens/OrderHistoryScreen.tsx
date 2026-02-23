import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';
import { formatPrice } from '../utils/formatPrice';

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  vendor: string;
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
}

export function OrderHistoryScreen() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [orders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('orderHistory');
    return saved ? JSON.parse(saved) : [
      {
        id: '1',
        orderNumber: '1234',
        date: '2026-02-18',
        vendor: 'Taco Heaven',
        total: 23.40,
        status: 'completed'
      },
      {
        id: '2',
        orderNumber: '1233',
        date: '2026-02-17',
        vendor: 'The Cocktail Club',
        total: 34.60,
        status: 'completed'
      },
      {
        id: '3',
        orderNumber: '1232',
        date: '2026-02-15',
        vendor: 'Burger Boss',
        total: 27.50,
        status: 'completed'
      },
      {
        id: '4',
        orderNumber: '1231',
        date: '2026-02-14',
        vendor: 'Pizza Slice Paradise',
        total: 15.80,
        status: 'completed'
      }
    ];
  });

  const getStatusColor = (status: Order['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      preparing: 'bg-blue-100 text-blue-700',
      ready: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <h1 className="text-xl font-semibold">{t('orders.title')}</h1>
        </div>
      </div>

      {/* Orders List */}
      <div className="p-4 space-y-3">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {t('orders.empty')}
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/track-order/${order.orderNumber}`)}
              className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{t('orders.orderNumber')}{order.orderNumber}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(order.status)}`}>
                      {t(`orders.${order.status}`)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{formatDate(order.date)}</p>
                </div>
                <ChevronRight className={`w-5 h-5 text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />
              </div>

              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{order.vendor}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatPrice(order.total)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
