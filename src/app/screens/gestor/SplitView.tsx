import { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { MapView }       from './MapView';
import { DecisionsView } from './DecisionsView';

interface Props {
  festivalId: number;
  festivalNombre: string;
  modoAuto: boolean;
  onToggleModo: () => void;
  navigate: (v: string) => void;
}

export function SplitView({ festivalId, festivalNombre, modoAuto, onToggleModo, navigate }: Props) {
  // ID del puesto cuya decisión acaba de aprobarse → MapView lo anima
  const [highlightedPuestoId, setHighlightedPuestoId] = useState<number | null>(null);

  const handleDecisionApproved = useCallback((puestoId: number | null) => {
    if (puestoId == null) return;
    setHighlightedPuestoId(puestoId);
    // Auto-reset a los 3 s para que la animación sea puntual
    setTimeout(() => setHighlightedPuestoId(null), 3000);
  }, []);

  return (
    <div className="flex flex-row flex-1 overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>

      {/* ── Izquierda: Mapa fijo ───────────────────────────────────────── */}
      <div className="flex-shrink-0 overflow-hidden border-r" style={{ width: '55%', borderColor: '#E8D5C0' }}>
        <MapView
          festivalId={festivalId}
          festivalNombre={festivalNombre}
          navigate={navigate}
          highlightedPuestoId={highlightedPuestoId}
        />
      </div>

      {/* ── Derecha: Decisiones con scroll propio ─────────────────────── */}
      <div className="flex flex-col overflow-hidden" style={{ width: '45%' }}>
        <div
          className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b"
          style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}
        >
          <div>
            <h2 className="text-sm font-extrabold" style={{ color: '#2C1810' }}>Decisiones</h2>
            <p className="text-[11px]" style={{ color: '#8B6650' }}>{festivalNombre}</p>
          </div>
          {highlightedPuestoId && (
            <span
              className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full animate-pulse"
              style={{ backgroundColor: '#ECFDF5', color: '#059669', border: '1px solid #6EE7B7' }}
            >
              ✓ Aplicado en mapa
            </span>
          )}
        </div>

        <DecisionsView
          festivalId={festivalId}
          festivalNombre={festivalNombre}
          modoAuto={modoAuto}
          onToggleModo={onToggleModo}
          onDecisionApproved={handleDecisionApproved}
          compact
        />
      </div>

    </div>
  );
}
