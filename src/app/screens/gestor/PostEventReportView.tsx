import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
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
  AlertTriangle,
  BarChart2,
  Euro,
  Loader2,
  Package,
  RefreshCw,
  ShoppingBag,
  Star,
  Store,
  Trophy
} from 'lucide-react';
import { getPostEventoInforme, type PostEventoInforme } from '../../api';
import { toast } from 'sonner';

interface Props {
  festivalId: number;
  festivalNombre: string;
}

const COLORS = ['#A67C52', '#4CAF88', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6'];

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

function formatPct(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return '-';
  return `${numeric.toFixed(0)}%`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function KpiCard({ icon: Icon, label, value, hint, color = '#A67C52' }: {
  icon: typeof Euro;
  label: string;
  value: string;
  hint?: string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border px-4 py-4" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8B6650' }}>{label}</p>
          <p className="text-2xl font-black mt-2 leading-none" style={{ color: '#2C1810' }}>{value}</p>
          {hint && <p className="text-xs mt-2" style={{ color: '#8B6650' }}>{hint}</p>}
        </div>
        <Icon className="w-5 h-5 flex-shrink-0" style={{ color }} />
      </div>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border p-4" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: '#8B6650' }}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="h-44 flex flex-col items-center justify-center text-center gap-2" style={{ color: '#8B6650' }}>
      <AlertTriangle className="w-7 h-7" style={{ color: '#C8956C' }} />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function PostEventReportView({ festivalId, festivalNombre }: Props) {
  const [data, setData] = useState<PostEventoInforme | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setData(await getPostEventoInforme(festivalId));
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar el informe post-evento');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [festivalId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const hourlyData = useMemo(() => (data?.ventas_por_hora || []).map((row) => ({
    ...row,
    ingresos: Number(row.ingresos || 0),
    pedidos: Number(row.pedidos || 0),
    valor_perdido_estimado: Number(row.valor_perdido_estimado || 0)
  })), [data?.ventas_por_hora]);

  const maxLostStand = useMemo(
    () => [...(data?.ventas_perdidas_por_puesto || [])].sort((a, b) => Number(b.valor_perdido_estimado || 0) - Number(a.valor_perdido_estimado || 0))[0] || null,
    [data?.ventas_perdidas_por_puesto]
  );

  const k = data?.kpis;

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#FDF6EE' }}>
      <div className="px-5 py-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black flex items-center gap-2" style={{ color: '#2C1810' }}>
              <BarChart2 className="w-5 h-5" style={{ color: '#A67C52' }} />
              Informe post-evento
            </h1>
            <p className="text-sm mt-1" style={{ color: '#8B6650' }}>{data?.festival?.nombre || festivalNombre}</p>
            {data?.generado_en && (
              <p className="text-[11px] mt-1" style={{ color: '#C8956C' }}>Generado {formatDateTime(data.generado_en)}</p>
            )}
          </div>
          <button
            onClick={loadReport}
            disabled={loading}
            className="rounded-full px-4 py-2 text-sm font-bold flex items-center gap-2 disabled:opacity-60"
            style={{ border: '1px solid #E8D5C0', color: '#A67C52', backgroundColor: '#FFF3E4' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Recargar
          </button>
        </div>

        {loading && !data ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#A67C52' }} />
          </div>
        ) : !data ? (
          <EmptyBlock message="Sin informe disponible para este festival." />
        ) : (
          <>
            <div className="rounded-3xl border p-5" style={{ backgroundColor: '#2C1810', borderColor: '#2C1810' }}>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider flex items-center gap-2" style={{ color: '#F9D29D' }}>
                    <Star className="w-4 h-4" />
                    Dato estrella
                  </p>
                  <p className="text-4xl font-black mt-3 text-white">{formatMoney(k?.valor_ventas_perdidas_estimado)}</p>
                  <p className="text-sm mt-2" style={{ color: '#F9D29D' }}>
                    {formatNumber(k?.pedidos_perdidos_estimados)} ventas perdidas estimadas
                  </p>
                </div>
                <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#F9D29D' }}>Mayor foco</p>
                  <p className="text-lg font-black text-white mt-1">{maxLostStand?.puesto_nombre || 'Sin saturacion'}</p>
                  <p className="text-xs mt-1" style={{ color: '#F9D29D' }}>
                    {maxLostStand ? `${formatMoney(maxLostStand.valor_perdido_estimado)} estimados` : data.metodologia_ventas_perdidas}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <KpiCard icon={Euro} label="Ingresos reales" value={formatMoney(k?.ingresos_total)} />
              <KpiCard icon={ShoppingBag} label="Pedidos" value={formatNumber(k?.pedidos_total)} hint={`Ticket ${formatMoney(k?.ticket_medio)}`} color="#6366F1" />
              <KpiCard icon={Package} label="Unidades vendidas" value={formatNumber(k?.unidades_vendidas)} color="#4CAF88" />
              <KpiCard icon={Trophy} label="Hora pico" value={k?.hora_pico || '-'} hint={formatMoney(k?.ingresos_hora_pico)} color="#F59E0B" />
            </div>

            <Panel
              title="Ventas por hora"
              action={<span className="text-[11px] font-bold" style={{ color: '#8B6650' }}>{formatNumber(k?.horas_con_ventas)} franjas</span>}
            >
              {hourlyData.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hourlyData} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C0" />
                      <XAxis dataKey="etiqueta" interval="preserveStartEnd" minTickGap={24} tick={{ fontSize: 10, fill: '#8B6650' }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#8B6650' }} tickFormatter={(value) => `${Number(value).toFixed(0)}`} width={42} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#6366F1' }} width={34} />
                      <Tooltip
                        formatter={(value: any, name: string) => {
                          if (name.includes('Ingresos') || name.includes('perdido')) return [formatMoney(value), name];
                          return [formatNumber(value), name];
                        }}
                        contentStyle={{ borderRadius: 12, borderColor: '#E8D5C0', color: '#2C1810' }}
                      />
                      <Line yAxisId="left" type="monotone" dataKey="ingresos" stroke="#A67C52" strokeWidth={3} dot={false} name="Ingresos" />
                      <Line yAxisId="left" type="monotone" dataKey="valor_perdido_estimado" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Valor perdido estimado" />
                      <Line yAxisId="right" type="monotone" dataKey="pedidos" stroke="#6366F1" strokeWidth={2} dot={false} name="Pedidos" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyBlock message="Sin ventas registradas por hora." />
              )}
            </Panel>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Panel title="Ranking de productos">
                {data.productos_top.length > 0 ? (
                  <div className="space-y-2">
                    {data.productos_top.map((producto, index) => (
                      <div key={producto.producto_id} className="rounded-xl bg-white px-3 py-3 flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black" style={{ backgroundColor: '#FDF6EE', color: '#A67C52' }}>
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black truncate" style={{ color: '#2C1810' }}>{producto.nombre}</p>
                          <p className="text-[11px] truncate" style={{ color: '#8B6650' }}>{producto.puesto_nombre}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black" style={{ color: '#2C1810' }}>{formatNumber(producto.unidades)}</p>
                          <p className="text-[11px]" style={{ color: '#8B6650' }}>{formatMoney(producto.ingresos)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyBlock message="Sin productos vendidos." />
                )}
              </Panel>

              <Panel title="Barras mas eficientes">
                {data.barras_eficientes.length > 0 ? (
                  <div className="space-y-3">
                    {data.barras_eficientes.slice(0, 8).map((barra, index) => (
                      <div key={barra.puesto_id} className="rounded-xl bg-white px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-black truncate" style={{ color: '#2C1810' }}>{index + 1}. {barra.nombre}</p>
                            <p className="text-[11px]" style={{ color: '#8B6650' }}>
                              {formatMoney(barra.ingresos_por_empleado)} por empleado
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black" style={{ color: '#2C1810' }}>{formatPct(barra.eficiencia_pct)}</p>
                            <p className="text-[11px]" style={{ color: '#8B6650' }}>{formatNumber(barra.pedidos)} pedidos</p>
                          </div>
                        </div>
                        <div className="h-2 rounded-full mt-3 overflow-hidden" style={{ backgroundColor: '#F3E5D8' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(Number(barra.eficiencia_pct || 0), 100)}%`, backgroundColor: COLORS[index % COLORS.length] }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyBlock message="Sin barras para analizar." />
                )}
              </Panel>
            </div>

            <Panel title="Ventas perdidas por puesto">
              {data.ventas_perdidas_por_puesto.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.ventas_perdidas_por_puesto.slice(0, 8)} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 22 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C0" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#8B6650' }} tickFormatter={(value) => `${Number(value).toFixed(0)}`} />
                      <YAxis type="category" dataKey="puesto_nombre" width={110} tick={{ fontSize: 10, fill: '#8B6650' }} />
                      <Tooltip formatter={(value: any) => [formatMoney(value), 'Valor perdido estimado']} contentStyle={{ borderRadius: 12, borderColor: '#E8D5C0', color: '#2C1810' }} />
                      <Bar dataKey="valor_perdido_estimado" radius={[0, 8, 8, 0]}>
                        {data.ventas_perdidas_por_puesto.slice(0, 8).map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyBlock message="No se detectaron franjas saturadas con ventas perdidas estimadas." />
              )}
              <p className="text-[11px] mt-3" style={{ color: '#8B6650' }}>{data.metodologia_ventas_perdidas}</p>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
