import { useState, useEffect } from 'react';
import { ChevronLeft, Package, ChefHat, CheckCircle } from 'lucide-react';
import { useNavigate, useParams } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';
import { formatPrice } from '../utils/formatPrice';

type OrderStatus = 'in-queue' | 'preparing' | 'ready';

interface OrderDetails {
  orderNumber: string;
  vendor: string;
  items: { name: string; quantity: number }[];
  total: number;
  status: OrderStatus;
  estimatedTime: number;
}

export function TrackOrderScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t, isRTL } = useLanguage();
  
  const [order] = useState<OrderDetails>(() => {
    // Try to get order from history
    const saved = localStorage.getItem('currentOrder');
    if (saved) {
      return JSON.parse(saved);
    }
    
    return {
      orderNumber: id || '1234',
      vendor: 'Taco Heaven',
      items: [
        { name: 'Carne Asada Taco', quantity: 3 },
        { name: 'California Burrito', quantity: 1 }
      ],
      total: 23.40,
      status: 'in-queue' as OrderStatus,
      estimatedTime: 15
    };
  });

  const getProgress = () => {
    switch (order.status) {
      case 'in-queue':
        return 0;
      case 'preparing':
        return 50;
      case 'ready':
        return 100;
      default:
        return 0;
    }
  };

  const steps = [
    { key: 'in-queue', icon: Package, label: t('track.inQueue') },
    { key: 'preparing', icon: ChefHat, label: t('track.preparing') },
    { key: 'ready', icon: CheckCircle, label: t('track.readyPickup') }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === order.status);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate('/profile/orders')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <h1 className="text-xl font-semibold">{t('track.title')}</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Order Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="text-center mb-6">
            <div className="text-sm text-gray-500 mb-1">{t('track.orderNumber')}</div>
            <div className="text-3xl font-bold">#{order.orderNumber}</div>
          </div>

          <div className="text-center mb-6">
            <div className="text-sm text-gray-500 mb-1">{t('track.estimatedTime')}</div>
            <div className="text-4xl font-bold text-blue-600">
              {order.estimatedTime} <span className="text-2xl">{t('track.minutes')}</span>
            </div>
          </div>

          {/* Vendor */}
          <div className="text-center pb-4 border-b border-gray-100">
            <div className="font-semibold text-lg">{order.vendor}</div>
          </div>

          {/* Items */}
          <div className="pt-4 space-y-2">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.quantity}x {item.name}
                </span>
              </div>
            ))}
            <div className="flex justify-between font-semibold pt-2 border-t border-gray-100">
              <span>{t('cart.total')}</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200">
              <div
                className="h-full bg-blue-600 transition-all duration-500"
                style={{ width: `${getProgress()}%` }}
              />
            </div>

            {/* Steps */}
            <div className="relative flex justify-between">
              {steps.map((step, index) => {
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const Icon = step.icon;

                return (
                  <div key={step.key} className="flex flex-col items-center" style={{ width: '33%' }}>
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}
                    >
                      <Icon className="w-7 h-7" />
                    </div>
                    <div
                      className={`text-xs text-center font-medium px-2 ${
                        isActive ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* QR Code Placeholder */}
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <div className="text-sm text-gray-500 mb-4">Código QR para recoger</div>
          <div className="w-48 h-48 mx-auto bg-gray-100 rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full p-4">
              <rect x="0" y="0" width="30" height="30" fill="#000" />
              <rect x="35" y="0" width="5" height="5" fill="#000" />
              <rect x="45" y="0" width="10" height="10" fill="#000" />
              <rect x="70" y="0" width="30" height="30" fill="#000" />
              <rect x="0" y="70" width="30" height="30" fill="#000" />
              <rect x="40" y="40" width="20" height="20" fill="#000" />
            </svg>
          </div>
        </div>

        {/* Back to Home Button */}
        <button
          onClick={() => navigate('/home')}
          className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl py-4 font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
