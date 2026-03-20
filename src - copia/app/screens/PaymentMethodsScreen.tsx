import { useState } from 'react';
import { ChevronLeft, CreditCard, Trash2, Check } from 'lucide-react';
import { useNavigate } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';

interface PaymentCard {
  id: string;
  lastFour: string;
  expiryDate: string;
  isDefault: boolean;
  brand: string;
}

export function PaymentMethodsScreen() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [cards, setCards] = useState<PaymentCard[]>(() => {
    const saved = localStorage.getItem('paymentCards');
    return saved ? JSON.parse(saved) : [
      { id: '1', lastFour: '4242', expiryDate: '12/25', isDefault: true, brand: 'Visa' },
      { id: '2', lastFour: '5555', expiryDate: '08/26', isDefault: false, brand: 'Mastercard' }
    ];
  });

  const handleSetDefault = (id: string) => {
    const updated = cards.map(card => ({
      ...card,
      isDefault: card.id === id
    }));
    setCards(updated);
    localStorage.setItem('paymentCards', JSON.stringify(updated));
  };

  const handleRemove = (id: string) => {
    const updated = cards.filter(card => card.id !== id);
    setCards(updated);
    localStorage.setItem('paymentCards', JSON.stringify(updated));
    toast.success(t('payment.cardRemoved'));
  };

  const handleAddCard = () => {
    // In a real app, this would open a payment form
    const newCard: PaymentCard = {
      id: Date.now().toString(),
      lastFour: Math.floor(1000 + Math.random() * 9000).toString(),
      expiryDate: '12/27',
      isDefault: cards.length === 0,
      brand: 'Visa'
    };
    const updated = [...cards, newCard];
    setCards(updated);
    localStorage.setItem('paymentCards', JSON.stringify(updated));
    toast.success('Card added successfully');
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
          <h1 className="text-xl font-semibold">{t('payment.title')}</h1>
        </div>
      </div>

      {/* Cards List */}
      <div className="p-4 space-y-3">
        {cards.map((card) => (
          <div key={card.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{card.brand}</span>
                  <span className="text-gray-600">•••• {card.lastFour}</span>
                  {card.isDefault && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                      {t('payment.default')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {t('payment.expiresOn')} {card.expiryDate}
                </p>
                
                <div className="flex gap-2 mt-3">
                  {!card.isDefault && (
                    <button
                      onClick={() => handleSetDefault(card.id)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      {t('payment.setDefault')}
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(card.id)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('common.remove')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={handleAddCard}
          className="w-full bg-white border-2 border-dashed border-gray-300 rounded-2xl py-6 text-gray-600 font-medium hover:border-blue-500 hover:text-blue-600 transition-colors"
        >
          + {t('payment.addCard')}
        </button>
      </div>
    </div>
  );
}
