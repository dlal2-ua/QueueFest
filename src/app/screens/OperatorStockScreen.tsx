import { useEffect, useState } from 'react';
import { getMisPuestosOperador, getStockPuesto } from '../api';
import { RefreshCw, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

type StockItem = {
    materia_prima_id: number;
    nombre: string;
    unidad_medida: string;
    stock_actual: number;
    stock_minimo: number;
    stock_maximo: number;
    estado: 'critico' | 'bajo' | 'ok';
    actualizado_en: string;
};

const ESTADO_CONFIG = {
    critico: {
        color: '#EF4444',
        bg: '#FEE2E2',
        border: '#FECACA',
        trackBg: '#FECACA',
        label: 'Crítico',
        Icon: AlertTriangle,
    },
    bajo: {
        color: '#F59E0B',
        bg: '#FFFBEB',
        border: '#FDE68A',
        trackBg: '#FDE68A',
        label: 'Bajo',
        Icon: AlertCircle,
    },
    ok: {
        color: '#10B981',
        bg: '#F0FDF4',
        border: '#BBF7D0',
        trackBg: '#BBF7D0',
        label: 'OK',
        Icon: CheckCircle,
    },
};

function StockBar({ actual, minimo, maximo, estado }: { actual: number; minimo: number; maximo: number; estado: 'critico' | 'bajo' | 'ok' }) {
    const cfg = ESTADO_CONFIG[estado];
    const pct = maximo > 0 ? Math.min((actual / maximo) * 100, 100) : 0;
    const minPct = maximo > 0 ? Math.min((minimo / maximo) * 100, 100) : 0;

    return (
        <div className="mt-2.5">
            {/* Barra */}
            <div
                className="relative w-full h-3 rounded-full overflow-visible"
                style={{ backgroundColor: cfg.trackBg }}
            >
                {/* Fill */}
                <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                />
                {/* Línea de mínimo */}
                <div
                    className="absolute top-[-3px] h-[18px] w-[2px] rounded-full z-10"
                    style={{ left: `${minPct}%`, backgroundColor: '#64748B' }}
                    title={`Mínimo: ${minimo}`}
                />
            </div>

            {/* Etiquetas */}
            <div className="flex justify-between mt-1">
                <span className="text-[10px]" style={{ color: '#94A3B8' }}>0</span>
                <span
                    className="text-[10px] font-semibold"
                    style={{ color: cfg.color }}
                >
                    {actual.toFixed(actual % 1 === 0 ? 0 : 2)}
                </span>
                <span className="text-[10px]" style={{ color: '#94A3B8' }}>{maximo}</span>
            </div>
        </div>
    );
}

function StockCard({ item }: { item: StockItem }) {
    const cfg = ESTADO_CONFIG[item.estado];
    const { Icon } = cfg;

    return (
        <div
            className="rounded-2xl border p-3.5 transition-all"
            style={{
                backgroundColor: cfg.bg,
                borderColor: cfg.border,
            }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-extrabold truncate" style={{ color: '#2C1810' }}>
                        {item.nombre}
                    </h3>
                    <p className="text-[10px] mt-0.5" style={{ color: '#8B6650' }}>
                        Unidad: <span className="font-semibold">{item.unidad_medida}</span>
                    </p>
                </div>
                <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: '#fff', border: `1px solid ${cfg.border}` }}
                >
                    <Icon className="w-3 h-3" style={{ color: cfg.color }} />
                    <span className="text-[9px] font-bold" style={{ color: cfg.color }}>
                        {cfg.label}
                    </span>
                </div>
            </div>

            <StockBar
                actual={item.stock_actual}
                minimo={item.stock_minimo}
                maximo={item.stock_maximo}
                estado={item.estado}
            />

            {/* Valores numéricos */}
            <div className="flex gap-3 mt-2.5">
                <div className="flex-1 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>Actual</p>
                    <p className="text-sm font-extrabold" style={{ color: cfg.color }}>
                        {item.stock_actual % 1 === 0 ? item.stock_actual : item.stock_actual.toFixed(2)}
                    </p>
                </div>
                <div className="w-px" style={{ backgroundColor: cfg.border }} />
                <div className="flex-1 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>Mín</p>
                    <p className="text-sm font-bold" style={{ color: '#64748B' }}>
                        {item.stock_minimo % 1 === 0 ? item.stock_minimo : item.stock_minimo.toFixed(2)}
                    </p>
                </div>
                <div className="w-px" style={{ backgroundColor: cfg.border }} />
                <div className="flex-1 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>Máx</p>
                    <p className="text-sm font-bold" style={{ color: '#64748B' }}>
                        {item.stock_maximo % 1 === 0 ? item.stock_maximo : item.stock_maximo.toFixed(2)}
                    </p>
                </div>
            </div>
        </div>
    );
}

