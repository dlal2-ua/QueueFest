import { useState, useCallback } from 'react';
import { getDecisiones, aprobarDecision, rechazarDecision } from '../../api';
import { DecisionCard, type Decision } from '../../components/DecisionCard';
import { BarChart2, RefreshCw, Zap, Hand } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  festivalId: number;
  festivalNombre: string;
  modoAuto: boolean;
}

export function DecisionsView({ festivalId, festivalNombre, modoAuto }: Props) {
  const [decisiones, setDecisiones] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(false);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

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

  // Carga al montar
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

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#FDF6EE' }}>
      <div className="px-4 py-4 space-y-4 pb-8">

        {/* Header row */}
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

        {/* Banner de modo */}
        <div className={`rounded-2xl px-4 py-3 text-sm flex items-center gap-2 border ${
          modoAuto
            ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
            : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          {modoAuto
            ? <><Zap className="w-4 h-4 flex-shrink-0 text-yellow-500" /> <strong>Modo automático</strong>: el sistema actúa solo.</>
            : <><Hand className="w-4 h-4 flex-shrink-0 text-blue-500" /> <strong>Modo manual</strong>: revisa y aprueba cada decisión.</>
          }
        </div>

        {!modoAuto && pendientes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#C8956C' }}>
              Pendiente de aprobación ({pendientes.length})
            </h3>
            {pendientes.map(d => (
              <DecisionCard key={d.id} decision={d} modoAuto={modoAuto}
                onAprobar={handleAprobar} onRechazar={handleRechazar}
                loading={procesandoId === d.id} />
            ))}
          </div>
        )}

        {!modoAuto && pendientes.length === 0 && loaded && (
          <div className="rounded-2xl p-4 text-center text-sm border"
               style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', color: '#166534' }}>
            ✓ No hay decisiones pendientes
          </div>
        )}

        {historial.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#C8956C', opacity: 0.6 }}>
              Historial reciente
            </h3>
            {historial.map(d => (
              <DecisionCard key={d.id} decision={d} modoAuto={modoAuto}
                onAprobar={handleAprobar} onRechazar={handleRechazar} />
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
