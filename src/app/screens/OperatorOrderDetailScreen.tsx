import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate, useParams } from '../utils/navigation';
import { getPedido, cambiarEstadoPedido } from '../api';
import { formatPrice } from '../utils/formatPrice';

type DBStatus = 'pendiente' | 'confirmado' | 'preparando' | 'listo' | 'entregado' | 'cancelado';

interface Props {
    readOnly?: boolean;
}

export function OperatorOrderDetailScreen({ readOnly = false }: Props) {
    const navigate = useNavigate();
    const { id } = useParams();

    const [pedido, setPedido] = useState<any>(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPedido = async (silent = false) => {
        if (!id) {
            setError('ID de pedido inválido');
            setInitialLoading(false);
            return;
        }

        try {
            if (!silent) setInitialLoading(true);
            const data = await getPedido(Number(id));
            setPedido(data);
            setError(null);
        } catch (e: any) {
            console.error(e);
            setPedido(null);
            setError(e?.message || 'Error cargando pedido');
        } finally {
            if (!silent) setInitialLoading(false);
        }
    };

    useEffect(() => {
        fetchPedido(false);
    }, [id]);

    useEffect(() => {
        const isActive =
            pedido?.estado === 'pendiente' ||
            pedido?.estado === 'confirmado' ||
            pedido?.estado === 'preparando';

        if (!id || !isActive) return;
        const t = setInterval(() => fetchPedido(true), 10000);
        return () => clearInterval(t);
    }, [id, pedido?.estado]);

    const stepIndex = useMemo(() => {
        const s: DBStatus = pedido?.estado;
        if (s === 'pendiente') return -1;
        if (s === 'confirmado') return 0;
        if (s === 'preparando') return 1;
        if (s === 'listo' || s === 'entregado') return 2;
        return -1;
    }, [pedido?.estado]);

    const estado: DBStatus | undefined = pedido?.estado;
    const isCancelado = estado === 'cancelado';
    const isFinalizado = estado === 'listo' || estado === 'entregado';
    const canMarkPreparing = estado === 'confirmado';
    const canMarkFinished = estado === 'preparando';

    const disablePreparingBtn = saving || isCancelado || isFinalizado || !canMarkPreparing || readOnly;
    const disableFinishedBtn = saving || isCancelado || isFinalizado || !canMarkFinished || readOnly;

    const marcarEstado = async (nuevoEstado: DBStatus) => {
        if (!pedido?.id || readOnly) return;
        setSaving(true);
        try {
            await cambiarEstadoPedido(pedido.id, nuevoEstado);
            await fetchPedido(true);
        } catch (e: any) {
            setError(e?.message || 'No se pudo actualizar el estado');
        } finally {
            setSaving(false);
        }
    };

    if (initialLoading) return (
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#FDF6EE' }}>
            <p className="text-sm" style={{ color: '#C8956C', opacity: 0.6 }}>Cargando...</p>
        </div>
    );

    if (error) return (
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#FDF6EE' }}>
            <p className="text-sm text-red-600">{error}</p>
        </div>
    );

    if (!pedido) return (
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#FDF6EE' }}>
            <p className="text-sm" style={{ color: '#C8956C', opacity: 0.6 }}>Pedido no encontrado</p>
        </div>
    );

    const stepColors = [
        { label: 'Nuevo',      active: stepIndex >= 0, color: '#6366F1' },
        { label: 'En Proceso', active: stepIndex >= 1, color: '#F59E0B' },
        { label: 'Terminado',  active: stepIndex >= 2, color: '#4CAF88' },
    ];

    return (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>

            {/* Header */}
            <div
                className="flex-shrink-0 flex items-center gap-3 px-4 py-3"
                style={{ background: 'linear-gradient(135deg, #C8956C, #A67C52)', boxShadow: '0 2px 8px rgba(166,124,82,0.20)' }}
            >
                <button
                    onClick={() => navigate(readOnly ? '/operador/pedidos' : '/operador/tickets')}
                    className="p-1.5 rounded-full"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                    <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <h1 className="text-sm font-extrabold text-white">Vista de Pedido Detallado</h1>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-3">

                {/* Order summary */}
                <div className="rounded-2xl border p-4" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
                    <h2 className="text-2xl font-extrabold mb-1" style={{ color: '#2C1810' }}>#{pedido.id}</h2>
                    <p className="text-xs" style={{ color: '#8B6650' }}>Alias: {pedido?.usuario_nombre || 'Cliente'}</p>
                    <p className="text-xs mb-4" style={{ color: '#C8956C' }}>
                        {new Date(pedido.creado_en).toLocaleString('es-ES')}
                    </p>

                    <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#E8D5C0' }}>
                        <div className="grid grid-cols-3 px-3 py-2 text-[11px] font-bold" style={{ backgroundColor: '#E8D5C0', color: '#2C1810' }}>
                            <span>Item</span><span className="text-center">Qty</span><span className="text-right">Precio</span>
                        </div>
                        {pedido.items?.map((it: any, idx: number) => (
                            <div key={idx} className="grid grid-cols-3 px-3 py-2 text-xs border-t" style={{ borderColor: '#E8D5C0', color: '#2C1810' }}>
                                <span>{it.producto_nombre}</span>
                                <span className="text-center">{it.cantidad}</span>
                                <span className="text-right">{formatPrice(Number(it.precio_unitario) * Number(it.cantidad))}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between font-extrabold text-sm border-t pt-3 mt-3" style={{ borderColor: '#E8D5C0', color: '#2C1810' }}>
                        <span>Total pedido</span>
                        <span style={{ color: '#A67C52' }}>{formatPrice(Number(pedido.total))}</span>
                    </div>
                </div>

                {/* Timeline */}
                <div className="rounded-2xl border p-4" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
                    <h3 className="text-xs font-bold mb-3" style={{ color: '#2C1810' }}>Timeline</h3>
                    <div className="flex items-center justify-between">
                        {stepColors.map(({ label, active, color }) => (
                            <span
                                key={label}
                                className="text-[11px] font-semibold transition-colors"
                                style={{ color: active ? color : '#C4B5A5' }}
                            >
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Action buttons */}
            {!readOnly && (
                <div className="flex-shrink-0 p-3 border-t space-y-2" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
                    <button
                        disabled={disablePreparingBtn}
                        onClick={() => marcarEstado('preparando')}
                        className="w-full py-3 rounded-full text-sm font-extrabold text-white transition-opacity disabled:opacity-40"
                        style={{ backgroundColor: '#F59E0B' }}
                    >
                        MARCAR EN PROCESO
                    </button>
                    <button
                        disabled={disableFinishedBtn}
                        onClick={() => marcarEstado('listo')}
                        className="w-full py-3 rounded-full text-sm font-extrabold text-white transition-opacity disabled:opacity-40"
                        style={{ backgroundColor: '#4CAF88' }}
                    >
                        MARCAR TERMINADO
                    </button>
                </div>
            )}
        </div>
    );
}
