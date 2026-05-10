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
    <div className="flex flex-1 overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>

      {/* ── Mitad izquierda: Mapa ──────────────────────────────────────── */}
      <div className="w-1/2 flex flex-col overflow-hidden border-r" style={{ borderColor: '#E8D5C0' }}>
        {/* MapView ya tiene su propio header/controles */}
        <MapView
          festivalId={festivalId}
          festivalNombre={festivalNombre}
          navigate={navigate}
          highlightedPuestoId={highlightedPuestoId}
        />
      </div>

      {/* ── Mitad derecha: Decisiones ──────────────────────────────────── */}
      <div className="w-1/2 flex flex-col overflow-hidden">
        {/* Header propio del panel de decisiones */}
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
