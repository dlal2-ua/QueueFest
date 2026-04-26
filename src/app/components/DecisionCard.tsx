import {
  Store, XSquare, Tag, TrendingUp, TrendingDown, Package,
  CheckCircle2, XCircle, Zap, Clock, Trophy, AlertCircle,
  PauseCircle,
} from 'lucide-react';

export type DecisionTipo =
  | 'abrir_barra'
  | 'cerrar_barra'
  | 'activar_promocion'
  | 'ajuste_precio'
  | 'descuento_producto'
  | 'reposicion_stock';

export type DecisionEstado = 'pendiente' | 'aprobada' | 'rechazada' | 'ejecutada';

export interface Decision {
  id: number;
  festival_id: number;
  puesto_id: number | null;
  puesto_nombre: string | null;
  producto_id: number | null;
  producto_nombre: string | null;
  tipo: DecisionTipo;
  descripcion: string;
  estado: DecisionEstado;
  creado_en: string;
  minutos_desde_creacion?: number;
  grupo_ab: string | null;
  variante: 'A' | 'B' | null;
  porcentaje: number | null;
  ventas_antes: number | null;
  ventas_despues: number | null;
  ganadora: 0 | 1 | null;
}

interface DecisionCardProps {
  decision: Decision;
  modoAuto: boolean;
  onAprobar: (id: number) => void;
  onRechazar: (id: number) => void;
  loading?: boolean;
}

const TIPO_CONFIG: Record<DecisionTipo, {
  label: string;
  icon: React.FC<any>;
  iconColor: string;
  borderColor: string;
  bg: string;
}> = {
  abrir_barra:       { label: 'Reanudar Pedidos',  icon: Store,        iconColor: 'text-emerald-600', borderColor: 'border-emerald-200', bg: 'bg-emerald-50' },
  cerrar_barra:      { label: 'Pausar Pedidos',     icon: PauseCircle,  iconColor: 'text-red-500',     borderColor: 'border-red-200',     bg: 'bg-red-50'     },
  activar_promocion: { label: 'Activar Promoción',  icon: Tag,          iconColor: 'text-orange-500',  borderColor: 'border-orange-200',  bg: 'bg-orange-50'  },
  ajuste_precio:     { label: 'Subida de Precio',   icon: TrendingUp,   iconColor: 'text-violet-600',  borderColor: 'border-violet-200',  bg: 'bg-violet-50'  },
  descuento_producto:{ label: 'Descuento Producto', icon: TrendingDown, iconColor: 'text-blue-600',    borderColor: 'border-blue-200',    bg: 'bg-blue-50'    },
  reposicion_stock:  { label: 'Reponer Stock',      icon: Package,      iconColor: 'text-amber-600',   borderColor: 'border-amber-200',   bg: 'bg-amber-50'   },
};

const ESTADO_BADGE: Record<DecisionEstado, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente',      cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  aprobada:  { label: 'Aprobada',       cls: 'bg-green-100  text-green-700  border-green-200'  },
  rechazada: { label: 'Rechazada',      cls: 'bg-red-100    text-red-600    border-red-200'    },
  ejecutada: { label: 'Auto-ejecutada', cls: 'bg-blue-100   text-blue-700   border-blue-200'   },
};

function formatRelative(dateStr: string, minutesFromServer?: number): string {
  if (typeof minutesFromServer === 'number' && Number.isFinite(minutesFromServer)) {
    const mins = Math.max(0, Math.floor(minutesFromServer));
    if (mins < 1)  return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins} min`;
    const h = Math.floor(mins / 60);
    if (h < 24)    return `Hace ${h}h`;
    return `Hace ${Math.floor(h / 24)} día${Math.floor(h / 24) === 1 ? '' : 's'}`;
  }
  const hasExplicitTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(dateStr);
  const normalized = hasExplicitTz ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  const parsed = new Date(normalized).getTime();
  if (Number.isNaN(parsed)) return 'Fecha inválida';
  const diff = Date.now() - parsed;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24)    return `Hace ${h}h`;
  return new Date(dateStr).toLocaleDateString('es-ES');
}

export function DecisionCard({ decision, modoAuto, onAprobar, onRechazar, loading }: DecisionCardProps) {
  const config = TIPO_CONFIG[decision.tipo] ?? TIPO_CONFIG.ajuste_precio;
  const badge  = ESTADO_BADGE[decision.estado];
  const Icon   = config.icon;
  const esPendiente = decision.estado === 'pendiente';
  const esAB  = decision.grupo_ab !== null && decision.variante !== null;
  const tieneGanadora = decision.ganadora !== null;

  // Borde especial si es ganadora/perdedora en un par A/B resuelto
  const borderExtra = tieneGanadora
    ? decision.ganadora === 1
      ? 'border-emerald-400 ring-1 ring-emerald-300'
      : 'border-gray-200 opacity-60'
    : config.borderColor;

  return (
    <div className={`rounded-2xl border p-4 shadow-sm bg-white ${borderExtra} transition-all`}>
      <div className="flex items-start gap-3">
        {/* Icono */}
        <div className={`p-2 rounded-xl ${config.bg} flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-sm font-bold ${config.iconColor}`}>{config.label}</span>

            {/* Badge variante A/B */}
            {esAB && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                decision.variante === 'A'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-pink-50   text-pink-700   border-pink-200'
              }`}>
                Variante {decision.variante}
              </span>
            )}

            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>
              {badge.label}
            </span>

            {decision.estado === 'ejecutada' && !tieneGanadora && (
              <span className="flex items-center gap-1 text-[10px] text-blue-500">
                <Zap className="w-3 h-3" /> Automático
              </span>
            )}

            {/* Resultado A/B */}
            {tieneGanadora && decision.ganadora === 1 && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                <Trophy className="w-3 h-3" /> Ganadora
              </span>
            )}
            {tieneGanadora && decision.ganadora === 0 && (
              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                <XCircle className="w-3 h-3" /> Perdedora
              </span>
            )}
          </div>

          {/* Producto si existe */}
          {decision.producto_nombre && (
            <p className="text-xs font-semibold text-gray-700 mb-0.5">
              📦 {decision.producto_nombre}
            </p>
          )}

          <p className="text-sm text-gray-600 leading-snug mb-1">{decision.descripcion}</p>

          {/* Ventas post A/B */}
          {tieneGanadora && decision.ventas_despues !== null && (
            <p className="text-xs text-gray-400">
              Ventas tras descuento: <strong>{decision.ventas_despues}</strong> uds
              {decision.ventas_antes !== null && (
                <span> (antes: {decision.ventas_antes})</span>
              )}
            </p>
          )}

          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
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
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700
                       text-white text-sm font-semibold py-2 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            Aprobar
          </button>
          <button
            id={`decision-rechazar-${decision.id}`}
            onClick={() => onRechazar(decision.id)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-red-200
                       hover:bg-red-50 text-red-600 text-sm font-semibold py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            Rechazar
          </button>
        </div>
      )}

      {/* Alerta de solo lectura para reposicion_stock */}
      {decision.tipo === 'reposicion_stock' && esPendiente && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Acción manual requerida en almacén
        </div>
      )}
    </div>
  );
}
