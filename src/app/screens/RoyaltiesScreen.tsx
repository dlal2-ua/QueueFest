import { useMemo } from 'react';
import { ChevronLeft, Coins, Sparkles, Gift, ArrowDownLeft, ArrowUpRight, Clock3 } from 'lucide-react';
import { useNavigate } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';
import {
  getRoyaltyProgram,
  getRoyaltyProgress,
  getRoyaltyTierStatus,
  getRoyaltiesToNextTier
} from '../data/profileData';

export function RoyaltiesScreen() {
  const navigate = useNavigate();
  const { isRTL, language } = useLanguage();
  const royaltyProgram = useMemo(() => getRoyaltyProgram(), []);
  const tierStatus = useMemo(() => getRoyaltyTierStatus(royaltyProgram.balance), [royaltyProgram.balance]);
  const progress = useMemo(() => getRoyaltyProgress(royaltyProgram.balance), [royaltyProgram.balance]);
  const remaining = useMemo(() => getRoyaltiesToNextTier(royaltyProgram.balance), [royaltyProgram.balance]);

  const formatter = useMemo(
    () => new Intl.NumberFormat(language === 'es' ? 'es-ES' : 'en-US'),
    [language]
  );

  const getMovementIcon = (status: string) => {
    if (status === 'redeemed') return ArrowUpRight;
    if (status === 'pending') return Clock3;
    return ArrowDownLeft;
  };

  const getMovementColors = (status: string) => {
    if (status === 'redeemed') return 'bg-slate-100 text-slate-700';
    if (status === 'pending') return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
  };

  const getMovementLabel = (status: string) => {
    if (status === 'redeemed') return 'Canjeado';
    if (status === 'pending') return 'Pendiente';
    return 'Abonado';
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Royalties</h1>
            <p className="text-sm text-gray-500">Tu saldo virtual, progreso y movimientos recientes.</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <section className="rounded-3xl bg-gradient-to-br from-amber-300 via-orange-500 to-rose-500 p-5 text-white shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/80">Saldo disponible</p>
              <p className="mt-2 text-5xl font-black tracking-tight">{formatter.format(royaltyProgram.balance)}</p>
              <p className="mt-3 text-sm text-white/85">
                {royaltyProgram.redeemRate} royalties equivalen a {royaltyProgram.redeemValue} EUR de saldo promocional.
              </p>
            </div>
            <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
              <Coins className="w-8 h-8" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-black/15 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">Pendientes</p>
              <p className="mt-2 text-2xl font-bold">+{formatter.format(royaltyProgram.pending)}</p>
            </div>
            <div className="rounded-2xl bg-black/15 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">Acumulados</p>
              <p className="mt-2 text-2xl font-bold">{formatter.format(royaltyProgram.lifetimeEarned)}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-black/15 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4" />
                Nivel {tierStatus.currentTier}
              </span>
              <span>Objetivo: {tierStatus.nextTier}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/20">
              <div className="h-2 rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-3 text-sm text-white/85">
              {remaining > 0
                ? `Te faltan ${formatter.format(remaining)} royalties para llegar a ${tierStatus.nextTier}.`
                : 'Ya estas en el nivel mas alto del programa.'}
            </p>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Como se consiguen</h2>
              <p className="text-sm text-gray-500">Base funcional del sistema de recompensa dentro de QueueFest.</p>
            </div>
          </div>

          <div className="space-y-3">
            {royaltyProgram.earnRules.map((rule) => (
              <div key={rule.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="font-semibold text-gray-900">{rule.title}</p>
                <p className="mt-1 text-sm text-gray-600">{rule.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-rose-100 p-3 text-rose-700">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">En que podran ayudarte</h2>
              <p className="text-sm text-gray-500">Vision inicial del programa antes de conectar el canje real.</p>
            </div>
          </div>

          <div className="space-y-3">
            {royaltyProgram.benefits.map((benefit) => (
              <div key={benefit} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
                {benefit}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Actividad reciente</h2>
            <p className="text-sm text-gray-500">Ultimos movimientos del saldo virtual del usuario.</p>
          </div>

          <div className="space-y-3">
            {royaltyProgram.movements.map((movement) => {
              const Icon = getMovementIcon(movement.status);
              const amountClass = movement.amount >= 0 ? 'text-emerald-600' : 'text-slate-700';

              return (
                <div key={movement.id} className="flex items-start gap-3 rounded-2xl border border-gray-100 p-4">
                  <div className={`rounded-2xl p-3 ${getMovementColors(movement.status)}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{movement.title}</p>
                        <p className="text-sm text-gray-500">{movement.description}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${amountClass}`}>
                          {movement.amount >= 0 ? '+' : ''}
                          {formatter.format(movement.amount)}
                        </p>
                        <p className="text-xs text-gray-400">{getMovementLabel(movement.status)}</p>
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-gray-400">{formatDate(movement.date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
