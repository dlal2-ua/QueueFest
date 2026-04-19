import { useMemo } from 'react';
import { useNavigate } from '../utils/navigation';
import { User, CreditCard, Clock, Heart, HelpCircle, ChevronRight, LogOut, Globe, Coins, Sparkles, Bell } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getRoyaltyProgram, getRoyaltyProgress, getRoyaltyTierStatus, getUserProfile } from '../data/profileData';

export function ProfileScreen() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const { user, logout } = useAuth();

  const userProfile = useMemo(
    () =>
      getUserProfile({
        fullName: user?.nombre,
        displayName: user?.nombre,
        email: user?.email
      }),
    [user?.email, user?.nombre]
  );
  const royaltyProgram = useMemo(() => getRoyaltyProgram(), []);
  const royaltyTier = useMemo(() => getRoyaltyTierStatus(royaltyProgram.balance), [royaltyProgram.balance]);
  const royaltyProgress = useMemo(() => getRoyaltyProgress(royaltyProgram.balance), [royaltyProgram.balance]);

  const menuItems = [
    { icon: User, label: t('profile.personalInfo'), path: '/profile/info' },
    { icon: Coins, label: 'Royalties', path: '/profile/royalties' },
    { icon: CreditCard, label: t('profile.paymentMethods'), path: '/profile/payments' },
    { icon: Clock, label: t('profile.orderHistory'), path: '/profile/orders' },
    { icon: Bell, label: 'Notificaciones', path: '/profile/notifications' },
    { icon: Heart, label: t('profile.favorites'), path: '/profile/favorites' },
    { icon: Globe, label: t('profile.language'), path: '/profile/language' },
    { icon: HelpCircle, label: t('profile.helpSupport'), path: '/profile/support' }
  ];

  const handleLogout = () => {
    logout();
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
          <h2 className="text-2xl font-bold text-white mb-1">{userProfile.fullName}</h2>
          <p className="text-white/90">{userProfile.email}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            <span>Nivel {royaltyTier.currentTier}</span>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-12 space-y-4">
        <button
          onClick={() => navigate('/profile/royalties')}
          className="w-full rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-5 text-left text-white shadow-xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/80">Saldo disponible</p>
              <p className="mt-2 text-4xl font-black tracking-tight">{royaltyProgram.balance}</p>
              <p className="mt-2 text-sm text-white/85">+{royaltyProgram.pending} pendientes por confirmar</p>
            </div>
            <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
              <Coins className="h-7 w-7" />
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-black/15 p-4 backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>{royaltyTier.currentTier}</span>
              <span>{royaltyTier.nextTier}</span>
            </div>
            <div className="h-2 rounded-full bg-white/20">
              <div className="h-2 rounded-full bg-white transition-all" style={{ width: `${royaltyProgress}%` }} />
            </div>
            <p className="mt-2 text-sm text-white/85">
              Te faltan {Math.max(0, royaltyTier.nextTierTarget - royaltyProgram.balance)} royalties para subir de nivel.
            </p>
          </div>
        </button>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  item.path === '/profile/royalties' ? 'bg-amber-100' : 'bg-gray-100'
                }`}
              >
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
