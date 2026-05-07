import { useEffect, useState, useCallback } from 'react';
import { getStockPuesto, getStockAlmacen, reabastecerMateriaPrima, getPrediccion5h, getReposicionesAprobadas, confirmarReposicion } from '../api';
import { useOperatorPuesto } from '../context/OperatorPuestoContext';
import {
    RefreshCw, AlertTriangle, CheckCircle, AlertCircle,
    Package, ChevronDown, ChevronUp, TrendingUp, X, Plus, Minus, Bell,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

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

type HoraPrediccion = {
    hora: number;
    offset_horas: number;
    consumo_previsto: number;
    stock_tras_hora: number;
    riesgo: boolean;
};

type PrediccionItem = {
    materia_prima_id: number;
    nombre: string;
    unidad_medida: string;
    stock_actual: number;
    stock_minimo: number;
    stock_maximo: number;
    consumo_total_5h: number;
    hay_riesgo: boolean;
    sin_datos: boolean;
    horas: HoraPrediccion[];
};

type Prediccion5hResponse = {
    hora_actual: number;
    horas_objetivo: number[];
    predicciones: PrediccionItem[];
};

// ─── Estado config ────────────────────────────────────────────────────────────

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

// ─── StockBar ─────────────────────────────────────────────────────────────────

function StockBar({ actual, minimo, maximo, estado }: {
    actual: number; minimo: number; maximo: number; estado: 'critico' | 'bajo' | 'ok';
}) {
    const cfg = ESTADO_CONFIG[estado];
    const pct = maximo > 0 ? Math.min((actual / maximo) * 100, 100) : 0;
    const minPct = maximo > 0 ? Math.min((minimo / maximo) * 100, 100) : 0;

    return (
        <div className="mt-2.5">
            <div className="relative w-full h-3 rounded-full overflow-visible" style={{ backgroundColor: cfg.trackBg }}>
                <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                />
                <div
                    className="absolute top-[-3px] h-[18px] w-[2px] rounded-full z-10"
                    style={{ left: `${minPct}%`, backgroundColor: '#64748B' }}
                    title={`Mínimo: ${minimo}`}
                />
            </div>
            <div className="flex justify-between mt-1">
                <span className="text-[10px]" style={{ color: '#94A3B8' }}>0</span>
                <span className="text-[10px] font-semibold" style={{ color: cfg.color }}>
                    {actual.toFixed(actual % 1 === 0 ? 0 : 2)}
                </span>
                <span className="text-[10px]" style={{ color: '#94A3B8' }}>{maximo}</span>
            </div>
        </div>
    );
}

// ─── RestockModal ─────────────────────────────────────────────────────────────

function RestockModal({ item, puestoId, onSuccess, onClose }: {
    item: StockItem;
    puestoId: number;
    onSuccess: () => void;
    onClose: () => void;
}) {
    const [cantidad, setCantidad] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [loadingAlmacen, setLoadingAlmacen] = useState(true);
    const [stockAlmacen, setStockAlmacen] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    // Cargar stock del almacén central al abrir el modal
    useEffect(() => {
        let cancelled = false;
        const fetchAlmacen = async () => {
            setLoadingAlmacen(true);
            try {
                const data = await getStockAlmacen(puestoId, item.materia_prima_id);
                if (!cancelled) {
                    setStockAlmacen(data.stock_disponible);
                    // Sugerir cantidad: lo que quepa en el puesto, limitado por lo que hay en almacén
                    const espacioPuesto = Math.max(item.stock_maximo - item.stock_actual, 0);
                    const sugerida = Math.min(espacioPuesto, data.stock_disponible);
                    setCantidad(sugerida % 1 === 0 ? String(sugerida) : sugerida.toFixed(2));
                }
            } catch {
                if (!cancelled) {
                    setStockAlmacen(null);
                    setError('No se pudo consultar el stock del almacén');
                }
            } finally {
                if (!cancelled) setLoadingAlmacen(false);
            }
        };
        fetchAlmacen();
        return () => { cancelled = true; };
    }, [puestoId, item.materia_prima_id, item.stock_maximo, item.stock_actual]);

    const cantidadNum = parseFloat(cantidad) || 0;
    const espacioPuesto = Math.max(item.stock_maximo - item.stock_actual, 0);
    const maxPermitido = stockAlmacen !== null ? Math.min(espacioPuesto, stockAlmacen) : espacioPuesto;
    const nuevoStock = Math.min(item.stock_actual + cantidadNum, item.stock_maximo);
    const excede = cantidadNum > maxPermitido;

    const handleConfirm = async () => {
        if (cantidadNum <= 0) { setError('La cantidad debe ser mayor que 0'); return; }
        if (excede) { setError(`No puedes pedir más de ${maxPermitido} ${item.unidad_medida}`); return; }
        setLoading(true);
        setError(null);
        try {
            await reabastecerMateriaPrima(puestoId, item.materia_prima_id, cantidadNum);
            setDone(true);
            setTimeout(() => { onSuccess(); onClose(); }, 900);
        } catch (e: any) {
            setError(e?.message || 'Error al reabastecer');
        } finally {
            setLoading(false);
        }
    };

    const adj = (delta: number) => {
        const v = Math.max(0, Math.min(cantidadNum + delta, maxPermitido));
        setCantidad(v % 1 === 0 ? String(v) : v.toFixed(2));
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="w-full max-w-sm rounded-t-3xl p-5 pb-8 animate-slide-up"
                style={{ backgroundColor: '#FDF6EE', boxShadow: '0 -8px 32px rgba(166,124,82,0.18)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: '#C8956C22' }}>
                            <Package className="w-4 h-4" style={{ color: '#C8956C' }} />
                        </div>
                        <div>
                            <h2 className="text-sm font-extrabold" style={{ color: '#2C1810' }}>Reabastecer</h2>
                            <p className="text-[10px]" style={{ color: '#8B6650' }}>{item.nombre}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full" style={{ backgroundColor: '#F1E8DE' }}>
                        <X className="w-4 h-4" style={{ color: '#8B6650' }} />
                    </button>
                </div>

                {/* Stock del almacén central */}
                <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#3B82F6' }}>
                        📦 Stock disponible en almacén central
                    </p>
                    {loadingAlmacen ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                                style={{ borderColor: '#3B82F6', borderTopColor: 'transparent' }} />
                            <p className="text-xs" style={{ color: '#3B82F6' }}>Consultando almacén…</p>
                        </div>
                    ) : stockAlmacen !== null ? (
                        <p className="text-lg font-extrabold" style={{ color: stockAlmacen > 0 ? '#1D4ED8' : '#EF4444' }}>
                            {stockAlmacen % 1 === 0 ? stockAlmacen : stockAlmacen.toFixed(2)} {item.unidad_medida}
                            {stockAlmacen <= 0 && <span className="text-xs ml-2 font-normal" style={{ color: '#EF4444' }}>⚠ Agotado</span>}
                        </p>
                    ) : (
                        <p className="text-xs" style={{ color: '#EF4444' }}>No se pudo consultar</p>
                    )}
                </div>

                {/* Resumen actual del puesto */}
                <div className="flex gap-2 mb-4">
                    {[
                        { label: 'Actual', value: item.stock_actual, color: '#64748B' },
                        { label: 'Mínimo', value: item.stock_minimo, color: '#F59E0B' },
                        { label: 'Máximo', value: item.stock_maximo, color: '#10B981' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="flex-1 rounded-xl p-2 text-center"
                            style={{ backgroundColor: '#F1E8DE' }}>
                            <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{label}</p>
                            <p className="text-sm font-extrabold" style={{ color }}>
                                {value % 1 === 0 ? value : value.toFixed(2)}
                            </p>
                            <p className="text-[9px]" style={{ color: '#94A3B8' }}>{item.unidad_medida}</p>
                        </div>
                    ))}
                </div>

                {/* Cantidad a añadir */}
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#94A3B8' }}>
                    Cantidad a mover del almacén ({item.unidad_medida})
                    {stockAlmacen !== null && (
                        <span className="ml-1 normal-case" style={{ color: '#3B82F6' }}>
                            · máx: {maxPermitido % 1 === 0 ? maxPermitido : maxPermitido.toFixed(2)}
                        </span>
                    )}
                </p>
                <div className="flex items-center gap-2 mb-2">
                    <button
                        onClick={() => adj(-1)}
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: '#F1E8DE' }}
                        disabled={loadingAlmacen || (stockAlmacen !== null && stockAlmacen <= 0)}
                    >
                        <Minus className="w-4 h-4" style={{ color: '#C8956C' }} />
                    </button>
                    <input
                        type="number"
                        min={0}
                        max={maxPermitido}
                        step={item.unidad_medida === 'unidad' ? 1 : 0.1}
                        value={cantidad}
                        onChange={e => setCantidad(e.target.value)}
                        disabled={loadingAlmacen || (stockAlmacen !== null && stockAlmacen <= 0)}
                        className="flex-1 text-center text-lg font-extrabold rounded-xl px-3 py-2.5 outline-none border-2"
                        style={{
                            backgroundColor: '#fff',
                            borderColor: excede ? '#EF4444' : '#C8956C',
                            color: excede ? '#EF4444' : '#2C1810'
                        }}
                    />
                    <button
                        onClick={() => adj(1)}
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: '#C8956C' }}
                        disabled={loadingAlmacen || (stockAlmacen !== null && stockAlmacen <= 0)}
                    >
                        <Plus className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Aviso si excede */}
                {excede && (
                    <p className="text-xs mb-2 text-center font-semibold" style={{ color: '#EF4444' }}>
                        ⚠ No puedes pedir más de lo disponible en almacén ({maxPermitido} {item.unidad_medida})
                    </p>
                )}

                {/* Preview nuevo stock */}
                {cantidadNum > 0 && !excede && (
                    <div className="rounded-xl p-2.5 mb-3 flex items-center gap-2"
                        style={{ backgroundColor: '#ECFDF5', border: '1px solid #BBF7D0' }}>
                        <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: '#10B981' }} />
                        <p className="text-xs" style={{ color: '#065F46' }}>
                            Stock resultante del puesto: <span className="font-extrabold">{nuevoStock % 1 === 0 ? nuevoStock : nuevoStock.toFixed(2)} {item.unidad_medida}</span>
                            {nuevoStock >= item.stock_maximo && <span className="ml-1 text-[10px]">(máximo)</span>}
                        </p>
                    </div>
                )}

                {error && (
                    <p className="text-xs mb-3 text-center font-semibold" style={{ color: '#EF4444' }}>{error}</p>
                )}

                {/* Botón confirmar */}
                <button
                    onClick={handleConfirm}
                    disabled={loading || done || cantidadNum <= 0 || excede || loadingAlmacen || (stockAlmacen !== null && stockAlmacen <= 0)}
                    className="w-full py-3 rounded-2xl font-extrabold text-sm transition-all"
                    style={{
                        backgroundColor: done ? '#10B981' : (stockAlmacen !== null && stockAlmacen <= 0) ? '#94A3B8' : '#C8956C',
                        color: '#fff',
                        opacity: (loading || cantidadNum <= 0 || excede || loadingAlmacen) && !done ? 0.6 : 1
                    }}
                >
                    {done
                        ? '✓ Abastecido'
                        : (stockAlmacen !== null && stockAlmacen <= 0)
                            ? 'Almacén agotado'
                            : loading
                                ? 'Guardando…'
                                : `Mover ${cantidadNum > 0 ? (cantidadNum % 1 === 0 ? cantidadNum : cantidadNum.toFixed(2)) : ''} ${item.unidad_medida} al puesto`
                    }
                </button>

                {/* Info transacción */}
                <p className="text-[9px] text-center mt-2" style={{ color: '#94A3B8' }}>
                    El stock se mueve del almacén central al puesto de forma atómica (transacción)
                </p>
            </div>
        </div>
    );
}

