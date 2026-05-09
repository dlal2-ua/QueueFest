import { useState, useEffect } from 'react';
import { ChevronLeft, Wallet, Coins, TrendingUp, ArrowDownCircle, ArrowUpCircle, RefreshCw, Sparkles, Gift, Clock3, QrCode, Loader2 } from 'lucide-react';
import { useNavigate } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { getMonedero, getMonederoMovimientos, cargarMonedero, canjearRoyalties, getLoyalty, type WalletBalance, type WalletMovement, type LoyaltyResponse } from '../api';
import { DEFAULT_ROYALTY_THRESHOLDS, ROYALTY_REDEEM_RATE, getRoyaltyProgress, getRoyaltyTierStatus, getRoyaltiesToNextTier, getUserProfile } from '../data/profileData';
import { UserLoyaltyQR } from '../components/UserLoyaltyQR';

export function WalletScreen() {
  const navigate = useNavigate();
  const { isRTL, language, t } = useLanguage();
  const { user } = useAuth();
  const [balance, setBalance] = useState<WalletBalance>({ saldo_eur: 0, puntos_royalty: 0 });
  const [movements, setMovements] = useState<WalletMovement[]>([]);
  const [displayedMovements, setDisplayedMovements] = useState<WalletMovement[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [loadAmount, setLoadAmount] = useState('');
  const [exchangePoints, setExchangePoints] = useState('');
  const [showingMovementsCount, setShowingMovementsCount] = useState(10);

  const userProfile = getUserProfile({
    fullName: user?.nombre,
    displayName: user?.nombre,
    email: user?.email
  });

  useEffect(() => {
    loadWalletData();
  }, []);

  useEffect(() => {
    setDisplayedMovements(movements.slice(0, showingMovementsCount));
  }, [movements, showingMovementsCount]);

  const loadMoreMovements = () => {
    setShowingMovementsCount(prev => prev + 10);
  };

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [balanceData, movementsData, loyaltyData] = await Promise.all([
        getMonedero(),
        getMonederoMovimientos(),
        getLoyalty()
      ]);
      setBalance(balanceData);
      setMovements(movementsData);
      setLoyalty(loyaltyData);
    } catch (error) {
      console.error('Error al cargar monedero:', error);
      toast.error('Error al cargar los datos del monedero');
      // Establecer datos por defecto para evitar pantalla en blanco
      setBalance({ saldo_eur: 0, puntos_royalty: 0 });
      setMovements([]);
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
    } finally {
      setLoading(false);
    }
  };

  const handleLoadBalance = async () => {
    const amount = parseFloat(loadAmount);
    if (!amount || amount <= 0) {
      toast.error('Por favor ingresa una cantidad válida');
      return;
    }

    try {
      const result = await cargarMonedero(amount);
      setBalance(prev => ({ ...prev, saldo_eur: result.nuevo_saldo }));
      toast.success(result.message);
      setShowLoadModal(false);
      setLoadAmount('');
      loadWalletData();
    } catch (error) {
      console.error('Error al cargar saldo:', error);
      toast.error('Error al cargar saldo');
    }
  };

  const handleExchangeRoyalties = async () => {
    const points = parseInt(exchangePoints);
    if (!points || points <= 0) {
      toast.error('Por favor ingresa una cantidad válida de puntos');
      return;
    }

    const availablePoints = loyalty?.puntos_total ?? 0;
    if (points > availablePoints) {
      toast.error('No tienes suficientes puntos royalty');
      return;
    }

    if (points < 100) {
      toast.error('El mínimo para canjear son 100 puntos (1€)');
      return;
    }

    try {
      const result = await canjearRoyalties(points);
      toast.success(`${result.euros_recibidos.toFixed(2)}€ añadidos a tu monedero`);
      setShowExchangeModal(false);
      setExchangePoints('');
      await loadWalletData();
    } catch (error) {
      console.error('Error al canjear royalties:', error);
      toast.error('Error al canjear royalties');
    }
  };

  const getMovementIcon = (tipo: WalletMovement['tipo']) => {
    switch (tipo) {
      case 'carga':
        return <ArrowDownCircle className="w-5 h-5 text-green-600" />;
      case 'pago':
        return <ArrowUpCircle className="w-5 h-5 text-red-600" />;
      case 'canje_royalties':
        return <RefreshCw className="w-5 h-5 text-purple-600" />;
      case 'devolucion':
        return <ArrowDownCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <Wallet className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatter = new Intl.NumberFormat(language === 'es' ? 'es-ES' : 'en-US');
  const balanceLoyalty = loyalty?.puntos_total ?? 0;
  const pending = loyalty?.puntos_pendientes ?? 0;
  const lifetimeEarned = loyalty?.puntos_ganados_total ?? 0;
  const thresholds = loyalty?.tier_thresholds ?? DEFAULT_ROYALTY_THRESHOLDS;
  const tierStatus = getRoyaltyTierStatus(balanceLoyalty, thresholds);
  const progress = getRoyaltyProgress(balanceLoyalty, thresholds);
  const remaining = getRoyaltiesToNextTier(balanceLoyalty, thresholds);

  const royaltyEarnRules = [
    { title: t('loyalty.earnPurchaseTitle'), description: t('loyalty.earnPurchaseDesc') },
    { title: t('loyalty.earnReviewsTitle'), description: t('loyalty.earnReviewsDesc') },
    { title: t('loyalty.earnOffersTitle'), description: t('loyalty.earnOffersDesc') }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 pb-20 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Mi Monedero</h1>
            <p className="text-sm text-gray-500">Gestiona tu saldo y puntos royalty</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Saldo en Euros */}
        <section className="bg-gradient-to-br from-yellow-400 via-orange-500 to-amber-600 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-6 h-6" />
            <span className="text-sm opacity-90">Saldo disponible</span>
          </div>
          <div className="text-5xl font-bold mb-6">{balance.saldo_eur.toFixed(2)}€</div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowLoadModal(true)}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-3 rounded-xl font-medium transition-colors"
            >
              Cargar saldo
            </button>
            <button
              onClick={() => navigate('/cart')}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-3 rounded-xl font-medium transition-colors"
            >
              Ir a comprar
            </button>
          </div>
        </section>

        {/* Puntos Royalty */}
        <section className="rounded-3xl bg-gradient-to-br from-amber-300 via-orange-500 to-rose-500 p-5 text-white shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/80">{t('loyalty.availableBalance')}</p>
              <p className="mt-2 text-5xl font-black tracking-tight">{formatter.format(balanceLoyalty)}</p>
              <p className="mt-3 text-sm text-white/85">
                Canjea {ROYALTY_REDEEM_RATE} puntos por {balance.saldo_eur >= 0 ? '1€' : '1€'}
              </p>
            </div>
            <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
              <Coins className="w-8 h-8" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-black/15 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">{t('loyalty.pending')}</p>
              <p className="mt-2 text-2xl font-bold">+{formatter.format(pending)}</p>
            </div>
            <div className="rounded-2xl bg-black/15 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">{t('loyalty.lifetime')}</p>
              <p className="mt-2 text-2xl font-bold">{formatter.format(lifetimeEarned)}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-black/15 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4" />
                {t('loyalty.level')} {tierStatus.currentTier}
              </span>
              <span>{t('loyalty.objective')}: {tierStatus.nextTier}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/20">
              <div className="h-2 rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-3 text-sm text-white/85">
              {remaining > 0
                ? t('loyalty.remaining').replace('{points}', formatter.format(remaining)).replace('{tier}', tierStatus.nextTier)
                : t('loyalty.highestTier')}
            </p>
          </div>

          <button
            onClick={() => setShowExchangeModal(true)}
            disabled={balanceLoyalty < 100}
            className="w-full mt-4 bg-white text-orange-600 py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Canjear puntos por euros
          </button>
        </section>

        {/* Cómo ganar puntos */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Cómo ganar puntos</h2>
            <button
              onClick={() => setShowQRModal(true)}
              className="p-2 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
            >
              <QrCode className="w-5 h-5 text-purple-600" />
            </button>
          </div>
          <div className="space-y-3">
            {royaltyEarnRules.map((rule, index) => (
              <div key={index} className="flex items-start gap-3">
                <Gift className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">{rule.title}</p>
                  <p className="text-sm text-gray-600">{rule.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Historial unificado */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-lg mb-4">Historial de movimientos</h2>
          {movements.length === 0 ? (
            <p className="text-center text-gray-500 py-6">No hay movimientos todavía</p>
          ) : (
            <>
            <div className="space-y-3">
              {displayedMovements.map((movement) => (
                <div key={movement.id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                  {getMovementIcon(movement.tipo)}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{movement.descripcion}</p>
                    <p className="text-xs text-gray-500">{formatDate(movement.creado_en)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${movement.tipo === 'pago' ? 'text-red-600' : 'text-green-600'}`}>
                      {movement.tipo === 'pago' ? '-' : '+'}{Number(movement.cantidad).toFixed(2)}€
                    </p>
                    <p className="text-xs text-gray-500">
                      Saldo: {Number(movement.saldo_resultante).toFixed(2)}€
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Botón Cargar más movimientos */}
            {showingMovementsCount < movements.length && (
              <button
                onClick={loadMoreMovements}
                className="w-full mt-4 px-6 py-3 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium"
              >
                Cargar más movimientos ({movements.length - showingMovementsCount} restantes)
              </button>
            )}
            </>
          )}
        </section>
      </div>

      {/* Load Balance Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-semibold mb-4">Cargar saldo</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad a cargar (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={loadAmount}
                onChange={(e) => setLoadAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLoadModal(false);
                  setLoadAmount('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleLoadBalance}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Cargar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exchange Royalties Modal */}
      {showExchangeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-semibold mb-4">Canjear Royalties</h3>
            <div className="bg-purple-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-purple-800">
                Tienes <span className="font-bold">{balanceLoyalty}</span> puntos disponibles
              </p>
              <p className="text-xs text-purple-600 mt-1">
                {ROYALTY_REDEEM_RATE} puntos = 1€ | Mínimo: {ROYALTY_REDEEM_RATE} puntos
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Puntos a canjear
              </label>
              <input
                type="number"
                step="100"
                min="100"
                max={balanceLoyalty}
                value={exchangePoints}
                onChange={(e) => setExchangePoints(e.target.value)}
                placeholder="100"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {exchangePoints && parseInt(exchangePoints) > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Recibirás: <span className="font-bold text-purple-600">{(parseInt(exchangePoints) / ROYALTY_REDEEM_RATE).toFixed(2)}€</span>
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowExchangeModal(false);
                  setExchangePoints('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleExchangeRoyalties}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Canjear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Tu código QR</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
            <UserLoyaltyQR userProfile={userProfile} />
            <p className="text-sm text-gray-600 text-center mt-4">
              Muestra este código para acumular puntos royalty en tus compras
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
