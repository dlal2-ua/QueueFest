// DecisionCard.tsx
// Tarjeta que representa una decisión automática generada por el sistema.
// Si está pendiente y el gestor está en modo manual, muestra botones de Aprobar/Rechazar.
// En modo automático o si ya fue procesada, muestra solo el estado (badge).

import { Store, XSquare, Tag, TrendingUp, CheckCircle2, XCircle, Zap, Clock } from 'lucide-react';

export type DecisionTipo = 'abrir_barra' | 'cerrar_barra' | 'activar_promocion' | 'ajuste_precio';
export type DecisionEstado = 'pendiente' | 'aprobada' | 'rechazada' | 'ejecutada';

export interface Decision {
  id: number;
  festival_id: number;
  puesto_id: number | null;
  puesto_nombre: string | null;
  tipo: DecisionTipo;
  descripcion: string;
  estado: DecisionEstado;
  creado_en: string;
  minutos_desde_creacion?: number;
}

interface DecisionCardProps {
  decision: Decision;
  modoAuto: boolean;
  onAprobar: (id: number) => void;
  onRechazar: (id: number) => void;
  loading?: boolean;
}

const TIPO_CONFIG: Record<DecisionTipo, { label: string; icon: React.FC<any>; color: string; bg: string }> = {
  abrir_barra: {
    label: 'Abrir Barra',
    icon: Store,
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
  },
  cerrar_barra: {
    label: 'Cerrar Barra',
    icon: XSquare,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
  },
  activar_promocion: {
    label: 'Activar Promoción',
    icon: Tag,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
  },
  ajuste_precio: {
    label: 'Ajuste de Precio',
    icon: TrendingUp,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
  },
};

const ESTADO_BADGE: Record<DecisionEstado, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  aprobada:  { label: 'Aprobada',  cls: 'bg-green-100 text-green-700 border-green-200' },
  rechazada: { label: 'Rechazada', cls: 'bg-red-100 text-red-600 border-red-200' },
  ejecutada: { label: 'Auto-ejecutada', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
};

function formatRelative(dateStr: string, minutesFromServer?: number): string {
  if (typeof minutesFromServer === 'number' && Number.isFinite(minutesFromServer)) {
    const mins = Math.max(0, Math.floor(minutesFromServer));
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} día${days === 1 ? '' : 's'}`;
  }

  // Si no trae zona explícita, lo tratamos como UTC para evitar desfases fijos (p. ej. +2h).
  const hasExplicitTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(dateStr);
  const normalized = hasExplicitTz
    ? dateStr
    : dateStr.replace(' ', 'T') + 'Z';

  const parsed = new Date(normalized).getTime();
  if (Number.isNaN(parsed)) return 'Fecha inválida';

  const diff = Date.now() - parsed;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return new Date(dateStr).toLocaleDateString('es-ES');
}

export function DecisionCard({ decision, modoAuto, onAprobar, onRechazar, loading }: DecisionCardProps) {
  const config = TIPO_CONFIG[decision.tipo];
  const badge = ESTADO_BADGE[decision.estado];
  const Icon = config.icon;
  const esPendiente = decision.estado === 'pendiente';

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${config.bg} transition-all`}>
      <div className="flex items-start gap-3">
        {/* Icono */}
        <div className={`p-2 rounded-lg bg-white shadow-sm flex-shrink-0 ${config.color}`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-sm font-bold ${config.color}`}>{config.label}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>
              {badge.label}
            </span>
            {decision.estado === 'ejecutada' && (
              <span className="flex items-center gap-1 text-[10px] text-blue-500">
                <Zap className="w-3 h-3" /> Automático
              </span>
            )}
          </div>

          <p className="text-sm text-gray-700 leading-snug mb-1">{decision.descripcion}</p>

          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            {formatRelative(decision.creado_en, decision.minutos_desde_creacion)}
            {decision.puesto_nombre && (
              <span className="ml-1">· {decision.puesto_nombre}</span>
            )}
          </div>
        </div>
      </div>

      {/* Botones — solo en modo manual y si está pendiente */}
      {esPendiente && !modoAuto && (
        <div className="flex gap-2 mt-3">
          <button
            id={`decision-aprobar-${decision.id}`}
            onClick={() => onAprobar(decision.id)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            Aprobar
          </button>
          <button
            id={`decision-rechazar-${decision.id}`}
            onClick={() => onRechazar(decision.id)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-red-300 hover:bg-red-50 text-red-600 text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            Rechazar
          </button>
        </div>
      )}
    </div>
  );
}
