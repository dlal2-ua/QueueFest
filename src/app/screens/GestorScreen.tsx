// GestorScreen.tsx
// Panel de supervision del gestor operativo.
// Muestra estadisticas en tiempo real del festival y el panel de decisiones automaticas.
// El gestor puede alternar entre modo automatico (el sistema actua solo) y
// modo manual (el sistema propone y el gestor aprueba o rechaza cada decision).

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getEstadisticas,
  getModoAuto, setModoAuto,
  getDecisiones, aprobarDecision, rechazarDecision,
  getFestivalesPublicos,
} from '../api';
import { BarChart2, Clock, ShoppingBag, Euro, Zap, Hand, RefreshCw, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { DecisionCard, type Decision } from '../components/DecisionCard';
import Heatmap from '../components/Heatmap';

export function GestorScreen() {
  const { user, logout } = useAuth();

  // ── Estadísticas ────────────────────────────────────────────────────────
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // ── Festival activo en el panel del gestor ───────────────────────────────
  const [festivales, setFestivales] = useState<any[]>([]);
  const [festivalId, setFestivalId] = useState<number | null>(() => {
    const saved = localStorage.getItem('gestorFestivalId');
    return saved ? Number(saved) : null;
  });

  // ── Modo auto/manual y decisiones ───────────────────────────────────────
  const [modoAuto, setModoAutoState] = useState<boolean>(true);
  const [decisiones, setDecisiones] = useState<Decision[]>([]);
  const [loadingDecisiones, setLoadingDecisiones] = useState(false);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);

  // ── Tab activa ───────────────────────────────────────────────────────────
  const [tab, setTab] = useState<'resumen' | 'decisiones'>('resumen');

  // ── Loaders ──────────────────────────────────────────────────────────────

  const cargarEstadisticas = useCallback(async () => {
    try {
      const data = await getEstadisticas();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const cargarFestivales = useCallback(async () => {
    try {
      const data = await getFestivalesPublicos();
      if (Array.isArray(data)) {
        setFestivales(data);
        // Auto-seleccionar el primero activo si no hay ninguno guardado
        if (!festivalId) {
          const primero = data.find((f: any) => f.activo);
          if (primero) {
            setFestivalId(primero.id);
            localStorage.setItem('gestorFestivalId', String(primero.id));
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [festivalId]);

  const cargarDecisiones = useCallback(async (fid?: number) => {
    const id = fid ?? festivalId;
    if (!id) return;
    setLoadingDecisiones(true);
    try {
      const data = await getDecisiones(id);
      setDecisiones(data.decisiones ?? []);
      setModoAutoState(data.modo_auto ?? true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDecisiones(false);
    }
  }, [festivalId]);

  const cargarModoAuto = useCallback(async (fid?: number) => {
    const id = fid ?? festivalId;
    if (!id) return;
    try {
      const data = await getModoAuto(id);
      setModoAutoState(data.modo_auto);
    } catch (err) {
      console.error(err);
    }
  }, [festivalId]);

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    cargarEstadisticas();
    cargarFestivales();
    const interval = setInterval(cargarEstadisticas, 30000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (festivalId) {
      cargarModoAuto(festivalId);
      cargarDecisiones(festivalId);
    }
  }, [festivalId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refrescar decisiones cuando se activa esa pestaña
  useEffect(() => {
    if (tab === 'decisiones' && festivalId) {
      cargarDecisiones(festivalId);
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCambiarFestival = (id: number) => {
    setFestivalId(id);
    localStorage.setItem('gestorFestivalId', String(id));
    cargarModoAuto(id);
    cargarDecisiones(id);
  };

  const handleToggleModo = async () => {
    if (!festivalId) return;
    const nuevo = !modoAuto;
    
    // Cambiamos el estado local inmediatamente para que la UI responda (Optimistic UI)
    setModoAutoState(nuevo);

    try {
      await setModoAuto(festivalId, nuevo);
      toast.success(`Modo ${nuevo ? 'automático' : 'manual'} activado`);
      // Refrescar decisiones por si el cambio a auto las ejecutó
      cargarDecisiones(festivalId);
    } catch {
      // Como el backend está en otra máquina y no está actualizado, mostramos aviso
      // pero MANTENEMOS el cambio visual para que el usuario pueda probarlo
      toast.warning(`Aviso: servidor no actualizado. Modo cambiado localmente a ${nuevo ? 'automático' : 'manual'}.`);
    }
  };

  const handleAprobar = async (id: number) => {
    const previousDecisiones = decisiones;
    setProcesandoId(id);
    setDecisiones(curr =>
      curr.map(d => (d.id === id ? { ...d, estado: 'aprobada' } : d))
    );

    try {
      await aprobarDecision(id);
      toast.success('Decisión aprobada y ejecutada');
      if (festivalId) cargarDecisiones(festivalId);
    } catch {
      setDecisiones(previousDecisiones);
      toast.error('Error al aprobar la decisión');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazar = async (id: number) => {
    const previousDecisiones = decisiones;
    setProcesandoId(id);
    setDecisiones(curr =>
      curr.map(d => (d.id === id ? { ...d, estado: 'rechazada' } : d))
    );

    try {
      await rechazarDecision(id);
      toast.success('Decisión rechazada');
      if (festivalId) cargarDecisiones(festivalId);
    } catch {
      setDecisiones(previousDecisiones);
      toast.error('Error al rechazar la decisión');
    } finally {
      setProcesandoId(null);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  const pendientes = decisiones.filter(d => d.estado === 'pendiente');
  const historial  = decisiones.filter(d => d.estado !== 'pendiente');
  const festivalNombre = festivales.find(f => f.id === festivalId)?.nombre ?? '—';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 pb-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-purple-700 text-white p-4 shadow-md">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold">Panel Gestor</h1>
            <p className="text-purple-200 text-sm">{user?.nombre}</p>
          </div>
          <button onClick={logout} className="text-purple-200 text-sm underline">
            Cerrar sesión
          </button>
        </div>

        {/* Selector de festival */}
        {festivales.length > 0 && (
          <div className="mt-3 flex items-center gap-2 bg-purple-800/50 rounded-lg px-3 py-2 border border-purple-600">
            <Calendar className="w-4 h-4 text-purple-300 flex-shrink-0" />
            <select
              id="gestor-festival-select"
              value={festivalId ?? ''}
              onChange={e => handleCambiarFestival(Number(e.target.value))}
              className="flex-1 bg-transparent text-white text-sm font-semibold outline-none cursor-pointer"
            >
              <option value="" disabled className="text-gray-900">Seleccionar festival…</option>
              {festivales.map((f: any) => (
                <option key={f.id} value={f.id} className="text-gray-900">
                  {f.nombre}{!f.activo ? ' (inactivo)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Toggle modo auto/manual */}
        {festivalId && (
          <div className="mt-3 flex items-center justify-between bg-purple-800/50 rounded-lg px-3 py-2 border border-purple-600">
            <div className="flex items-center gap-2">
              {modoAuto
                ? <Zap className="w-4 h-4 text-yellow-300" />
                : <Hand className="w-4 h-4 text-white" />
              }
              <span className="text-sm font-semibold">
                {modoAuto ? 'Modo Automático' : 'Modo Manual'}
              </span>
              <span className="text-xs text-purple-300">
                {modoAuto ? '— El sistema actúa solo' : '— Tú apruebas cada decisión'}
              </span>
            </div>
            <button
              id="gestor-toggle-modo"
              onClick={handleToggleModo}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ${
                modoAuto ? 'bg-yellow-400' : 'bg-white/30'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${
                modoAuto ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        {[
          { id: 'resumen', label: 'Resumen' },
          {
            id: 'decisiones',
            label: `Decisiones${pendientes.length > 0 ? ` (${pendientes.length})` : ''}`,
          },
        ].map(t => (
          <button
            key={t.id}
            id={`gestor-tab-${t.id}`}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'border-b-2 border-purple-600 text-purple-700'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">

        {/* ── TAB: RESUMEN ────────────────────────────────────────────── */}
        {tab === 'resumen' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Resumen del día</h2>
              <button
                id="gestor-actualizar-stats"
                onClick={cargarEstadisticas}
                className="flex items-center gap-1 text-sm bg-white border border-gray-300 px-3 py-1.5 rounded-full text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Actualizar
              </button>
            </div>

            {loadingStats ? (
              <p className="text-center text-gray-400 mt-10 text-sm">Cargando estadísticas...</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingBag className="w-5 h-5 text-orange-500" />
                    <span className="text-sm text-gray-500">Pedidos hoy</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats?.pedidos_hoy || 0}</p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Euro className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-gray-500">Ingresos hoy</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {Number(stats?.ingresos_hoy || 0).toFixed(2)}€
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span className="text-sm text-gray-500">Espera media</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {Number(stats?.espera_media || 0).toFixed(0)} min
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart2 className="w-5 h-5 text-purple-500" />
                    <span className="text-sm text-gray-500">Puestos abiertos</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats?.puestos_abiertos || 0}
                  </p>
                </div>
              </div>
            )}

            {stats?.pedidos_hoy === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-yellow-800 text-sm text-center">
                  No hay pedidos registrados hoy todavía
                </p>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <Heatmap />
            </div>
          </div>
        )}

        {/* ── TAB: DECISIONES ─────────────────────────────────────────── */}
        {tab === 'decisiones' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">

            {!festivalId ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 text-center">
                Selecciona un festival en el panel superior para ver las decisiones.
              </div>
            ) : (
              <>
                {/* Cabecera del panel */}
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Decisiones</h2>
                    <p className="text-xs text-gray-500">{festivalNombre}</p>
                  </div>
                  <button
                    id="gestor-refrescar-decisiones"
                    onClick={() => cargarDecisiones()}
                    disabled={loadingDecisiones}
                    className="flex items-center gap-1 text-sm bg-white border border-gray-300 px-3 py-1.5 rounded-full text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDecisiones ? 'animate-spin' : ''}`} />
                    Refrescar
                  </button>
                </div>

                {/* Modo info banner */}
                <div className={`rounded-xl px-4 py-3 text-sm border flex items-center gap-2 ${
                  modoAuto
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                  {modoAuto
                    ? <><Zap className="w-4 h-4 text-yellow-500 flex-shrink-0" /> El sistema está en <strong className="ml-1">modo automático</strong>: las decisiones se ejecutan solas.</>
                    : <><Hand className="w-4 h-4 text-blue-500 flex-shrink-0" /> Estás en <strong className="ml-1">modo manual</strong>: revisa y aprueba cada decisión antes de ejecutarla.</>
                  }
                </div>

                {/* Pendientes (solo en modo manual) */}
                {!modoAuto && pendientes.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                      Pendientes de aprobación ({pendientes.length})
                    </h3>
                    {pendientes.map(d => (
                      <DecisionCard
                        key={d.id}
                        decision={d}
                        modoAuto={modoAuto}
                        onAprobar={handleAprobar}
                        onRechazar={handleRechazar}
                        loading={procesandoId === d.id}
                      />
                    ))}
                  </div>
                )}

                {!modoAuto && pendientes.length === 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-sm text-green-700">
                    ✓ No hay decisiones pendientes de aprobación
                  </div>
                )}

                {/* Historial */}
                {historial.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                      Historial reciente
                    </h3>
                    {historial.map(d => (
                      <DecisionCard
                        key={d.id}
                        decision={d}
                        modoAuto={modoAuto}
                        onAprobar={handleAprobar}
                        onRechazar={handleRechazar}
                      />
                    ))}
                  </div>
                )}

                {decisiones.length === 0 && !loadingDecisiones && (
                  <div className="text-center py-10 text-gray-400 text-sm">
                    <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No se han generado decisiones todavía.<br />
                    Pulsa "Refrescar" para evaluar el estado del festival.
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}