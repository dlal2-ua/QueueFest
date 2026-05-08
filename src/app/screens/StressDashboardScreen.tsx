import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import {
  ArrowLeft, Play, Loader2, AlertTriangle,
  Database, Zap, BarChart2, Clock, TrendingUp, Shield,
  FlaskConical,
} from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

/* ─── Colores reutilizados del diseño existente ────────────────────────────── */
const GREEN = '#16a34a';
const AMBER = '#b45309';
const RED = '#dc2626';
const BLUE = '#2563eb';
const PURPLE = '#7c3aed';
const TEAL = '#0d9488';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function fmtMs(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toFixed(0) + ' ms';
}

function getBarColor(ms: number, media: number) {
  if (ms > media * 1.5) return RED;
  if (ms > media * 1.15) return AMBER;
  return TEAL;
}

/* ─── Sub-componentes ──────────────────────────────────────────────────────── */
function KpiCard({
  label, value, sub, color = BLUE, Icon,
}: {
  label: string; value: string; sub?: string; color?: string; Icon: React.ElementType;
}) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-start gap-3">
      <div className="rounded-lg p-2 flex-shrink-0" style={{ background: color + '22' }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{label}</div>
        <div className="text-xl font-bold text-white leading-none">{value}</div>
        {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function LogPanel({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="bg-gray-950 border border-gray-700 rounded-xl p-4 font-mono text-[11px] space-y-1 max-h-32 overflow-y-auto">
      {lines.map((l, i) => (
        <div key={i} className={l.startsWith('✓') ? 'text-green-400' : l.startsWith('✗') ? 'text-red-400' : 'text-gray-400'}>
          {l}
        </div>
      ))}
    </div>
  );
}

/* ─── Tooltip personalizado para la gráfica ────────────────────────────────── */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white shadow-lg">
      <div className="font-bold mb-1">Iter. #{d.iteracion}</div>
      <div>Duración: <span className="text-teal-400 font-semibold">{d.duracion_ms} ms</span></div>
      <div>Filas: <span className="text-blue-400">{d.filas_devueltas}</span></div>
      {d.error && <div className="text-red-400 mt-1">Error: {d.error}</div>}
    </div>
  );
}

