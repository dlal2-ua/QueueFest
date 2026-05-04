import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  aprobarDecision,
  actualizarPromocionGestor,
  evaluarBotCompras,
  getBotComprasDashboard,
  rechazarDecision,
  type BotComprasPeriodo,
  type PromotionRecord
} from '../../api';
import { DecisionCard, type Decision } from '../../components/DecisionCard';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  Bot,
  Euro,
  Hand,
  Loader2,
  Play,
  Power,
  RefreshCw,
  ShoppingBag,
  Tag,
  Trophy,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  festivalId: number;
  festivalNombre: string;
  modoAuto: boolean;
  onToggleModo: () => void;
  navigate: (view: string) => void;
}

interface BotPromotion extends PromotionRecord {
  usos: number;
  unidades_vendidas: number;
  ingresos_generados: number;
  ultimo_uso: string | null;
  ventas_antes: number | null;
  ventas_despues: number | null;
  ganadora: 0 | 1 | null;
}

interface BotDashboardData {
  periodo: BotComprasPeriodo;
  modo_auto: boolean;
  actualizado_en: string;
  kpis: {
    promos_automaticas: number;
    promos_automaticas_activas: number;
    decisiones_pendientes: number;
    usos_promociones: number;
    unidades_vendidas: number;
    ingresos_con_promocion: number;
  };
  mejor_promocion: BotPromotion | null;
  peor_promocion: BotPromotion | null;
  decisiones: Decision[];
  promociones: BotPromotion[];
  serie_temporal?: Array<{
    etiqueta: string;
    usos: number;
    unidades: number;
    ingresos: number;
  }>;
}

const PERIOD_OPTIONS: Array<{ value: BotComprasPeriodo; label: string }> = [
  { value: 'hoy', label: 'Hoy' },
  { value: '7d', label: '7 dias' },
  { value: 'festival', label: 'Festival' }
];

type ChartMetric = 'ingresos' | 'usos' | 'unidades';

const CHART_METRIC_OPTIONS: Array<{ value: ChartMetric; label: string }> = [
  { value: 'ingresos', label: 'Ingresos' },
  { value: 'usos', label: 'Usos' },
  { value: 'unidades', label: 'Unidades' }
];

function formatMoney(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return '-';
  return `${numeric.toFixed(2)} EUR`;
}

