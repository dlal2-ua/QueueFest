import { Home, Tag, ShoppingCart, User } from 'lucide-react';
import { useNavigate, useLocation } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { icon: Home, label: t('nav.home'), path: '/home' },
    { icon: Tag, label: t('nav.offers'), path: '/offers' },
    { icon: ShoppingCart, label: t('nav.cart'), path: '/cart' },
    { icon: User, label: t('nav.profile'), path: '/profile' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 shadow-lg z-50">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path || location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors ${
                isActive ? 'text-black' : 'text-gray-400'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'fill-black' : ''}`} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
