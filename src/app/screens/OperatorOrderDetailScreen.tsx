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

        // Antes de confirmar: no marcar ningún paso
        if (s === 'pendiente') return -1;

        // Confirmado = Nuevo
        if (s === 'confirmado') return 0;

        // En preparación
        if (s === 'preparando') return 1;

        // Finalizado
        if (s === 'listo' || s === 'entregado') return 2;

        // Cancelado u otros: nada marcado
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

    if (initialLoading) return <div className="p-4">Cargando...</div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;
    if (!pedido) return <div className="p-4">Pedido no encontrado</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-4 pb-56">
            <div className="flex items-center gap-2 mb-4">
                <button
                    onClick={() => navigate(readOnly ? '/operador/pedidos' : '/operador/tickets')}
                    className="p-2 rounded-full bg-white"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold">Vista de Pedido Detallado</h1>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h2 className="text-3xl font-extrabold mb-1">#{pedido.id}</h2>
                <p className="text-sm text-gray-700">Alias: {pedido?.usuario_nombre || 'Cliente'}</p>
                <p className="text-sm text-gray-500 mb-4">
                    Ordered: {new Date(pedido.creado_en).toLocaleString('es-ES')}
                </p>

                <div className="border rounded-lg overflow-hidden mb-3">
                    <div className="grid grid-cols-3 bg-gray-50 px-3 py-2 text-sm font-semibold">
                        <span>Item</span><span className="text-center">Qty</span><span className="text-right">Price</span>
                    </div>
                    {pedido.items?.map((it: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-3 px-3 py-2 text-sm border-t">
                            <span>{it.producto_nombre}</span>
                            <span className="text-center">{it.cantidad}</span>
                            <span className="text-right">{formatPrice(Number(it.precio_unitario) * Number(it.cantidad))}</span>
                        </div>
                    ))}
                </div>

                <div className="flex justify-between font-bold text-lg border-t pt-3">
                    <span>Total pedido</span>
                    <span>{formatPrice(Number(pedido.total))}</span>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-4 mt-4 shadow-sm">
                <h3 className="font-semibold mb-4">Timeline</h3>
                <div className="flex items-center justify-between text-sm">
                    <div className={stepIndex >= 0 ? 'text-blue-600 font-semibold' : ''}>Nuevo</div>
                    <div className={stepIndex >= 1 ? 'text-amber-600 font-semibold' : ''}>En Proceso</div>
                    <div className={stepIndex >= 2 ? 'text-green-600 font-semibold' : ''}>Terminado</div>
                </div>
            </div>

            {!readOnly && (
                <div className="fixed bottom-16 left-0 right-0 z-40">
                    <div className="max-w-md mx-auto bg-white p-3 border-t border-gray-200 space-y-2 shadow-lg rounded-t-2xl">
                        <button
                            disabled={disablePreparingBtn}
                            onClick={() => marcarEstado('preparando')}
                            className="w-full bg-amber-400 text-black font-bold py-3 rounded-xl disabled:opacity-50"
                        >
                            MARCAR EN PROCESO
                        </button>
                        <button
                            disabled={disableFinishedBtn}
                            onClick={() => marcarEstado('listo')}
                            className="w-full bg-green-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
                        >
                            MARCAR TERMINADO
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}