function formatNumber(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return '-';
  return Math.round(numeric).toLocaleString('es-ES');
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatChartValue(value: number | string | null | undefined, metric: ChartMetric) {
  return metric === 'ingresos' ? formatMoney(value) : formatNumber(value);
}

function getPromotionMetricValue(promotion: BotPromotion, metric: ChartMetric) {
  if (metric === 'ingresos') return Number(promotion.ingresos_generados || 0);
  if (metric === 'unidades') return Number(promotion.unidades_vendidas || 0);
  return Number(promotion.usos || 0);
}

function ChartPanel({
  title,
  action,
  children
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#C8956C' }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  color
}: {
  icon: typeof Bot;
  label: string;
  value: string;
  hint?: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border p-4" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8B6650' }}>{label}</p>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="mt-2 text-2xl font-extrabold leading-none" style={{ color: '#2C1810' }}>{value}</p>
      {hint && <p className="mt-1 text-[11px]" style={{ color: '#8B6650' }}>{hint}</p>}
    </div>
  );
}

function PromotionPerformanceRow({
  promotion,
  savingId,
  onToggle,
  onEdit
}: {
  promotion: BotPromotion;
  savingId: number | null;
  onToggle: (promotion: BotPromotion) => void;
  onEdit: () => void;
}) {
  const used = Number(promotion.usos || 0) > 0;
  const isSaving = savingId === promotion.id;

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-extrabold truncate" style={{ color: '#2C1810' }}>{promotion.titulo}</p>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: promotion.activa ? '#D1FAE5' : '#FEE2E2',
                color: promotion.activa ? '#065F46' : '#991B1B'
              }}
            >
              {promotion.activa ? 'Activa' : 'Inactiva'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}>
              Bot
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: '#8B6650' }}>
            {promotion.producto_nombre || 'Producto sin nombre'} - {promotion.puesto_nombre || 'Puesto'}
          </p>
        </div>
        {promotion.ganadora === 1 && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
            <Trophy className="w-3 h-3" />
            Ganadora
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#C8956C' }}>Usos</p>
          <p className="text-sm font-bold" style={{ color: '#2C1810' }}>{formatNumber(promotion.usos)}</p>
        </div>
        <div className="rounded-xl bg-white px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#C8956C' }}>Unidades</p>
          <p className="text-sm font-bold" style={{ color: '#2C1810' }}>{formatNumber(promotion.unidades_vendidas)}</p>
        </div>
        <div className="rounded-xl bg-white px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#C8956C' }}>Ingresos</p>
          <p className="text-sm font-bold" style={{ color: '#2C1810' }}>{formatMoney(promotion.ingresos_generados)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-[11px]" style={{ color: '#8B6650' }}>
        <span>Audiencia: General</span>
        <span>{used ? `Ultimo uso: ${formatDateTime(promotion.ultimo_uso)}` : 'Sin usos aun'}</span>
      </div>

      {(promotion.ventas_antes != null || promotion.ventas_despues != null) && (
        <div className="rounded-xl bg-white px-3 py-2 text-xs" style={{ color: '#8B6650' }}>
          Test A/B: antes {formatNumber(promotion.ventas_antes)} - despues {formatNumber(promotion.ventas_despues)}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onToggle(promotion)}
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold disabled:opacity-40"
          style={{ backgroundColor: '#fff', border: '1px solid #E8D5C0', color: '#8B6650' }}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
          {promotion.activa ? 'Desactivar' : 'Activar'}
        </button>
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold text-white"
          style={{ backgroundColor: '#A67C52' }}
        >
          <Tag className="w-4 h-4" />
          Ver en Promos
        </button>
      </div>
    </div>
  );
}

export function BotDashboardView({ festivalId, festivalNombre, modoAuto, onToggleModo, navigate }: Props) {
  const [periodo, setPeriodo] = useState<BotComprasPeriodo>('hoy');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('ingresos');
  const [selectedPromotionId, setSelectedPromotionId] = useState<number | null>(null);
  const [data, setData] = useState<BotDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [processingDecisionId, setProcessingDecisionId] = useState<number | null>(null);
  const [savingPromotionId, setSavingPromotionId] = useState<number | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getBotComprasDashboard(festivalId, periodo);
      setData(response);
    } catch (error: any) {
      toast.error(error.message || 'No se pudo cargar el dashboard del bot');
    } finally {
      setLoading(false);
    }
  }, [festivalId, periodo]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const result = await evaluarBotCompras(festivalId);
      toast.success(result?.modo_auto ? 'Bot evaluado y ejecutado en modo automatico' : 'Bot evaluado: propuestas listas');
      await loadDashboard();
    } catch (error: any) {
      toast.error(error.message || 'No se pudo evaluar el bot');
    } finally {
      setEvaluating(false);
    }
  };

  const handleApprove = async (id: number) => {
    setProcessingDecisionId(id);
    try {
      await aprobarDecision(id);
      toast.success('Propuesta aprobada');
      await loadDashboard();
    } catch (error: any) {
      toast.error(error.message || 'No se pudo aprobar la propuesta');
    } finally {
      setProcessingDecisionId(null);
    }
  };

  const handleReject = async (id: number) => {
    setProcessingDecisionId(id);
    try {
      await rechazarDecision(id);
      toast.success('Propuesta rechazada');
      await loadDashboard();
    } catch (error: any) {
      toast.error(error.message || 'No se pudo rechazar la propuesta');
    } finally {
      setProcessingDecisionId(null);
    }
  };

  const handleTogglePromotion = async (promotion: BotPromotion) => {
    setSavingPromotionId(promotion.id);
    try {
      await actualizarPromocionGestor(promotion.id, { activa: !promotion.activa });
      toast.success(promotion.activa ? 'Promocion desactivada' : 'Promocion activada');
      await loadDashboard();
    } catch (error: any) {
      toast.error(error.message || 'No se pudo cambiar la promocion');
    } finally {
      setSavingPromotionId(null);
    }
  };

  const pendingDecisions = useMemo(
    () => (data?.decisiones || []).filter((decision) => decision.estado === 'pendiente'),
    [data?.decisiones]
  );
  const historyDecisions = useMemo(
    () => (data?.decisiones || []).filter((decision) => decision.estado !== 'pendiente').slice(0, 6),
    [data?.decisiones]
  );

  const kpis = data?.kpis;
  const lineChartData = useMemo(() => {
    const serie = data?.serie_temporal || [];
    if (serie.length > 0) return serie;

    const usos = Number(kpis?.usos_promociones || 0);
    const unidades = Number(kpis?.unidades_vendidas || 0);
    const ingresos = Number(kpis?.ingresos_con_promocion || 0);
    if (usos <= 0 && unidades <= 0 && ingresos <= 0) return [];

    return [{
      etiqueta: PERIOD_OPTIONS.find((option) => option.value === periodo)?.label || 'Periodo',
      usos,
      unidades,
      ingresos
    }];
  }, [data?.serie_temporal, kpis?.ingresos_con_promocion, kpis?.unidades_vendidas, kpis?.usos_promociones, periodo]);

  const rankingData = useMemo(
    () => [...(data?.promociones || [])]
      .sort((left, right) => getPromotionMetricValue(right, chartMetric) - getPromotionMetricValue(left, chartMetric))
      .slice(0, 8)
      .map((promotion) => ({
        id: promotion.id,
        titulo: promotion.titulo,
        valor: getPromotionMetricValue(promotion, chartMetric),
        usos: Number(promotion.usos || 0),
        ingresos: Number(promotion.ingresos_generados || 0)
      })),
    [chartMetric, data?.promociones]
  );
  const funnelData = useMemo(() => {
    const decisiones = data?.decisiones || [];
    const promociones = data?.promociones || [];
    return [
      { etapa: 'Propuestas', valor: decisiones.length },
      { etapa: 'Aprobadas', valor: decisiones.filter((decision) => decision.estado === 'aprobada' || decision.estado === 'ejecutada').length },
      { etapa: 'Promos activas', valor: promociones.filter((promotion) => promotion.activa).length },
      { etapa: 'Con uso', valor: promociones.filter((promotion) => Number(promotion.usos || 0) > 0).length }
    ];
  }, [data?.decisiones, data?.promociones]);
  const selectedPromotion = useMemo(
    () => (data?.promociones || []).find((promotion) => promotion.id === selectedPromotionId) || null,
    [data?.promociones, selectedPromotionId]
  );

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#FDF6EE' }}>
      <div className="px-4 py-4 space-y-4 pb-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold flex items-center gap-2" style={{ color: '#2C1810' }}>
              <Bot className="w-4 h-4" style={{ color: '#A67C52' }} />
              Bot de compra
            </h2>
            <p className="text-[11px]" style={{ color: '#8B6650' }}>{festivalNombre}</p>
          </div>
          <button
            onClick={loadDashboard}
            disabled={loading || evaluating}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-40"
            style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', color: '#A67C52' }}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Recargar
          </button>
        </div>

        <div className="rounded-2xl border p-4 space-y-4" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {modoAuto
                ? <Zap className="w-5 h-5 text-amber-500" />
                : <Hand className="w-5 h-5" style={{ color: '#A67C52' }} />}
              <div>
                <p className="text-sm font-bold" style={{ color: '#2C1810' }}>
                  {modoAuto ? 'Modo automatico' : 'Modo manual'}
                </p>
                <p className="text-[11px]" style={{ color: '#8B6650' }}>
                  Ultimo refresco: {formatDateTime(data?.actualizado_en)}
                </p>
              </div>
            </div>
            <button
              onClick={onToggleModo}
              className="rounded-full px-3 py-2 text-xs font-bold"
              style={{ backgroundColor: '#fff', border: '1px solid #E8D5C0', color: '#8B6650' }}
            >
              Cambiar modo
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {PERIOD_OPTIONS.map((option) => {
              const active = periodo === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setPeriodo(option.value)}
                  className="rounded-xl py-2 text-xs font-bold transition-colors"
                  style={{
                    backgroundColor: active ? '#A67C52' : '#fff',
                    color: active ? '#fff' : '#8B6650',
                    border: '1px solid #E8D5C0'
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleEvaluate}
            disabled={evaluating || loading}
            className="w-full flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #C8956C, #A67C52)' }}
          >
            {evaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Evaluar bot
          </button>
        </div>

        {loading && !data ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#A67C52' }} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KpiCard icon={Tag} label="Promos activas" value={formatNumber(kpis?.promos_automaticas_activas)} hint={`${formatNumber(kpis?.promos_automaticas)} del bot`} color="#A67C52" />
              <KpiCard icon={Zap} label="Pendientes" value={formatNumber(kpis?.decisiones_pendientes)} hint="Propuestas por revisar" color="#F59E0B" />
              <KpiCard icon={ShoppingBag} label="Usos" value={formatNumber(kpis?.usos_promociones)} hint={`${formatNumber(kpis?.unidades_vendidas)} unidades`} color="#6366F1" />
              <KpiCard icon={Euro} label="Ingresos promo" value={formatMoney(kpis?.ingresos_con_promocion)} color="#4CAF88" />
              <KpiCard icon={Trophy} label="Mejor promo" value={data?.mejor_promocion?.titulo || '-'} hint={data?.mejor_promocion ? formatMoney(data.mejor_promocion.ingresos_generados) : 'Sin usos'} color="#10B981" />
              <KpiCard icon={Tag} label="Menor rendimiento" value={data?.peor_promocion?.titulo || '-'} hint={data?.peor_promocion ? formatMoney(data.peor_promocion.ingresos_generados) : 'Sin usos'} color="#D97706" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <ChartPanel
                title="Evolucion del rendimiento"
                action={(
                  <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: '#fff', border: '1px solid #E8D5C0' }}>
                    {CHART_METRIC_OPTIONS.map((option) => {
                      const active = chartMetric === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => setChartMetric(option.value)}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold"
                          style={{
                            backgroundColor: active ? '#A67C52' : 'transparent',
                            color: active ? '#fff' : '#8B6650'
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              >
                {lineChartData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineChartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C0" />
                        <XAxis dataKey="etiqueta" tick={{ fontSize: 11, fill: '#8B6650' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#8B6650' }} tickFormatter={(value) => chartMetric === 'ingresos' ? `${Number(value).toFixed(0)}` : String(value)} width={34} />
                        <Tooltip
                          formatter={(value: any) => [formatChartValue(value, chartMetric), CHART_METRIC_OPTIONS.find((option) => option.value === chartMetric)?.label]}
                          contentStyle={{ borderRadius: 12, borderColor: '#E8D5C0', color: '#2C1810' }}
                        />
                        <Line type="monotone" dataKey={chartMetric} stroke="#A67C52" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-sm" style={{ color: '#8B6650' }}>
                    Sin datos de uso para el periodo seleccionado.
                  </div>
                )}
              </ChartPanel>

              <ChartPanel
                title="Ranking interactivo"
                action={selectedPromotion && (
                  <span className="text-[11px] font-bold truncate max-w-[180px]" style={{ color: '#8B6650' }}>
                    {selectedPromotion.titulo}
                  </span>
                )}
              >
                {rankingData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rankingData} layout="vertical" margin={{ top: 8, right: 18, bottom: 0, left: 26 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C0" />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#8B6650' }} tickFormatter={(value) => chartMetric === 'ingresos' ? `${Number(value).toFixed(0)}` : String(value)} />
                        <YAxis type="category" dataKey="titulo" width={88} tick={{ fontSize: 10, fill: '#8B6650' }} />
                        <Tooltip
                          formatter={(value: any) => [formatChartValue(value, chartMetric), CHART_METRIC_OPTIONS.find((option) => option.value === chartMetric)?.label]}
                          contentStyle={{ borderRadius: 12, borderColor: '#E8D5C0', color: '#2C1810' }}
                        />
                        <Bar dataKey="valor" radius={[0, 8, 8, 0]} onClick={(entry: any) => setSelectedPromotionId(entry.id)}>
                          {rankingData.map((entry) => (
                            <Cell key={entry.id} fill={selectedPromotionId === entry.id ? '#FF6B35' : '#A67C52'} cursor="pointer" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-sm" style={{ color: '#8B6650' }}>
                    Sin promociones con datos para comparar.
                  </div>
                )}
              </ChartPanel>

              <ChartPanel title="Embudo del bot">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C0" />
                      <XAxis dataKey="etapa" tick={{ fontSize: 10, fill: '#8B6650' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8B6650' }} width={28} />
                      <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#E8D5C0', color: '#2C1810' }} />
                      <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                        {funnelData.map((entry, index) => (
                          <Cell key={entry.etapa} fill={['#A67C52', '#4CAF88', '#6366F1', '#F59E0B'][index]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>

              {selectedPromotion && (
                <ChartPanel title="Promo seleccionada">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-white px-3 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#C8956C' }}>Usos</p>
                      <p className="text-lg font-extrabold" style={{ color: '#2C1810' }}>{formatNumber(selectedPromotion.usos)}</p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#C8956C' }}>Unidades</p>
                      <p className="text-lg font-extrabold" style={{ color: '#2C1810' }}>{formatNumber(selectedPromotion.unidades_vendidas)}</p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#C8956C' }}>Ingresos</p>
                      <p className="text-lg font-extrabold" style={{ color: '#2C1810' }}>{formatMoney(selectedPromotion.ingresos_generados)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPromotionId(null)}
                    className="rounded-full px-3 py-2 text-xs font-bold"
                    style={{ backgroundColor: '#fff', border: '1px solid #E8D5C0', color: '#8B6650' }}
                  >
                    Quitar seleccion
                  </button>
                </ChartPanel>
              )}
            </div>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#C8956C' }}>
                  Propuestas del bot
                </h3>
                <span className="text-[11px]" style={{ color: '#8B6650' }}>{pendingDecisions.length} pendientes</span>
              </div>

              {pendingDecisions.length > 0 ? (
                pendingDecisions.map((decision) => (
                  <DecisionCard
                    key={decision.id}
                    decision={decision}
                    modoAuto={modoAuto}
                    onAprobar={handleApprove}
                    onRechazar={handleReject}
                    loading={processingDecisionId === decision.id}
                  />
                ))
              ) : (
                <div className="rounded-2xl border px-4 py-6 text-center text-sm" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', color: '#8B6650' }}>
                  No hay propuestas pendientes del bot de compra.
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#C8956C' }}>
                  Promociones automaticas
                </h3>
                <button
                  onClick={() => navigate('promotions')}
                  className="text-[11px] font-bold"
                  style={{ color: '#A67C52' }}
                >
                  Ir a promociones
                </button>
              </div>

              {(data?.promociones || []).length > 0 ? (
                data?.promociones.map((promotion) => (
                  <PromotionPerformanceRow
                    key={promotion.id}
                    promotion={promotion}
                    savingId={savingPromotionId}
                    onToggle={handleTogglePromotion}
                    onEdit={() => navigate('promotions')}
                  />
                ))
              ) : (
                <div className="rounded-2xl border px-4 py-6 text-center text-sm" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', color: '#8B6650' }}>
                  Todavia no hay promociones atribuibles al bot.
                </div>
              )}
            </section>

            {historyDecisions.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#C8956C' }}>
                  Historial reciente
                </h3>
                {historyDecisions.map((decision) => (
                  <DecisionCard
                    key={decision.id}
                    decision={decision}
                    modoAuto={modoAuto}
                    onAprobar={handleApprove}
                    onRechazar={handleReject}
                    loading={processingDecisionId === decision.id}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