export function OperatorStockScreen() {
    const [puestoId, setPuestoId] = useState<number | null>(null);
    const [puestoNombre, setPuestoNombre] = useState('');
    const [stock, setStock] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const cargarStock = async (currentPuestoId?: number) => {
        try {
            setError(null);
            let pid = currentPuestoId ?? puestoId;

            if (!pid) {
                const puestos = await getMisPuestosOperador();
                if (!Array.isArray(puestos) || puestos.length === 0) {
                    setStock([]);
                    setLoading(false);
                    return;
                }
                pid = Number(puestos[0].id);
                setPuestoId(pid);
                setPuestoNombre(puestos[0].nombre || '');
            }

            const data = await getStockPuesto(pid);
            setStock(Array.isArray(data) ? data : []);
            setLastUpdated(new Date());
        } catch (e: any) {
            setError(e?.message || 'Error cargando stock');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarStock();
        const interval = setInterval(() => cargarStock(), 30000);
        return () => clearInterval(interval);
    }, []);

    const criticos = stock.filter(s => s.estado === 'critico').length;
    const bajos = stock.filter(s => s.estado === 'bajo').length;

    return (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>

            {/* Header */}
            <div
                className="flex-shrink-0 px-4 py-3"
                style={{ background: 'linear-gradient(135deg, #C8956C, #A67C52)', boxShadow: '0 2px 8px rgba(166,124,82,0.20)' }}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-sm font-extrabold text-white">Stock</h1>
                        {puestoNombre && (
                            <p className="text-[11px] text-white/70">{puestoNombre}</p>
                        )}
                    </div>
                    <button
                        onClick={() => { setLoading(true); cargarStock(); }}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold"
                        style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                    >
                        <RefreshCw className="w-3 h-3" />
                        Actualizar
                    </button>
                </div>

                {/* Resumen alertas */}
                {!loading && (criticos > 0 || bajos > 0) && (
                    <div className="flex gap-2 mt-2">
                        {criticos > 0 && (
                            <div
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: 'rgba(239,68,68,0.25)' }}
                            >
                                <AlertTriangle className="w-3 h-3 text-white" />
                                <span className="text-[10px] font-bold text-white">{criticos} crítico{criticos > 1 ? 's' : ''}</span>
                            </div>
                        )}
                        {bajos > 0 && (
                            <div
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: 'rgba(245,158,11,0.25)' }}
                            >
                                <AlertCircle className="w-3 h-3 text-white" />
                                <span className="text-[10px] font-bold text-white">{bajos} bajo{bajos > 1 ? 's' : ''}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-4 space-y-3">

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                            style={{ borderColor: '#C8956C', borderTopColor: 'transparent' }} />
                        <p className="text-sm" style={{ color: '#C8956C', opacity: 0.6 }}>Cargando stock...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <AlertTriangle className="w-10 h-10" style={{ color: '#EF4444', opacity: 0.5 }} />
                        <p className="text-sm text-center" style={{ color: '#EF4444' }}>{error}</p>
                    </div>
                ) : stock.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <p className="text-sm text-center" style={{ color: '#C8956C', opacity: 0.5 }}>
                            No hay materias primas configuradas para este puesto.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Leyenda */}
                        <div className="flex items-center justify-between px-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>
                                {stock.length} materias primas
                            </p>
                            <div className="flex items-center gap-1" style={{ color: '#94A3B8' }}>
                                <div className="w-2 h-2 rounded-full bg-gray-400" />
                                <span className="text-[9px]">Línea = mínimo</span>
                            </div>
                        </div>

                        {stock.map(item => (
                            <StockCard key={item.materia_prima_id} item={item} />
                        ))}

                        {lastUpdated && (
                            <p className="text-center text-[10px] pb-2" style={{ color: '#94A3B8' }}>
                                Actualizado: {lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
