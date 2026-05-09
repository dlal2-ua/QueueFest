import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '../utils/navigation';
import { User, CreditCard, Clock, Heart, HelpCircle, ChevronRight, LogOut, Globe, Coins, Sparkles, Bell, Star, Wallet } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getLoyalty, type LoyaltyResponse, getMonedero, type WalletBalance } from '../api';
import { DEFAULT_ROYALTY_THRESHOLDS, getRoyaltyProgress, getRoyaltyTierStatus, getUserProfile } from '../data/profileData';

export function ProfileScreen() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const { user, logout } = useAuth();
  const [loyalty, setLoyalty] = useState<LoyaltyResponse | null>(null);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);

  const userProfile = useMemo(
    () =>
      getUserProfile({
        fullName: user?.nombre,
        displayName: user?.alias || user?.nombre,
        email: user?.email
      }),
    [user?.alias, user?.email, user?.nombre]
  );
  useEffect(() => {
    let cancelled = false;

    Promise.all([getLoyalty(), getMonedero()])
      .then(([loyaltyData, walletData]) => {
        if (!cancelled) {
          setLoyalty(loyaltyData);
          setWalletBalance(walletData);
        }
      })
      .catch((error) => {
        console.error('Error cargando datos:', error);
        if (!cancelled) {
          setLoyalty({
            puntos_total: 0,
            puntos_pendientes: 0,
            puntos_ganados_total: 0,
            puntos_canjeados_total: 0,
            nivel: 'fan',
            activo: true,
            tier_thresholds: DEFAULT_ROYALTY_THRESHOLDS,
            movements: []
          });
          setWalletBalance({
            saldo_eur: 0,
            puntos_royalty: 0
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const balance = loyalty?.puntos_total ?? 0;
  const pending = loyalty?.puntos_pendientes ?? 0;
  const thresholds = loyalty?.tier_thresholds ?? DEFAULT_ROYALTY_THRESHOLDS;
  const royaltyTier = useMemo(() => getRoyaltyTierStatus(balance, thresholds), [balance, thresholds]);
  const royaltyProgress = useMemo(() => getRoyaltyProgress(balance, thresholds), [balance, thresholds]);

  const menuItems = [
    { icon: User, label: t('profile.personalInfo'), path: '/profile/info' },
    { icon: Wallet, label: 'Mi Monedero', path: '/wallet' },
    { icon: CreditCard, label: t('profile.paymentMethods'), path: '/profile/payments' },
    { icon: Clock, label: t('profile.orderHistory'), path: '/profile/orders' },
    { icon: Star, label: t('profile.reviews'), path: '/profile/reviews' },
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
          <h2 className="text-2xl font-bold text-white mb-1">{userProfile.displayName}</h2>
          {user?.alias && user?.nombre && user.alias !== user.nombre && (
            <p className="text-sm text-white/80">{user.nombre}</p>
          )}
          <p className="text-white/90">{userProfile.email}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            <span>{t('loyalty.level')} {royaltyTier.currentTier}</span>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-12 space-y-4">
        <button
          onClick={() => navigate('/wallet')}
          className="w-full rounded-3xl bg-gradient-to-br from-yellow-400 via-orange-500 to-amber-600 p-6 text-left text-white shadow-xl hover:shadow-2xl transition-shadow"
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-5 w-5" />
                <p className="text-sm font-medium text-white/90">Mi Monedero</p>
              </div>
              <p className="text-5xl font-black tracking-tight">{walletBalance?.saldo_eur.toFixed(2) || '0.00'}€</p>
              <p className="mt-1 text-sm text-white/75">Saldo disponible</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-4 border border-white/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-300" />
                <span className="text-sm font-medium text-white/90">Puntos Royalty</span>
              </div>
              <span className="text-2xl font-bold">{balance}</span>
            </div>

            <div className="mb-2 flex items-center justify-between text-xs text-white/75">
              <span>{royaltyTier.currentTier}</span>
              <span>{royaltyTier.nextTier}</span>
            </div>
            <div className="h-2 rounded-full bg-white/20">
              <div className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${royaltyProgress}%` }} />
            </div>
            <p className="mt-2 text-xs text-white/75">
              {pending > 0 && `${pending} puntos pendientes • `}
              {Math.max(0, royaltyTier.nextTierTarget - balance)} puntos para {royaltyTier.nextTier}
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
