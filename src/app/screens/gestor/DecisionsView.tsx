import { useState, useCallback } from 'react';
import { getDecisiones, aprobarDecision, rechazarDecision } from '../../api';
import { DecisionCard, type Decision } from '../../components/DecisionCard';
import { BarChart2, RefreshCw, Zap, Hand, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  festivalId: number;
  festivalNombre: string;
  modoAuto: boolean;
  onToggleModo: () => void;
}

interface GrupoDecision {
  grupo_ab: string | null;
  items: Decision[];
}

function agruparDecisiones(decisiones: Decision[]): GrupoDecision[] {
  const grupos: GrupoDecision[] = [];
  const vistosAB = new Set<string>();

  for (const d of decisiones) {
    if (d.grupo_ab) {
      if (vistosAB.has(d.grupo_ab)) continue;
      vistosAB.add(d.grupo_ab);
      const par = decisiones.filter(x => x.grupo_ab === d.grupo_ab);
      grupos.push({ grupo_ab: d.grupo_ab, items: par });
    } else {
      grupos.push({ grupo_ab: null, items: [d] });
    }
  }
  return grupos;
}

export function DecisionsView({ festivalId, festivalNombre, modoAuto, onToggleModo }: Props) {
  const [decisiones, setDecisiones] = useState<Decision[]>([]);
  const [loading, setLoading]       = useState(false);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [loaded, setLoaded]         = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDecisiones(festivalId);
      setDecisiones(data.decisiones ?? []);
      setLoaded(true);
    } catch {
      toast.error('Error al cargar decisiones');
    } finally {
      setLoading(false);
    }
  }, [festivalId]);

  useState(() => { cargar(); });

  const handleAprobar = async (id: number) => {
    const prev = decisiones;
    setProcesandoId(id);
    setDecisiones(curr => curr.map(d => d.id === id ? { ...d, estado: 'aprobada' } : d));
    try {
      await aprobarDecision(id);
      toast.success('Decisión aprobada');
      cargar();
    } catch {
      setDecisiones(prev);
      toast.error('Error al aprobar la decisión');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazar = async (id: number) => {
    const prev = decisiones;
    setProcesandoId(id);
    setDecisiones(curr => curr.map(d => d.id === id ? { ...d, estado: 'rechazada' } : d));
    try {
      await rechazarDecision(id);
      toast.success('Decisión rechazada');
      cargar();
    } catch {
      setDecisiones(prev);
      toast.error('Error al rechazar la decisión');
    } finally {
      setProcesandoId(null);
    }
  };

  const pendientes = decisiones.filter(d => d.estado === 'pendiente');
  const historial  = decisiones.filter(d => d.estado !== 'pendiente');

  const gruposPendientes = agruparDecisiones(pendientes);
  const gruposHistorial  = agruparDecisiones(historial);

  const renderGrupo = (grupo: GrupoDecision) => {
    const esAB = grupo.grupo_ab !== null && grupo.items.length >= 2;
    const tieneGanadora = esAB && grupo.items.some(d => d.ganadora === 1);

    if (esAB) {
      return (
        <div key={grupo.grupo_ab} className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
          <div className="flex items-center gap-2">
            {tieneGanadora
              ? <Trophy className="w-3.5 h-3.5 text-emerald-500" />
              : <Zap className="w-3.5 h-3.5 text-indigo-400" />
            }
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
              {tieneGanadora ? 'Par A/B — Resultado disponible' : 'Par A/B — Comparando estrategias'}
            </span>
          </div>
          {grupo.items.map(d => (
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
      );
    }

    return grupo.items.map(d => (
      <DecisionCard
        key={d.id}
        decision={d}
        modoAuto={modoAuto}
        onAprobar={handleAprobar}
        onRechazar={handleRechazar}
        loading={procesandoId === d.id}
      />
    ));
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#FDF6EE' }}>
      <div className="px-4 py-4 space-y-4 pb-8">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-extrabold" style={{ color: '#2C1810' }}>Decisiones</h2>
            <p className="text-[11px]" style={{ color: '#8B6650' }}>{festivalNombre}</p>
          </div>
          <button
            onClick={cargar}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-40"
            style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', color: '#A67C52' }}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Toggle modo automático */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FFF3E4',
            border: '1px solid #E8D5C0',
            borderRadius: 20,
            padding: '18px 20px',
            boxShadow: '0 4px 20px rgba(166,124,82,0.10)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {modoAuto
              ? <Zap style={{ width: 20, height: 20, color: '#F59E0B' }} />
              : <Hand style={{ width: 20, height: 20, color: '#A67C52' }} />}
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#2C1810', lineHeight: 1.2 }}>
                {modoAuto ? 'Modo Automático' : 'Modo Manual'}
              </p>
              <p style={{ fontSize: 11, color: '#8B6650', marginTop: 2 }}>
                {modoAuto ? 'El sistema actúa solo' : 'Tú apruebas cada decisión'}
              </p>
            </div>
          </div>
          <button
            id="gestor-toggle-modo"
            onClick={onToggleModo}
            style={{
              position: 'relative',
              width: 48,
              height: 24,
              borderRadius: 12,
              backgroundColor: modoAuto ? '#F59E0B' : '#D1C4B8',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background-color 0.3s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 3,
                left: 3,
                width: 18,
                height: 18,
                borderRadius: '50%',
                backgroundColor: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                transition: 'transform 0.3s',
                transform: modoAuto ? 'translateX(24px)' : 'translateX(0)',
                display: 'block',
              }}
            />
          </button>
        </div>

        {/* Pendientes */}
        {!modoAuto && pendientes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#C8956C' }}>
              Pendiente de aprobación ({pendientes.length})
            </h3>
            {gruposPendientes.map((g, i) => (
              <div key={g.grupo_ab ?? `solo-${i}`}>
                {renderGrupo(g)}
              </div>
            ))}
          </div>
        )}

        {!modoAuto && pendientes.length === 0 && loaded && (
          <div className="rounded-2xl p-4 text-center text-sm border"
               style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', color: '#166534' }}>
            ✓ No hay decisiones pendientes
          </div>
        )}

        {/* Historial */}
        {historial.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: '#C8956C', opacity: 0.6 }}>
              Historial reciente
            </h3>
            {gruposHistorial.map((g, i) => (
              <div key={g.grupo_ab ?? `hist-${i}`}>
                {renderGrupo(g)}
              </div>
            ))}
          </div>
        )}

        {decisiones.length === 0 && loaded && (
          <div className="text-center py-12" style={{ color: '#C8956C', opacity: 0.4 }}>
            <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No se han generado decisiones todavía.<br />Pulsa Actualizar para evaluar el festival.</p>
          </div>
        )}

      </div>
    </div>
  );
}
