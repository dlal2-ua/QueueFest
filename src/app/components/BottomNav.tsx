import { Home, Tag, ShoppingCart, User } from 'lucide-react';
import { useNavigate, useLocation } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  const navItems = [
    { icon: Home, label: t('nav.home'), path: '/home' },
    { icon: Tag, label: t('nav.offers'), path: '/offers' },
    { icon: ShoppingCart, label: t('nav.cart'), path: '/cart' },
    { icon: User, label: t('nav.profile'), path: '/profile' }
  ];

  return (
    <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-3 pb-3 pt-2">
      <div className="flex items-center justify-around rounded-3xl border border-gray-200 bg-white/95 px-2 py-2 shadow-2xl backdrop-blur-sm">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path || location.pathname.startsWith(path);
          const isCart = path === '/cart';
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors ${
                isActive ? 'text-black' : 'text-gray-400'
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 ${isActive ? 'fill-black' : ''}`} />
                {isCart && itemCount > 0 && (
                  <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
