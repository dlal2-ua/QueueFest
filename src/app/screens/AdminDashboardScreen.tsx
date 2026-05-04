import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDwFestivales } from '../api';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft, RefreshCw, AlertTriangle,
  LayoutDashboard, TrendingUp, Utensils, Package, Archive,
  Bell, Users, Award, Tag, BarChart2, Activity, Map,
} from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

type Section =
  | 'resumen' | 'ingresos' | 'puestos' | 'productos'
  | 'stock' | 'alertas' | 'usuarios' | 'loyalty'
  | 'promos' | 'clv' | 'prediccion' | 'heatmap';

const SECTIONS: { id: Section; label: string; Icon: React.ElementType }[] = [
  { id: 'resumen',    label: 'Resumen',    Icon: LayoutDashboard },
  { id: 'ingresos',  label: 'Ingresos',   Icon: TrendingUp },
  { id: 'puestos',   label: 'Puestos',    Icon: Utensils },
  { id: 'productos', label: 'Productos',  Icon: Package },
  { id: 'stock',     label: 'Stock',      Icon: Archive },
  { id: 'alertas',   label: 'Alertas',    Icon: Bell },
  { id: 'usuarios',  label: 'Usuarios',   Icon: Users },
  { id: 'loyalty',   label: 'Loyalty',    Icon: Award },
  { id: 'promos',    label: 'Promos',     Icon: Tag },
  { id: 'clv',       label: 'CLV',        Icon: BarChart2 },
  { id: 'prediccion',label: 'Predicción', Icon: Activity },
  { id: 'heatmap',   label: 'Heatmap',    Icon: Map },
];

const BLUE   = '#2563eb';
const TEAL   = '#0d9488';
const AMBER  = '#b45309';
const RED    = '#dc2626';
const GREEN  = '#16a34a';
const PURPLE = '#7c3aed';
const GRAY   = '#888780';
const COLORS = [BLUE, TEAL, AMBER, RED, GREEN, PURPLE, GRAY];

const SEG_COLORS: Record<string, string> = {
  VIP: PURPLE, frecuente: BLUE, ocasional: TEAL, inactivo: GRAY,
};
const NIV_COLORS: Record<string, string> = {
  fan: GRAY, bronce: AMBER, plata: '#71717a', oro: '#d97706', platino: PURPLE,
};

function fmtE(n: number | null | undefined) {
  if (n == null) return '—';
  return '€' + Math.round(n).toLocaleString('es-ES');
}
function fmtN(n: number | null | undefined) {
  if (n == null) return '—';
  return Math.round(n).toLocaleString('es-ES');
}
function fmtPct(n: number | null | undefined) {
  if (n == null) return '—';
  return Math.round(n) + '%';
}
function fmtMin(n: number | null | undefined) {
  if (n == null) return '—';
  return Math.round(n) + 'min';
}
function formatRelTime(isoStr: string | null | undefined) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `hace ${min}min`;
  return `hace ${Math.floor(min / 60)}h`;
}

function KpiCard({ label, value, sub, subClass }: {
  label: string; value: string; sub?: string; subClass?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-bold leading-none text-gray-900">{value}</div>
      {sub && <div className={`text-xs mt-1 ${subClass || 'text-gray-400'}`}>{sub}</div>}
    </div>
  );
}

function EmptyState({ message = 'Sin datos disponibles' }: { message?: string }) {
  return (
    <div className="text-center py-10 text-gray-400 text-sm">
      <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
      {message}
    </div>
  );
}

