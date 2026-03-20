import { useState } from 'react';
import { useNavigate } from '../utils/navigation';
import { User, CreditCard, Clock, Heart, HelpCircle, ChevronRight, LogOut, Globe } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { useLanguage } from '../context/LanguageContext';
import { formatPrice } from '../utils/formatPrice';

export function ProfileScreen() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [userProfile] = useState(() => {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : {
      name: 'Juan Pérez',
      email: 'juan.perez@email.com'
    };
  });

  const menuItems = [
    { icon: User, label: t('profile.personalInfo'), path: '/profile/info' },
    { icon: CreditCard, label: t('profile.paymentMethods'), path: '/profile/payments' },
    { icon: Clock, label: t('profile.orderHistory'), path: '/profile/orders' },
    { icon: Heart, label: t('profile.favorites'), path: '/profile/favorites' },
    { icon: Globe, label: t('profile.language'), path: '/profile/language' },
    { icon: HelpCircle, label: t('profile.helpSupport'), path: '/profile/support' }
  ];

  const handleLogout = () => {
    // Clear any auth data
    localStorage.removeItem('userToken');
    navigate('/login');
  };

  return (
    <div className={`min-h-screen bg-gray-50 pb-24 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="bg-gradient-to-br from-orange-500 to-red-600 pt-12 pb-20 px-6">
        <div className="flex items-center justify-center mb-6">
          <h1 className="text-xl font-bold text-white">{t('profile.title')}</h1>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            <User className="w-12 h-12 text-gray-600" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{userProfile.name}</h2>
          <p className="text-white/90">{userProfile.email}</p>
        </div>
      </div>

      <div className="px-4 -mt-12 space-y-4">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <item.icon className="w-5 h-5 text-gray-600" />
              </div>
              <span className={`flex-1 ${isRTL ? 'text-right' : 'text-left'} font-medium`}>{item.label}</span>
              <ChevronRight className={`w-5 h-5 text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
          ))}
        </div>

        <button 
          onClick={handleLogout}
          className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center justify-center gap-3 text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">{t('auth.logout')}</span>
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