// ─── Prediction5hPanel ────────────────────────────────────────────────────────

function Prediction5hPanel({ puestoId }: { puestoId: number }) {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState<Prediccion5hResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getPrediccion5h(puestoId);
            setData(res);
        } catch (e: any) {
            setError(e?.message || 'Error cargando predicción');
        } finally {
            setLoading(false);
        }
    }, [puestoId]);

    useEffect(() => {
        if (open && !data) cargar();
    }, [open, data, cargar]);

    const riskCount = data?.predicciones.filter(p => p.hay_riesgo).length ?? 0;

    return (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E2D5C8', backgroundColor: '#fff' }}>
            {/* Toggle header */}
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3"
                style={{ backgroundColor: open ? '#FDF0E4' : '#fff' }}
            >
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#C8956C22' }}>
                        <TrendingUp className="w-3.5 h-3.5" style={{ color: '#C8956C' }} />
                    </div>
                    <div className="text-left">
                        <p className="text-xs font-extrabold" style={{ color: '#2C1810' }}>Previsión próximas 5h</p>
                        <p className="text-[10px]" style={{ color: '#8B6650' }}>Consumo estimado por hora</p>
                    </div>
                    {riskCount > 0 && (
                        <span
                            className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                            style={{ backgroundColor: '#EF4444' }}
                        >
                            {riskCount} riesgo{riskCount > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                {open
                    ? <ChevronUp className="w-4 h-4" style={{ color: '#C8956C' }} />
                    : <ChevronDown className="w-4 h-4" style={{ color: '#C8956C' }} />
                }
            </button>

            {open && (
                <div className="px-4 pb-4 pt-1 space-y-3">
                    {loading && (
                        <div className="flex items-center justify-center py-6 gap-2">
                            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                                style={{ borderColor: '#C8956C', borderTopColor: 'transparent' }} />
                            <p className="text-xs" style={{ color: '#C8956C' }}>Calculando previsión…</p>
                        </div>
                    )}
                    {error && (
                        <p className="text-xs text-center py-4" style={{ color: '#EF4444' }}>{error}</p>
                    )}
                    {data && !loading && (
                        <>
                            {/* Hora header */}
                            <div className="flex items-center gap-1 mb-1">
                                {data.horas_objetivo.map(h => (
                                    <div key={h} className="flex-1 text-center">
                                        <span className="text-[10px] font-semibold" style={{ color: '#C8956C' }}>
                                            {String(h).padStart(2, '0')}h
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {data.predicciones.length === 0 && (
                                <p className="text-xs text-center py-2" style={{ color: '#94A3B8' }}>
                                    Sin datos de histórico disponibles.
                                </p>
                            )}

                            {data.predicciones.map(pred => {
                                const maxConsumo = Math.max(...pred.horas.map(h => h.consumo_previsto), 0.001);
                                return (
                                    <div key={pred.materia_prima_id}
                                        className="rounded-xl p-3"
                                        style={{
                                            backgroundColor: pred.hay_riesgo ? '#FFF1F2' : '#F8F4F0',
                                            border: `1px solid ${pred.hay_riesgo ? '#FECDD3' : '#E9DDD1'}`,
                                        }}>
                                        {/* MP header */}
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[11px] font-extrabold truncate" style={{ color: '#2C1810' }}>
                                                {pred.nombre}
                                            </p>
                                            <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                                                {pred.hay_riesgo && (
                                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                                                        style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
                                                        ⚠ Riesgo
                                                    </span>
                                                )}
                                                {pred.sin_datos && (
                                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                                                        style={{ backgroundColor: '#F1F5F9', color: '#94A3B8' }}>
                                                        Sin hist.
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Mini bar chart */}
                                        <div className="flex items-end gap-1" style={{ height: 36 }}>
                                            {pred.horas.map(h => {
                                                const barPct = maxConsumo > 0 ? (h.consumo_previsto / maxConsumo) * 100 : 0;
                                                return (
                                                    <div key={h.hora} className="flex-1 flex flex-col items-center justify-end gap-0.5" style={{ height: '100%' }}>
                                                        <div
                                                            className="w-full rounded-sm transition-all"
                                                            style={{
                                                                height: `${Math.max(barPct, 4)}%`,
                                                                backgroundColor: h.riesgo ? '#EF4444' : '#C8956C',
                                                                minHeight: 3
                                                            }}
                                                            title={`${h.consumo_previsto} ${pred.unidad_medida}`}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Consumo total y stock restante */}
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="text-[10px]" style={{ color: '#8B6650' }}>
                                                Consumo total: <span className="font-bold">{pred.consumo_total_5h} {pred.unidad_medida}</span>
                                            </p>
                                            <p className="text-[10px]" style={{ color: pred.hay_riesgo ? '#EF4444' : '#10B981' }}>
                                                Quedarán: <span className="font-bold">
                                                    {Math.max(pred.stock_actual - pred.consumo_total_5h, 0).toFixed(1)} {pred.unidad_medida}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}

                            <p className="text-center text-[10px]" style={{ color: '#94A3B8' }}>
                                Basado en pedidos históricos (últimos 7 días)
                            </p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── StockCard ────────────────────────────────────────────────────────────────

function StockCard({ item, onRestock }: { item: StockItem; onRestock: (item: StockItem) => void }) {
    const cfg = ESTADO_CONFIG[item.estado];
    const { Icon } = cfg;

    return (
        <div
            className="rounded-2xl border p-3.5 transition-all"
            style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
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
                <div className="flex items-center gap-1.5">
                    {/* Estado badge */}
                    <div
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: '#fff', border: `1px solid ${cfg.border}` }}
                    >
                        <Icon className="w-3 h-3" style={{ color: cfg.color }} />
                        <span className="text-[9px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                    {/* Restock button */}
                    <button
                        onClick={() => onRestock(item)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0 transition-all"
                        style={{ backgroundColor: '#C8956C', border: '1px solid #A67C52' }}
                        title="Reabastecer"
                    >
                        <Package className="w-3 h-3 text-white" />
                        <span className="text-[9px] font-bold text-white">Reabastecer</span>
                    </button>
                </div>
            </div>

            <StockBar
                actual={item.stock_actual}
                minimo={item.stock_minimo}
                maximo={item.stock_maximo}
                estado={item.estado}
            />

            <div className="flex gap-3 mt-2.5">
                {[
                    { label: 'Actual', value: item.stock_actual, color: cfg.color },
                    { label: 'Mín', value: item.stock_minimo, color: '#64748B' },
                    { label: 'Máx', value: item.stock_maximo, color: '#64748B' },
                ].map(({ label, value, color }, i, arr) => (
                    <>
                        <div key={label} className="flex-1 text-center">
                            <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{label}</p>
                            <p className="text-sm font-extrabold" style={{ color }}>
                                {value % 1 === 0 ? value : value.toFixed(2)}
                            </p>
                        </div>
                        {i < arr.length - 1 && <div className="w-px" style={{ backgroundColor: cfg.border }} />}
                    </>
                ))}
            </div>
        </div>
    );
}

// ─── OperatorStockScreen ──────────────────────────────────────────────────────

type ReposicionAprobada = { id: number; descripcion: string; creado_en: string };

export function OperatorStockScreen() {
    const { puestoId, puestoNombre } = useOperatorPuesto();
    const [stock, setStock] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [restockItem, setRestockItem] = useState<StockItem | null>(null);
    const [reposiciones, setReposiciones] = useState<ReposicionAprobada[]>([]);
    const [restockDecisionId, setRestockDecisionId] = useState<number | null>(null);

    const cargarStock = useCallback(async () => {
        if (!puestoId) return;
        try {
            setError(null);
            const data = await getStockPuesto(puestoId);
            setStock(Array.isArray(data) ? data : []);
            setLastUpdated(new Date());
        } catch (e: any) {
            setError(e?.message || 'Error cargando stock');
        } finally {
            setLoading(false);
        }
    }, [puestoId]);

    const cargarReposiciones = useCallback(async () => {
        if (!puestoId) return;
        try {
            const data = await getReposicionesAprobadas(puestoId);
            setReposiciones(data);
        } catch { /* silencioso */ }
    }, [puestoId]);

    useEffect(() => {
        if (!puestoId) return;
        setLoading(true);
        cargarStock();
        cargarReposiciones();
        const interval = setInterval(() => { cargarStock(); cargarReposiciones(); }, 30000);
        return () => clearInterval(interval);
    }, [puestoId, cargarStock, cargarReposiciones]);

    const handleRestockFromDecision = (repo: ReposicionAprobada) => {
        // Buscar el stock item cuyo nombre aparece en la descripción
        const match = stock.find(s => repo.descripcion.includes(s.nombre));
        if (match) {
            setRestockDecisionId(repo.id);
            setRestockItem(match);
        }
    };

    const handleRestockSuccess = useCallback(async () => {
        if (restockDecisionId) {
            try { await confirmarReposicion(restockDecisionId); } catch { /* ignorar */ }
            setRestockDecisionId(null);
        }
        cargarStock();
        cargarReposiciones();
    }, [restockDecisionId, cargarStock, cargarReposiciones]);

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
                        {puestoNombre && <p className="text-[11px] text-white/70">{puestoNombre}</p>}
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
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: 'rgba(239,68,68,0.25)' }}>
                                <AlertTriangle className="w-3 h-3 text-white" />
                                <span className="text-[10px] font-bold text-white">{criticos} crítico{criticos > 1 ? 's' : ''}</span>
                            </div>
                        )}
                        {bajos > 0 && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: 'rgba(245,158,11,0.25)' }}>
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
                        {/* Reposiciones aprobadas por gestor */}
                        {reposiciones.length > 0 && (
                            <div className="space-y-2">
                                {reposiciones.map(repo => (
                                    <div
                                        key={repo.id}
                                        className="rounded-2xl border p-3 flex items-start gap-3"
                                        style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}
                                    >
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: '#FEF3C7' }}>
                                            <Bell className="w-4 h-4" style={{ color: '#D97706' }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-extrabold mb-0.5" style={{ color: '#92400E' }}>
                                                Gestor aprobó reposición
                                            </p>
                                            <p className="text-[11px] leading-snug" style={{ color: '#78350F' }}>
                                                {repo.descripcion}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleRestockFromDecision(repo)}
                                            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                                            style={{ backgroundColor: '#D97706' }}
                                        >
                                            <Package className="w-3.5 h-3.5" />
                                            Reabastecer
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Panel predicción 5h */}
                        {puestoId && <Prediction5hPanel puestoId={puestoId} />}

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
                            <StockCard
                                key={item.materia_prima_id}
                                item={item}
                                onRestock={setRestockItem}
                            />
                        ))}

                        {lastUpdated && (
                            <p className="text-center text-[10px] pb-2" style={{ color: '#94A3B8' }}>
                                Actualizado: {lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Restock modal */}
            {restockItem && puestoId && (
                <RestockModal
                    item={restockItem}
                    puestoId={puestoId}
                    onSuccess={handleRestockSuccess}
                    onClose={() => { setRestockItem(null); setRestockDecisionId(null); }}
                />
            )}
        </div>
    );
}
