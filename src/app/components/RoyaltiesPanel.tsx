import { useEffect, useState } from 'react';
import { Coins, Sparkles, Gift, ArrowDownLeft, ArrowUpRight, Clock3, QrCode, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getLoyalty, type LoyaltyResponse } from '../api';
import { DEFAULT_ROYALTY_THRESHOLDS, ROYALTY_BENEFITS, ROYALTY_EARN_RULES, ROYALTY_REDEEM_RATE, ROYALTY_REDEEM_VALUE, getRoyaltyProgress, getRoyaltyTierStatus, getRoyaltiesToNextTier, getUserProfile } from '../data/profileData';
import { UserLoyaltyQR } from './UserLoyaltyQR';

export function RoyaltiesPanel() {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const [loyalty, setLoyalty] = useState<LoyaltyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const userProfile = getUserProfile({
    fullName: user?.nombre,
    displayName: user?.nombre,
    email: user?.email
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await getLoyalty();
        if (!cancelled) setLoyalty(data);
      } catch (error) {
        console.error('Error cargando loyalty:', error);
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
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const balance = loyalty?.puntos_total ?? 0;
  const pending = loyalty?.puntos_pendientes ?? 0;
  const lifetimeEarned = loyalty?.puntos_ganados_total ?? 0;
  const movements = loyalty?.movements ?? [];
  const thresholds = loyalty?.tier_thresholds ?? DEFAULT_ROYALTY_THRESHOLDS;
  const tierStatus = getRoyaltyTierStatus(balance, thresholds);
  const progress = getRoyaltyProgress(balance, thresholds);
  const remaining = getRoyaltiesToNextTier(balance, thresholds);

  const formatter = new Intl.NumberFormat(language === 'es' ? 'es-ES' : 'en-US');

  const getMovementIcon = (status: string) => {
    if (status === 'canjeado') return ArrowUpRight;
    if (status === 'pendiente') return Clock3;
    return ArrowDownLeft;
  };

  const getMovementColors = (status: string) => {
    if (status === 'canjeado') return 'bg-slate-100 text-slate-700';
    if (status === 'pendiente') return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
  };

  const getMovementLabel = (status: string) => {
    if (status === 'canjeado') return 'Canjeado';
    if (status === 'pendiente') return 'Pendiente';
    if (status === 'cancelado') return 'Cancelado';
    return 'Abonado';
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      <section className="rounded-3xl bg-gradient-to-br from-amber-300 via-orange-500 to-rose-500 p-5 text-white shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/80">Saldo disponible</p>
            <p className="mt-2 text-5xl font-black tracking-tight">{formatter.format(balance)}</p>
            <p className="mt-3 text-sm text-white/85">
              {ROYALTY_REDEEM_RATE} royalties equivalen a {ROYALTY_REDEEM_VALUE} EUR de saldo promocional.
            </p>
          </div>
          <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
            <Coins className="w-8 h-8" />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-black/15 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wide text-white/70">Pendientes</p>
            <p className="mt-2 text-2xl font-bold">+{formatter.format(pending)}</p>
          </div>
          <div className="rounded-2xl bg-black/15 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wide text-white/70">Acumulados</p>
            <p className="mt-2 text-2xl font-bold">{formatter.format(lifetimeEarned)}</p>
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
          <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">QR para compras presenciales</h2>
            <p className="text-sm text-gray-500">El personal del puesto lo escanea antes del cobro para asociar la compra a tu cuenta.</p>
          </div>
        </div>

        <UserLoyaltyQR
          userId={user?.id ?? 0}
          userName={userProfile.fullName}
          userEmail={userProfile.email}
        />
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
          {ROYALTY_EARN_RULES.map((rule) => (
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
          {ROYALTY_BENEFITS.map((benefit) => (
            <div key={benefit} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
              {benefit}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Actividad reciente</h2>
          <p className="text-sm text-gray-500">Movimientos reales del saldo loyalty del usuario.</p>
        </div>

        {movements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
            Todavia no hay movimientos registrados en tu cuenta.
          </div>
        ) : (
        <div className="space-y-3">
          {movements.map((movement) => {
            const status = String(movement.estado || 'confirmado').toLowerCase();
            const normalizedStatus = movement.puntos < 0 ? 'canjeado' : status;
            const Icon = getMovementIcon(normalizedStatus);
            const amountClass = movement.puntos >= 0 ? 'text-emerald-600' : 'text-slate-700';

            return (
              <div key={movement.id} className="flex items-start gap-3 rounded-2xl border border-gray-100 p-4">
                <div className={`rounded-2xl p-3 ${getMovementColors(normalizedStatus)}`}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{movement.tipo}</p>
                      <p className="text-sm text-gray-500">{movement.descripcion || movement.origen || 'Movimiento loyalty'}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${amountClass}`}>
                        {movement.puntos >= 0 ? '+' : ''}
                        {formatter.format(movement.puntos)}
                      </p>
                      <p className="text-xs text-gray-400">{getMovementLabel(normalizedStatus)}</p>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-gray-400">{formatDate(movement.creado_en)}</p>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </section>
    </div>
  );
}