/* ─── PANTALLA PRINCIPAL ───────────────────────────────────────────────────── */
export function StressDashboardScreen() {
  const { user } = useAuth();
  const getToken = () => localStorage.getItem('token');

  const [stressStatus, setStressStatus] = useState<'idle' | 'running' | 'ok' | 'error'>('idle');
  const [resultado, setResultado] = useState<any>(null);

  /* ── Estrés ────────────────────────────────────────────────────────────── */
  const runStress = useCallback(async () => {
    setStressStatus('running');
    setResultado(null);
    try {
      const res = await fetch(`${API_BASE}/stress/ejecutar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const json = await res.json();
      if (!res.ok) {
        setStressStatus('error');
        setResultado({ error: json.error });
      } else {
        setStressStatus('ok');
        setResultado(json);
      }
    } catch (e: any) {
      setStressStatus('error');
      setResultado({ error: e.message });
    }
  }, []);

  const resumen = resultado?.resumen ?? null;
  const iteraciones: any[] = resultado?.iteraciones ?? [];
  const media = resumen?.media_ms ?? 0;

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border-b-4 border-purple-600 px-4 py-3 shadow-lg flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (window as any).navigateTo('/admin')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-none flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-purple-400" />
              Panel de Control — Pruebas de Estrés
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">BD Relacional · queuefest · Sesión: {user?.nombre || 'Admin'}</p>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">

        {/* ── Bloque: Estrés ──────────────────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="font-bold text-gray-100 text-sm">Prueba de Estrés (30 iteraciones)</h2>
            <span className="ml-auto text-[10px] text-gray-500 font-mono">POST /api/stress/ejecutar</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Ejecuta la consulta compleja con <strong className="text-white">JOINs de 5 tablas</strong>,
            filtros por categoría y agrupación analítica <strong className="text-white">30 veces consecutivas</strong>.
            Mide tiempos de respuesta, percentiles y detecta outliers.
          </p>

          {/* Descripción de la query */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 text-[10px] font-mono text-gray-500 space-y-0.5">
            <div><span className="text-blue-400">SELECT</span> f.id, p.id, pr.id, mp.id, SUM(ms.cantidad), COUNT(ms.id)</div>
            <div><span className="text-blue-400">FROM</span> movimientos_stock ms</div>
            <div className="pl-4"><span className="text-blue-400">INNER JOIN</span> proveedores pr <span className="text-blue-400">ON</span> ms.proveedor_id = pr.id</div>
            <div className="pl-4"><span className="text-blue-400">INNER JOIN</span> materias_primas mp <span className="text-blue-400">ON</span> ms.materia_prima_id = mp.id</div>
            <div className="pl-4"><span className="text-blue-400">INNER JOIN</span> puestos p <span className="text-blue-400">ON</span> ms.puesto_id_destino = p.id</div>
            <div className="pl-4"><span className="text-blue-400">INNER JOIN</span> festivales f <span className="text-blue-400">ON</span> p.festival_id = f.id</div>
            <div><span className="text-blue-400">WHERE</span> tipo=<span className="text-green-400">'reposicion'</span> AND pr.categoria=<span className="text-green-400">'carnes'</span> AND activos</div>
            <div><span className="text-blue-400">GROUP BY</span> f.id, p.id, pr.id, mp.id  <span className="text-blue-400">HAVING</span> SUM &gt; 0</div>
          </div>

          <button
            onClick={runStress}
            disabled={stressStatus === 'running'}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50
              bg-amber-700 hover:bg-amber-600 active:scale-95 shadow-lg shadow-amber-900/40"
          >
            {stressStatus === 'running'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Ejecutando 30 iteraciones…</>
              : <><Play className="w-4 h-4" /> Lanzar Prueba de Estrés</>
            }
          </button>
        </div>

        {/* ── Resultados ──────────────────────────────────────────────── */}
        {stressStatus === 'running' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
            <div className="text-gray-300 font-semibold">Ejecutando 30 consultas…</div>
            <div className="text-gray-500 text-sm">Esto puede tardar varios segundos según la carga de la BD</div>
          </div>
        )}

        {resultado?.error && (
          <div className="bg-red-950 border border-red-800 rounded-2xl p-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-red-300">Error al ejecutar el test</div>
              <div className="text-red-400 text-sm mt-1 font-mono">{resultado.error}</div>
              <div className="text-gray-400 text-xs mt-2">
                Verifica que el setup esté completado y que la BD esté accesible.
              </div>
            </div>
          </div>
        )}

        {resumen && (
          <>
            {/* KPIs estadísticos */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-200 flex items-center gap-2 text-sm">
                <BarChart2 className="w-4 h-4 text-teal-400" />
                Resumen Estadístico
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label="Media" value={fmtMs(resumen.media_ms)} Icon={TrendingUp} color={TEAL} sub={`±${fmtMs(resumen.desv_tipica_ms)} desv.`} />
                <KpiCard label="Mínimo" value={fmtMs(resumen.min_ms)} Icon={Clock} color={GREEN} sub="iteración más rápida" />
                <KpiCard label="Máximo" value={fmtMs(resumen.max_ms)} Icon={Clock} color={RED} sub="iteración más lenta" />
                <KpiCard label="Errores" value={String(resumen.errores)} Icon={AlertTriangle} color={resumen.errores > 0 ? RED : GREEN} sub={resumen.errores === 0 ? 'Sin errores' : 'queries fallidas'} />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label="P50 (mediana)" value={fmtMs(resumen.p50_ms)} Icon={BarChart2} color={BLUE} sub="50% por debajo" />
                <KpiCard label="P90" value={fmtMs(resumen.p90_ms)} Icon={BarChart2} color={AMBER} sub="90% por debajo" />
                <KpiCard label="P95" value={fmtMs(resumen.p95_ms)} Icon={Shield} color={PURPLE} sub="95% por debajo" />
                <KpiCard label="Total filas" value={String(resumen.total_filas_procesadas)} Icon={Database} color={TEAL} sub="acumulado 30 queries" />
              </div>
            </div>

            {/* Gráfica: duración por iteración */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-gray-200 flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-amber-400" />
                Duración por iteración (ms)
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={iteraciones} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="iteracion" tick={{ fontSize: 9, fill: '#9ca3af' }} label={{ value: 'Iteración', position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={v => v + 'ms'} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={media} stroke={AMBER} strokeDasharray="4 4" label={{ value: `Media ${fmtMs(media)}`, fill: AMBER, fontSize: 10, position: 'right' }} />
                  <Bar dataKey="duracion_ms" name="Duración" radius={3}>
                    {iteraciones.map((d, i) => (
                      <Cell key={i} fill={d.error ? RED : getBarColor(d.duracion_ms, media)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-4 text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: TEAL }} /> Normal</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: AMBER }} /> &gt;15% sobre media</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: RED }} /> &gt;50% sobre media / error</span>
                <span className="flex items-center gap-1"><span className="w-10 border-t-2 border-dashed inline-block align-middle" style={{ borderColor: AMBER }} /> Media</span>
              </div>
            </div>

            {/* Gráfica: tendencia de tiempos */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-gray-200 flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Tendencia de tiempos — ¿Hay degradación?
              </h3>
              <p className="text-xs text-gray-400">
                Una línea ascendente indica posible degradación de memoria caché o I/O. Horizontal = BD estable.
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={iteraciones} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="iteracion" tick={{ fontSize: 9, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={v => v + 'ms'} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={media} stroke={AMBER} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="duracion_ms" stroke={BLUE} dot={{ fill: BLUE, r: 3 }} strokeWidth={2} name="Duración" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Tabla de detalle */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-gray-200 flex items-center gap-2 text-sm">
                <Database className="w-4 h-4 text-purple-400" />
                Detalle por iteración
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-2 text-gray-400 font-semibold">#</th>
                      <th className="text-right py-2 px-2 text-gray-400 font-semibold">Duración (ms)</th>
                      <th className="text-right py-2 px-2 text-gray-400 font-semibold">Filas</th>
                      <th className="text-right py-2 px-2 text-gray-400 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {iteraciones.map((it: any) => {
                      const color = it.error ? RED : getBarColor(it.duracion_ms, media);
                      const label = it.error ? 'ERROR' : it.duracion_ms > media * 1.5 ? 'LENTO' : it.duracion_ms > media * 1.15 ? 'ALTO' : 'OK';
                      const labelCls = it.error ? 'bg-red-900 text-red-300' : it.duracion_ms > media * 1.5 ? 'bg-red-900/50 text-red-400' : it.duracion_ms > media * 1.15 ? 'bg-amber-900/50 text-amber-400' : 'bg-green-900/50 text-green-400';
                      return (
                        <tr key={it.iteracion} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                          <td className="py-1.5 px-2 text-gray-500">{it.iteracion}</td>
                          <td className="py-1.5 px-2 text-right font-bold" style={{ color }}>{it.duracion_ms}</td>
                          <td className="py-1.5 px-2 text-right text-gray-400">{it.filas_devueltas}</td>
                          <td className="py-1.5 px-2 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${labelCls}`}>{label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-gray-500 border-t border-gray-800 pt-3">
                Tiempo total real: <span className="text-white font-semibold">{resumen.total_tiempo_real_ms} ms</span>
                {' '} · Iteraciones: <span className="text-white font-semibold">{resumen.total_iteraciones}</span>
                {' '} · Filas totales: <span className="text-white font-semibold">{resumen.total_filas_procesadas}</span>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