function SectionCard({ title, children, action }: {
  title: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-800">{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

function TipoBadge({ tipo }: { tipo: string }) {
  if (tipo === 'barra') return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700">Barra</span>;
  if (tipo === 'foodtruck') return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">Foodtruck</span>;
  return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-600">{tipo}</span>;
}

function EstadoBadge({ estado }: { estado: string }) {
  if (estado === 'saturado') return <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-700">Saturado</span>;
  if (estado === 'bajo_rendimiento') return <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700">Bajo rend.</span>;
  return <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700">Normal</span>;
}

function SegmentoBadge({ segmento }: { segmento: string }) {
  const cls =
    segmento === 'VIP'       ? 'bg-purple-100 text-purple-700'
    : segmento === 'frecuente' ? 'bg-blue-100 text-blue-700'
    : segmento === 'inactivo'  ? 'bg-red-100 text-red-700'
    : 'bg-gray-100 text-gray-600';
  return <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${cls}`}>{segmento}</span>;
}

function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 mt-2 text-xs">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1 text-gray-600">
          <span className="w-3 h-3 rounded-sm inline-block flex-shrink-0" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/* ─── MAIN SCREEN ─────────────────────────────────────────────────────────── */
export function AdminDashboardScreen() {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>('resumen');
  const [festivales, setFestivales] = useState<any[]>([]);
  const [festivalId, setFestivalId] = useState<string>('');
  const [tipo, setTipo] = useState<string>('');
  const [periodo, setPeriodo] = useState<string>('todo');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const getToken = () => localStorage.getItem('token');

  const apiFetch = useCallback(async (path: string, extra: Record<string, string> = {}) => {
    const params: Record<string, string> = { periodo, ...extra };
    if (festivalId) params.festival_id = festivalId;
    if (tipo) params.tipo_puesto = tipo;
    Object.keys(params).forEach(k => !params[k] && delete params[k]);
    const qs = new URLSearchParams(params).toString();
    const url = `${API_BASE}${path}${qs ? '?' + qs : ''}`;
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, [festivalId, tipo, periodo]);

  useEffect(() => {
    getDwFestivales().then((d: any[]) => {
      if (Array.isArray(d)) setFestivales(d);
    }).catch(() => {});
  }, []);

  const loadSection = useCallback(async (sec: Section) => {
    setLoading(true);
    setData(null);
    try {
      let result: any = {};
      switch (sec) {
        case 'resumen': {
          const [resumen, porPuesto, porTipo] = await Promise.all([
            apiFetch('/dashboard/resumen'),
            apiFetch('/dashboard/ingresos-por-puesto'),
            apiFetch('/dashboard/pedidos-por-tipo'),
          ]);
          result = { resumen, porPuesto, porTipo };
          break;
        }
        case 'ingresos':    { result = await apiFetch('/dashboard/ingresos-actividad'); break; }
        case 'puestos': {
          const [kpis, tabla, espera] = await Promise.all([
            apiFetch('/dashboard/puestos/kpis'),
            apiFetch('/dashboard/puestos/tabla'),
            apiFetch('/dashboard/puestos/espera'),
          ]);
          result = { kpis, tabla, espera };
          break;
        }
        case 'productos':   { result = await apiFetch('/dashboard/productos'); break; }
        case 'stock':       { result = await apiFetch('/dashboard/stock'); break; }
        case 'alertas':     { result = await apiFetch('/dashboard/alertas', { resuelta: 'false' }); break; }
        case 'usuarios':    { result = await apiFetch('/dashboard/usuarios'); break; }
        case 'loyalty':     { result = await apiFetch('/dashboard/loyalty'); break; }
        case 'promos':      { result = await apiFetch('/dashboard/promociones'); break; }
        case 'clv':         { result = await apiFetch('/dashboard/clv'); break; }
        case 'prediccion':  { result = await apiFetch('/dashboard/prediccion'); break; }
        case 'heatmap':     { result = await apiFetch('/dashboard/heatmap'); break; }
      }
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadSection(section);
  }, [section, festivalId, tipo, periodo]); // eslint-disable-line react-hooks/exhaustive-deps

  const resolverAlerta = async (id: number) => {
    try { await apiFetch(`/alertas/${id}/resolver`); loadSection('alertas'); } catch {}
  };
  const marcarTodasResueltas = async () => {
    try { await apiFetch('/alertas/resolver-todas'); loadSection('alertas'); } catch {}
  };

  const filterSelects = (
    <>
      <select value={festivalId} onChange={e => setFestivalId(e.target.value)}
        className="bg-gray-800 text-white text-xs border border-gray-700 rounded-lg px-2 py-1.5 outline-none min-w-[140px]">
        <option value="">Todos los festivales</option>
        {festivales.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
      </select>
      <select value={tipo} onChange={e => setTipo(e.target.value)}
        className="bg-gray-800 text-white text-xs border border-gray-700 rounded-lg px-2 py-1.5 outline-none">
        <option value="">Todos los tipos</option>
        <option value="barra">Barras</option>
        <option value="foodtruck">Foodtrucks</option>
      </select>
      <select value={periodo} onChange={e => setPeriodo(e.target.value)}
        className="bg-gray-800 text-white text-xs border border-gray-700 rounded-lg px-2 py-1.5 outline-none">
        <option value="todo">Todo</option>
        <option value="mes">Este mes</option>
        <option value="sem">Esta semana</option>
        <option value="hoy">Hoy</option>
      </select>
    </>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border-b-4 border-red-600 text-white px-4 py-3 shadow-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => (window as any).navigateTo('/admin')}
            className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-none">Dashboard</h1>
            <p className="text-gray-400 text-xs mt-0.5">Sesión: {user?.nombre || 'Administrador'}</p>
          </div>
          {/* Filters inline on large screens */}
          <div className="hidden lg:flex items-center gap-2">
            {filterSelects}
          </div>
          <button onClick={() => loadSection(section)}
            className="text-gray-400 hover:text-white transition-colors ml-1">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {/* Filters stacked on mobile */}
        <div className="mt-3 flex gap-2 flex-wrap lg:hidden">
          {filterSelects}
        </div>
      </div>

      {/* ── Body: sidebar + content ──────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — large screens only */}
        <aside className="hidden lg:flex flex-col w-52 bg-gray-900 border-r border-gray-800 overflow-y-auto flex-shrink-0 py-3">
          {SECTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`flex items-center gap-3 mx-2 mb-0.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                section === id
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Mobile tabs */}
          <div className="lg:hidden grid grid-cols-6 bg-white border-b border-gray-200 flex-shrink-0">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`px-1 py-2 text-[11px] font-medium text-center transition-colors ${
                  section === s.id
                    ? 'border-b-2 border-red-600 text-red-600'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {loading && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {!loading && (
              <>
                {section === 'resumen'    && <SeccionResumen data={data} />}
                {section === 'ingresos'   && <SeccionIngresos data={data} />}
                {section === 'puestos'    && <SeccionPuestos data={data} />}
                {section === 'productos'  && <SeccionProductos data={data} />}
                {section === 'stock'      && <SeccionStock data={data} />}
                {section === 'alertas'    && <SeccionAlertas data={data} onResolver={resolverAlerta} onMarcarTodas={marcarTodasResueltas} />}
                {section === 'usuarios'   && <SeccionUsuarios data={data} />}
                {section === 'loyalty'    && <SeccionLoyalty data={data} />}
                {section === 'promos'     && <SeccionPromos data={data} />}
                {section === 'clv'        && <SeccionCLV data={data} />}
                {section === 'prediccion' && <SeccionPrediccion data={data} />}
                {section === 'heatmap'    && <SeccionHeatmap data={data} festivalId={festivalId} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── SECCIÓN 1: RESUMEN GLOBAL ─────────────────────────────────────────── */
function SeccionResumen({ data }: { data: any }) {
  if (!data) return <EmptyState message="No hay datos de resumen. Verifica que el backend tenga los endpoints de dashboard." />;
  const r = data.resumen || {};
  const porPuesto: any[] = data.porPuesto || [];
  const porTipo: any[] = data.porTipo || [];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Ingresos totales" value={fmtE(r.ingresos_total)}
          sub={r.crecimiento_pct != null ? (r.crecimiento_pct >= 0 ? '+' : '') + Math.round(r.crecimiento_pct) + '% vs anterior' : undefined}
          subClass={r.crecimiento_pct >= 0 ? 'text-green-600' : 'text-red-500'} />
        <KpiCard label="Total pedidos" value={fmtN(r.pedidos_total)}
          sub={r.ratio_cancelados_pct != null ? fmtPct(r.ratio_cancelados_pct) + ' cancelados' : undefined} />
        <KpiCard label="Ticket medio" value={fmtE(r.ticket_medio)} sub="por pedido" />
        <KpiCard label="Usuarios activos" value={fmtN(r.usuarios_activos)} />
        <KpiCard label="Barras activas" value={fmtN(r.barras_activas)} sub="tipo barra" />
        <KpiCard label="Foodtrucks" value={fmtN(r.foodtrucks_activos)} sub="tipo foodtruck" />
        <KpiCard label="Completados" value={fmtPct(r.ratio_completados_pct)} subClass="text-green-600" sub="del total" />
        <KpiCard label="Espera media" value={fmtMin(r.espera_media_min)} sub="minutos" />
      </div>

      {(porPuesto.length > 0 || porTipo.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {porPuesto.length > 0 && (
            <SectionCard title="Ingresos por puesto">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={porPuesto} layout="vertical" margin={{ top: 5, right: 35, bottom: 5, left: 5 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => fmtE(v)} />
                  <YAxis type="category" dataKey="puesto_nombre" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip formatter={(v: any) => fmtE(v)} />
                  <Bar dataKey="ingresos" radius={4}>
                    {porPuesto.map((p, i) => (
                      <Cell key={i} fill={p.tipo === 'barra' ? BLUE + '99' : AMBER + '99'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ChartLegend items={[{ color: BLUE, label: 'Barras' }, { color: AMBER, label: 'Foodtrucks' }]} />
            </SectionCard>
          )}
          {porTipo.length > 0 && (
            <SectionCard title="Pedidos por tipo">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={porTipo} dataKey="total_pedidos" nameKey="tipo" cx="50%" cy="50%" outerRadius={85}>
                    {porTipo.map((t, i) => (
                      <Cell key={i} fill={t.tipo === 'barra' ? BLUE : AMBER} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmtN(v)} />
                </PieChart>
              </ResponsiveContainer>
              <ChartLegend items={porTipo.map(t => ({ color: t.tipo === 'barra' ? BLUE : AMBER, label: `${t.tipo} ${fmtPct(t.pct)}` }))} />
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── SECCIÓN 2: INGRESOS Y ACTIVIDAD ──────────────────────────────────── */
function SeccionIngresos({ data }: { data: any }) {
  if (!data) return <EmptyState message="No hay datos de ingresos disponibles." />;
  const k = data.kpis || {};
  const porHora: any[] = (data.por_hora || []).map((h: any) => ({ ...h, hora: h.hora + 'h' }));
  const pagos: any[] = data.metodos_pago || [];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Ingresos" value={fmtE(k.ingresos_total)} />
        <KpiCard label="Pedidos" value={fmtN(k.pedidos_total)} />
        <KpiCard label="Ticket medio" value={fmtE(k.ticket_medio)} />
        <KpiCard label="Ratio conversión" value={fmtPct(k.ratio_conversion_pct)} sub="usuarios → pedidos" />
      </div>

      {porHora.length > 0 && (
        <SectionCard title="Ingresos y pedidos por hora">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={porHora} margin={{ top: 10, right: 55, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hora" tick={{ fontSize: 9 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 9 }} tickFormatter={v => '€' + v} width={55} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: TEAL }} width={40} />
              <Tooltip />
              <Bar yAxisId="left" dataKey="ingresos" fill={BLUE + '99'} radius={3} name="Ingresos" />
              <Line yAxisId="right" type="monotone" dataKey="pedidos" stroke={TEAL} dot={false} name="Pedidos" strokeWidth={2} />
            </BarChart>
          </ResponsiveContainer>
          <ChartLegend items={[{ color: BLUE, label: 'Ingresos' }, { color: TEAL, label: 'Pedidos' }]} />
        </SectionCard>
      )}

      {porHora.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard title="Ticket medio por hora">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={porHora} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <XAxis dataKey="hora" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => '€' + v} width={55} />
                <Tooltip formatter={(v: any) => fmtE(v)} />
                <Line type="monotone" dataKey="ticket_medio" stroke={PURPLE} dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>

          {pagos.length > 0 && (
            <SectionCard title="Métodos de pago">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pagos} dataKey="total" nameKey="nombre" cx="50%" cy="50%" outerRadius={75}>
                    {pagos.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmtE(v)} />
                </PieChart>
              </ResponsiveContainer>
              <ChartLegend items={pagos.map((p: any, i: number) => ({ color: COLORS[i % COLORS.length], label: `${p.nombre} ${fmtPct(p.pct)}` }))} />
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── SECCIÓN 3: PUESTOS ────────────────────────────────────────────────── */
function SeccionPuestos({ data }: { data: any }) {
  if (!data) return <EmptyState message="No hay datos de puestos disponibles." />;
  const k = data.kpis || {};
  const tabla: any[] = data.tabla || [];
  const espera: any[] = data.espera || [];
  const barras = tabla.filter((p: any) => p.tipo === 'barra');

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Puestos activos" value={fmtN(k.puestos_activos)} />
        <KpiCard label="Espera media" value={fmtMin(k.espera_media_min)} sub="minutos" />
        <KpiCard label="Ingreso medio/puesto" value={fmtE(k.ingreso_medio_puesto)} />
        <KpiCard label="Saturados ahora" value={fmtN(k.saturados)} subClass="text-red-500" />
      </div>

      {tabla.length > 0 && (
        <SectionCard title="Tabla de puestos">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1.5 px-1 text-gray-400 font-semibold">Puesto</th>
                  <th className="text-left py-1.5 px-1 text-gray-400 font-semibold">Tipo</th>
                  <th className="text-right py-1.5 px-1 text-gray-400 font-semibold">Ingr.</th>
                  <th className="text-right py-1.5 px-1 text-gray-400 font-semibold">Ped.</th>
                  <th className="text-right py-1.5 px-1 text-gray-400 font-semibold">Ticket</th>
                  <th className="text-right py-1.5 px-1 text-gray-400 font-semibold">Espera</th>
                  <th className="text-right py-1.5 px-1 text-gray-400 font-semibold">Est.</th>
                </tr>
              </thead>
              <tbody>
                {tabla.map((p: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 px-1 font-medium text-gray-800 max-w-[120px] truncate">{p.nombre}</td>
                    <td className="py-1.5 px-1"><TipoBadge tipo={p.tipo} /></td>
                    <td className="py-1.5 px-1 text-right text-gray-700">{fmtE(p.ingresos)}</td>
                    <td className="py-1.5 px-1 text-right text-gray-700">{fmtN(p.pedidos)}</td>
                    <td className="py-1.5 px-1 text-right text-gray-700">{fmtE(p.ticket_medio)}</td>
                    <td className="py-1.5 px-1 text-right font-semibold" style={{ color: p.espera_min > 15 ? RED : p.espera_min > 10 ? AMBER : GREEN }}>
                      {fmtMin(p.espera_min)}
                    </td>
                    <td className="py-1.5 px-1 text-right"><EstadoBadge estado={p.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {espera.length > 0 && (
          <SectionCard title="Tiempo de espera por puesto">
            <ResponsiveContainer width="100%" height={Math.max(200, espera.length * 36)}>
              <BarChart data={espera} layout="vertical" margin={{ top: 5, right: 50, bottom: 5, left: 5 }}>
                <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={v => v + 'min'} domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.25)]} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={100} />
                <Tooltip formatter={(v: any) => v + 'min'} />
                <Bar dataKey="espera_min" radius={4} name="Espera">
                  {espera.map((p: any, i: number) => (
                    <Cell key={i} fill={p.espera_min > 15 ? RED : p.espera_min > 10 ? AMBER : GREEN} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        )}

        {barras.length > 0 && (
          <SectionCard title="Ocupación (barras)">
            <div className="space-y-3">
              {barras.map((p: any, i: number) => {
                const pct = Math.round(p.ratio_ocupacion_pct || 0);
                const color = pct > 85 ? RED : pct > 60 ? AMBER : GREEN;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-800">{p.nombre}</span>
                      <span className="text-gray-400">{p.ocupacion_actual}/{p.capacidad_max}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

/* ─── SECCIÓN 4: PRODUCTOS ──────────────────────────────────────────────── */
function SeccionProductos({ data }: { data: any }) {
  if (!data) return <EmptyState message="No hay datos de productos disponibles." />;
  const k = data.kpis || {};
  const lista: any[] = data.lista || [];
  const sorted = [...lista].sort((a, b) => b.margen - a.margen);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Ingresos totales" value={fmtE(k.ingresos_total)} />
        <KpiCard label="Coste total" value={fmtE(k.coste_total)} />
        <KpiCard label="Margen total" value={fmtE(k.margen_total)} sub={fmtPct(k.margen_pct)} subClass="text-green-600" />
        <KpiCard label="Mejor producto" value={k.mejor_producto || '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {lista.length > 0 && (
          <SectionCard title="Ingresos vs margen por producto">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={lista} margin={{ top: 10, right: 25, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="nombre" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={60} interval={0} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => '€' + v} width={55} domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]} />
                <Tooltip formatter={(v: any) => fmtE(v)} />
                <Bar dataKey="ingresos" fill={BLUE + '99'} name="Ingresos" radius={3} />
                <Bar dataKey="margen" fill={TEAL + '99'} name="Margen" radius={3} />
              </BarChart>
            </ResponsiveContainer>
            <ChartLegend items={[{ color: BLUE, label: 'Ingresos' }, { color: TEAL, label: 'Margen' }]} />
          </SectionCard>
        )}

        {sorted.length > 0 && (
          <SectionCard title="Ranking de productos por margen">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1 px-1 text-gray-400">#</th>
                  <th className="text-left py-1 px-1 text-gray-400">Producto</th>
                  <th className="text-right py-1 px-1 text-gray-400">Margen</th>
                  <th className="text-right py-1 px-1 text-gray-400">%</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1 px-1 text-gray-400">{i + 1}</td>
                    <td className="py-1 px-1 font-medium">{p.nombre}</td>
                    <td className="py-1 px-1 text-right">{fmtE(p.margen)}</td>
                    <td className="py-1 px-1 text-right font-semibold text-green-600">{fmtPct(p.margen_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

/* ─── SECCIÓN 5: STOCK ──────────────────────────────────────────────────── */
function SeccionStock({ data }: { data: any }) {
  if (!data) return <EmptyState message="No hay datos de stock disponibles." />;
  const k = data.kpis || {};
  const materias: any[] = data.materias || [];
  const top6 = materias.slice(0, 6);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Alertas críticas" value={fmtN(k.alertas_criticas)} subClass="text-red-500" />
        <KpiCard label="Alertas bajas" value={fmtN(k.alertas_bajas)} subClass="text-amber-600" />
        <KpiCard label="Sin alerta" value={fmtN(k.sin_alerta)} subClass="text-green-600" />
        <KpiCard label="Bloqueados" value={fmtN(k.productos_bloqueados)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {materias.length > 0 && (
          <SectionCard title="Estado de stock por materia prima">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-1 px-1 text-gray-400">Materia</th>
                    <th className="text-left py-1 px-1 text-gray-400">Ud.</th>
                    <th className="text-right py-1 px-1 text-gray-400">Stock</th>
                    <th className="text-right py-1 px-1 text-gray-400">Mín</th>
                    <th className="text-right py-1 px-1 text-gray-400">Cons/h</th>
                    <th className="text-right py-1 px-1 text-gray-400">h rotura</th>
                    <th className="text-right py-1 px-1 text-gray-400">Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {materias.map((m: any, i: number) => {
                    const pct = m.stock_actual / m.stock_minimo;
                    const badgeClass = pct < 0.3 ? 'bg-red-100 text-red-700' : pct < 1 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
                    const label = pct < 0.3 ? 'Crítico' : pct < 1 ? 'Bajo' : 'OK';
                    return (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1.5 px-1 font-medium truncate max-w-[80px]">{m.nombre}</td>
                        <td className="py-1.5 px-1 text-gray-400">{m.unidad_medida}</td>
                        <td className="py-1.5 px-1 text-right">{m.stock_actual}</td>
                        <td className="py-1.5 px-1 text-right text-gray-400">{m.stock_minimo}</td>
                        <td className="py-1.5 px-1 text-right text-gray-600">{m.consumo_hora != null ? m.consumo_hora + '/h' : '—'}</td>
                        <td className="py-1.5 px-1 text-right font-semibold" style={{ color: m.horas_hasta_rotura < 3 ? RED : 'inherit' }}>
                          {m.horas_hasta_rotura != null ? m.horas_hasta_rotura + 'h' : '—'}
                        </td>
                        <td className="py-1.5 px-1 text-right">
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${badgeClass}`}>{label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {top6.length > 0 && (
          <SectionCard title="Consumo por hora (top materias)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={top6} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="nombre" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={48} />
                <YAxis tick={{ fontSize: 9 }} width={40} />
                <Tooltip />
                <Bar dataKey="consumo_hora" radius={4} name="Consumo/h">
                  {top6.map((m: any, i: number) => (
                    <Cell key={i} fill={m.esta_agotado ? RED : m.tiene_alerta ? AMBER : GREEN} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

/* ─── SECCIÓN 6: ALERTAS ────────────────────────────────────────────────── */
function SeccionAlertas({ data, onResolver, onMarcarTodas }: {
  data: any;
  onResolver: (id: number) => void;
  onMarcarTodas: () => void;
}) {
  const [filtroCategoria, setFiltroCategoria] = useState('');
  if (!data) return <EmptyState message="No hay datos de alertas disponibles." />;
  const k = data.kpis || {};
  const alertas: any[] = data.alertas || data.lista || [];
  const filtradas = filtroCategoria ? alertas.filter((a: any) => a.categoria === filtroCategoria) : alertas;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Críticas" value={fmtN(k.criticas)} subClass="text-red-500" />
        <KpiCard label="Advertencias" value={fmtN(k.advertencias)} subClass="text-amber-600" />
        <KpiCard label="Saturados" value={fmtN(k.saturados)} subClass="text-red-500" />
        <KpiCard label="Stock bajo" value={fmtN(k.stock_bajo)} subClass="text-amber-600" />
      </div>

      <SectionCard
        title="Alertas activas"
        action={
          <div className="flex gap-2 items-center">
            <select
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none bg-gray-50"
            >
              <option value="">Todas</option>
              <option value="stock">Stock</option>
              <option value="operaciones">Operaciones</option>
              <option value="ventas">Ventas</option>
            </select>
            <button
              onClick={onMarcarTodas}
              className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Marcar resueltas
            </button>
          </div>
        }
      >
        {filtradas.length > 0 ? (
          <div className="space-y-0">
            {filtradas.map((a: any, i: number) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.severidad === 'critica' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800">{a.mensaje}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {a.puesto_nombre ? a.puesto_nombre + ' · ' : ''}
                    {a.producto_nombre ? a.producto_nombre + ' · ' : ''}
                    {formatRelTime(a.creado_en)}
                  </p>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ${a.severidad === 'critica' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {a.severidad}
                </span>
                {a.id && (
                  <button
                    onClick={() => onResolver(a.id)}
                    className="text-[10px] px-2 py-0.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 flex-shrink-0"
                  >
                    Resolver
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="Sin alertas activas" />
        )}
      </SectionCard>
    </div>
  );
}

/* ─── SECCIÓN 7: USUARIOS ───────────────────────────────────────────────── */
function SeccionUsuarios({ data }: { data: any }) {
  if (!data) return <EmptyState message="No hay datos de usuarios disponibles." />;
  const k = data.kpis || {};
  const evolucion: any[] = (data.evolucion_semanal || data.por_dia || []).map((w: any) => ({
    ...w,
    semana: w.semana != null ? 'S' + w.semana : (w.dia || ''),
  }));
  const top: any[] = data.top_usuarios || [];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard label="Usuarios activos" value={fmtN(k.activos ?? k.activos_hoy ?? k.total_usuarios)} />
        <KpiCard
          label="Nuevos usuarios"
          value={fmtN(k.nuevos)}
          sub={k.nuevos_pct_crec != null ? (k.nuevos_pct_crec >= 0 ? '+' : '') + Math.round(k.nuevos_pct_crec) + '% vs anterior' : undefined}
          subClass={k.nuevos_pct_crec >= 0 ? 'text-green-600' : 'text-red-500'}
        />
        <KpiCard label="Gasto medio" value={fmtE(k.gasto_medio)} />
        <KpiCard label="Frecuencia" value={k.frecuencia_semanal != null ? (+k.frecuencia_semanal).toFixed(1) + 'x' : '—'} sub="pedidos/semana" />
        <KpiCard label="Inactivos" value={fmtN(k.inactivos)} sub="+30 días sin compra" subClass="text-red-500" />
        <KpiCard label="Recurrentes" value={fmtN(k.recurrentes)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {evolucion.length > 0 && (
          <SectionCard title="Evolución usuarios activos">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={evolucion} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="semana" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} width={40} />
                <Tooltip />
                <Line type="monotone" dataKey="activos" stroke={BLUE} dot={false} strokeWidth={2} name="Activos" />
                <Line type="monotone" dataKey="nuevos" stroke={TEAL} dot={false} strokeWidth={2} strokeDasharray="4 3" name="Nuevos" />
              </LineChart>
            </ResponsiveContainer>
            <ChartLegend items={[{ color: BLUE, label: 'Activos' }, { color: TEAL, label: 'Nuevos' }]} />
          </SectionCard>
        )}

        {top.length > 0 && (
          <SectionCard title="Top usuarios por gasto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1 px-1 text-gray-400">#</th>
                  <th className="text-left py-1 px-1 text-gray-400">Usuario</th>
                  <th className="text-right py-1 px-1 text-gray-400">Pedidos</th>
                  <th className="text-right py-1 px-1 text-gray-400">Gasto</th>
                </tr>
              </thead>
              <tbody>
                {top.map((u: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1 px-1 text-gray-400">{i + 1}</td>
                    <td className="py-1 px-1 font-medium">{u.nombre || u.alias || '—'}</td>
                    <td className="py-1 px-1 text-right">{fmtN(u.pedidos)}</td>
                    <td className="py-1 px-1 text-right font-semibold">{fmtE(u.gasto_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

/* ─── SECCIÓN 8: LOYALTY ────────────────────────────────────────────────── */
function SeccionLoyalty({ data }: { data: any }) {
  if (!data) return <EmptyState message="No hay datos de loyalty disponibles." />;
  const k = data.kpis || {};
  const porFestival: any[] = data.por_festival || [];
  const niveles: any[] = data.niveles || [];
  const topUsuarios: any[] = data.top_usuarios || [];
  const nivCols = niveles.map((n: any) => NIV_COLORS[n.nivel] || GRAY);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Puntos generados" value={fmtN(k.puntos_generados ?? k.puntos_emitidos)} />
        <KpiCard label="Puntos canjeados" value={fmtN(k.puntos_canjeados)} />
        <KpiCard label="Ratio uso" value={fmtPct(k.ratio_uso_pct ?? k.ratio_canje_pct)} sub="% puntos canjeados" />
        <KpiCard label="Pedidos con puntos" value={fmtPct(k.pct_pedidos_con_puntos ?? k.usuarios_con_puntos)} />
      </div>

      {porFestival.length > 0 && (
        <SectionCard title="Puntos por festival">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={porFestival} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="festival_nombre" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={48} />
              <YAxis tick={{ fontSize: 9 }} width={40} />
              <Tooltip />
              <Bar dataKey="generados" fill={PURPLE + '99'} name="Generados" radius={3} />
              <Bar dataKey="canjeados" fill={TEAL + '99'} name="Canjeados" radius={3} />
            </BarChart>
          </ResponsiveContainer>
          <ChartLegend items={[{ color: PURPLE, label: 'Generados' }, { color: TEAL, label: 'Canjeados' }]} />
        </SectionCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {niveles.length > 0 && (
          <SectionCard title="Distribución por nivel">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={niveles} dataKey="count" nameKey="nivel" cx="50%" cy="50%" outerRadius={80}>
                  {niveles.map((_: any, i: number) => <Cell key={i} fill={nivCols[i]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmtN(v)} />
              </PieChart>
            </ResponsiveContainer>
            <ChartLegend items={niveles.map((n: any, i: number) => ({ color: nivCols[i], label: `${n.nivel} ${fmtPct(n.pct)}` }))} />
          </SectionCard>
        )}

        {topUsuarios.length > 0 && (
          <SectionCard title="Top usuarios por puntos">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1 px-1 text-gray-400">#</th>
                  <th className="text-left py-1 px-1 text-gray-400">Usuario</th>
                  <th className="text-right py-1 px-1 text-gray-400">Puntos</th>
                  <th className="text-right py-1 px-1 text-gray-400">Nivel</th>
                  <th className="text-right py-1 px-1 text-gray-400">Canjeados</th>
                </tr>
              </thead>
              <tbody>
                {topUsuarios.map((u: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1 px-1 text-gray-400">{i + 1}</td>
                    <td className="py-1 px-1 font-medium">{u.nombre || u.alias || '—'}</td>
                    <td className="py-1 px-1 text-right font-semibold">{fmtN(u.puntos_total)}</td>
                    <td className="py-1 px-1 text-right">
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700">{u.nivel}</span>
                    </td>
                    <td className="py-1 px-1 text-right">{fmtN(u.canjeados)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

/* ─── SECCIÓN 9: PROMOCIONES ────────────────────────────────────────────── */
function SeccionPromos({ data }: { data: any }) {
  if (!data) return <EmptyState message="No hay datos de promociones disponibles." />;
  const k = data.kpis || {};
  const lista: any[] = data.lista || [];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Activas" value={fmtN(k.activas)} />
        <KpiCard label="Usos totales" value={fmtN(k.usos_totales ?? k.usos_total)} />
        <KpiCard label="Ingresos con promo" value={fmtE(k.descuento_total ?? k.ingresos_total)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {lista.length > 0 && (
          <SectionCard title="Usos e ingresos por promoción">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={lista} margin={{ top: 10, right: 55, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="titulo" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={55} interval={0} />
                <YAxis yAxisId="left" tick={{ fontSize: 9 }} tickFormatter={v => '€' + v} width={55} domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: AMBER }} width={40} domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]} />
                <Tooltip />
                <Bar yAxisId="left" dataKey="ingresos_generados" fill={BLUE + '99'} name="Ingresos" radius={3} />
                <Line yAxisId="right" type="monotone" dataKey="usos" stroke={AMBER} dot={false} strokeWidth={2} name="Usos" />
              </BarChart>
            </ResponsiveContainer>
            <ChartLegend items={[{ color: BLUE, label: 'Ingresos (€)' }, { color: AMBER, label: 'Usos (eje der.)' }]} />
          </SectionCard>
        )}

        {lista.length > 0 && (
          <SectionCard title="Detalle por promoción">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1 px-1 text-gray-400">Promoción</th>
                  <th className="text-right py-1 px-1 text-gray-400">Usos</th>
                  <th className="text-right py-1 px-1 text-gray-400">Inc. ventas</th>
                  <th className="text-right py-1 px-1 text-gray-400">Margen</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1.5 px-1 font-medium max-w-[100px] truncate">{p.titulo}</td>
                    <td className="py-1.5 px-1 text-right">{fmtN(p.usos)}</td>
                    <td className="py-1.5 px-1 text-right font-semibold" style={{ color: p.incremento_ventas_pct >= 0 ? GREEN : RED }}>
                      {p.incremento_ventas_pct != null ? (p.incremento_ventas_pct >= 0 ? '+' : '') + Math.round(p.incremento_ventas_pct) + '%' : '—'}
                    </td>
                    <td className="py-1.5 px-1 text-right font-semibold" style={{ color: p.impacto_margen_pct >= 0 ? GREEN : RED }}>
                      {p.impacto_margen_pct != null ? (p.impacto_margen_pct >= 0 ? '+' : '') + Math.round(p.impacto_margen_pct) + '%' : fmtE(p.precio_promo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

/* ─── SECCIÓN 10: CLV ───────────────────────────────────────────────────── */
function SeccionCLV({ data }: { data: any }) {
  if (!data) return <EmptyState message="No hay datos de CLV disponibles." />;
  const k = data.kpis || {};
  const segmentos: any[] = data.segmentos || [];
  const top: any[] = data.top_clv || [];
  const segCols = segmentos.map((s: any) => SEG_COLORS[s.segmento] || GRAY);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="CLV medio global" value={fmtE(k.clv_medio_global)} />
        <KpiCard label="Usuarios VIP" value={fmtN(k.usuarios_vip)} subClass="text-purple-600" />
        <KpiCard label="CLV medio VIP" value={fmtE(k.clv_medio_vip)} />
        <KpiCard label="A recuperar" value={fmtN(k.inactivos_recuperar)} subClass="text-red-500" sub="inactivos" />
      </div>

      {segmentos.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard title="CLV medio por segmento">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={segmentos} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <XAxis dataKey="segmento" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => '€' + v} width={55} />
                <Tooltip formatter={(v: any) => fmtE(v)} />
                <Bar dataKey="clv_medio" radius={4}>
                  {segmentos.map((_: any, i: number) => <Cell key={i} fill={segCols[i] + '99'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <SectionCard title="Distribución usuarios">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={segmentos} dataKey="count" nameKey="segmento" cx="50%" cy="50%" outerRadius={80}>
                  {segmentos.map((_: any, i: number) => <Cell key={i} fill={segCols[i]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmtN(v)} />
              </PieChart>
            </ResponsiveContainer>
            <ChartLegend items={segmentos.map((s: any, i: number) => ({ color: segCols[i], label: `${s.segmento} ${fmtPct(s.pct_del_total)}` }))} />
          </SectionCard>
        </div>
      )}

      {top.length > 0 && (
        <SectionCard title="Top usuarios por CLV estimado">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1 px-1 text-gray-400">#</th>
                  <th className="text-left py-1 px-1 text-gray-400">Usuario</th>
                  <th className="text-right py-1 px-1 text-gray-400">Pedidos</th>
                  <th className="text-right py-1 px-1 text-gray-400">Ticket</th>
                  <th className="text-right py-1 px-1 text-gray-400">Freq.</th>
                  <th className="text-right py-1 px-1 text-gray-400">CLV</th>
                  <th className="text-right py-1 px-1 text-gray-400">Seg.</th>
                </tr>
              </thead>
              <tbody>
                {top.map((u: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1 px-1 text-gray-400">{i + 1}</td>
                    <td className="py-1 px-1 font-semibold">{u.nombre || u.alias || '—'}</td>
                    <td className="py-1 px-1 text-right">{fmtN(u.pedidos)}</td>
                    <td className="py-1 px-1 text-right">{fmtE(u.ticket_medio)}</td>
                    <td className="py-1 px-1 text-right text-gray-400">
                      {u.frecuencia != null ? (+u.frecuencia).toFixed(1) + 'x/sem' : '—'}
                    </td>
                    <td className="py-1 px-1 text-right font-bold">{fmtE(u.clv_estimado)}</td>
                    <td className="py-1 px-1 text-right"><SegmentoBadge segmento={u.segmento} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/* ─── SECCIÓN 11: PREDICCIÓN ────────────────────────────────────────────── */
function SeccionPrediccion({ data }: { data: any }) {
  if (!data) return <EmptyState message="No hay datos de predicción disponibles." />;
  const k = data.kpis || {};
  const porHora: any[] = (data.por_hora || []).map((h: any) => ({ ...h, hora: h.hora + 'h' }));
  const topProds: any[] = data.productos_top_predichos || [];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Hora pico prevista" value={k.hora_pico != null ? k.hora_pico + ':00h' : '—'} />
        <KpiCard label="Pedidos en pico" value={fmtN(k.pedidos_hora_pico)} />
        <KpiCard label="Ingresos en pico" value={fmtE(k.ingresos_hora_pico)} />
        <KpiCard label="Confianza modelo" value={fmtPct(k.confianza_global_pct)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {porHora.length > 0 && (
          <SectionCard title="Predicción de ingresos por hora">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={porHora} margin={{ top: 10, right: 55, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hora" tick={{ fontSize: 9 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 9 }} tickFormatter={v => '€' + v} width={55} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: TEAL }} width={40} />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="ingresos_real" stroke={BLUE} dot={false} strokeWidth={2} name="Ingresos real" />
                <Line yAxisId="left" type="monotone" dataKey="ingresos_predichos" stroke={BLUE} dot={false} strokeWidth={2} strokeDasharray="5 5" name="Predicción" opacity={0.5} />
                <Line yAxisId="right" type="monotone" dataKey="pedidos_real" stroke={TEAL} dot={false} strokeWidth={1.5} name="Pedidos real" />
              </LineChart>
            </ResponsiveContainer>
            <ChartLegend items={[
              { color: BLUE, label: 'Real' },
              { color: BLUE + '80', label: 'Predicción' },
              { color: TEAL, label: 'Pedidos (der.)' },
            ]} />
          </SectionCard>
        )}

        {topProds.length > 0 && (
          <SectionCard title="Productos más demandados (predicción)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProds} layout="vertical" margin={{ top: 5, right: 45, bottom: 5, left: 5 }}>
                <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={v => v + ' uds'} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={95} />
                <Tooltip />
                <Bar dataKey="unidades_predichas" radius={4} name="Unidades predichas">
                  {topProds.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length] + '99'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

/* ─── SECCIÓN 12: HEATMAP ───────────────────────────────────────────────── */
function SeccionHeatmap({ data, festivalId }: { data: any; festivalId: string }) {
  if (!festivalId) {
    return <EmptyState message="Selecciona un festival específico para ver el heatmap." />;
  }
  if (!data) return <EmptyState message="No hay datos de heatmap. Verifica que los puestos tengan coordenadas (pos_x, pos_y)." />;
  const k = data.kpis || {};
  const puestos: any[] = data.puestos || [];

  const COLS = 12, ROWS = 8;
  const grid: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  puestos.forEach((p: any) => {
    const col = Math.round((p.pos_x || 50) / 100 * (COLS - 1));
    const row = Math.round((p.pos_y || 50) / 100 * (ROWS - 1));
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      grid[row][col] = Math.max(grid[row][col], p.intensidad || 0);
    }
  });

  function heatColor(v: number) {
    if (v < 25) return '#dcfce7';
    if (v < 50) return '#fef08a';
    if (v < 75) return '#fb923c';
    return '#dc2626';
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Zona más activa" value={k.zona_caliente || '—'} />
        <KpiCard label="Zona más fría" value={k.zona_fria || '—'} />
        <KpiCard label="Espera zona alta" value={fmtMin(k.espera_zona_alta_min)} />
      </div>

      {puestos.length > 0 ? (
        <SectionCard title="Mapa de intensidad (pos_x / pos_y)">
          <ChartLegend items={[
            { color: '#dcfce7', label: 'Baja' },
            { color: '#fef08a', label: 'Media' },
            { color: '#fb923c', label: 'Alta' },
            { color: '#dc2626', label: 'Muy alta' },
          ]} />
          <div className="mt-3" style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 3 }}>
            {grid.flat().map((v, idx) => {
              const row = Math.floor(idx / COLS), col = idx % COLS;
              const puesto = puestos.find((p: any) => {
                const c = Math.round((p.pos_x || 50) / 100 * (COLS - 1));
                const r = Math.round((p.pos_y || 50) / 100 * (ROWS - 1));
                return c === col && r === row;
              });
              return (
                <div
                  key={idx}
                  title={puesto ? `${puesto.nombre}\n${fmtE(puesto.ingresos)} · ${fmtMin(puesto.espera_min)}` : ''}
                  style={{
                    background: heatColor(v),
                    height: 40,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 700,
                    color: v > 50 ? '#fff' : '#1a1a18',
                    cursor: puesto ? 'pointer' : 'default',
                  }}
                >
                  {puesto ? '●' : ''}
                </div>
              );
            })}
          </div>
          <div className="relative bg-gray-100 rounded-lg mt-4" style={{ height: 240 }}>
            {puestos.map((p: any, i: number) => (
              <div
                key={i}
                className="absolute flex flex-col items-center"
                style={{ left: `${p.pos_x || 50}%`, top: `${p.pos_y || 50}%`, transform: 'translate(-50%, -50%)' }}
                title={`${p.nombre}: ${fmtN(p.pedidos)} pedidos · ${fmtE(p.ingresos)}`}
              >
                <div
                  className="rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-[9px] font-bold"
                  style={{ width: 32, height: 32, background: heatColor(p.intensidad || 0) }}
                >
                  {Math.round(p.intensidad || 0)}
                </div>
                <span className="text-[8px] mt-0.5 text-gray-600 font-medium max-w-[56px] text-center leading-tight truncate">{p.nombre}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">● Posición según pos_x/pos_y de la tabla puestos</p>
        </SectionCard>
      ) : (
        <EmptyState message="Selecciona un festival con puestos que tengan coordenadas (pos_x, pos_y)." />
      )}
    </div>
  );
}
