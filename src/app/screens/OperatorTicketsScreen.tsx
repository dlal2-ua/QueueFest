import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPedidosPuesto, cambiarEstadoPedido, getPuestoEstado, triggerPanico, getMisPuestosOperador } from '../api';
import { useNavigate } from '../utils/navigation';
import { LogOut, RefreshCw } from 'lucide-react';

export function OperatorTicketsScreen() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [pedidos, setPedidos] = useState<any[]>([]);
    const [puesto, setPuesto] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [puestoId, setPuestoId] = useState<number | null>(null);

    const [isPanicModalOpen, setIsPanicModalOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const cargarDatos = async () => {
        try {
            let currentPuestoId = puestoId;

            if (!currentPuestoId) {
                const puestos = await getMisPuestosOperador();
                if (!Array.isArray(puestos) || puestos.length === 0) {
                    setPedidos([]);
                    setPuesto(null);
                    setLoading(false);
                    return;
                }
                currentPuestoId = Number(puestos[0].id);
                setPuestoId(currentPuestoId);
            }

            const [pedidosData, puestoData] = await Promise.all([
                getPedidosPuesto(currentPuestoId),
                getPuestoEstado(currentPuestoId)
            ]);

            const activos = (Array.isArray(pedidosData) ? pedidosData : []).filter(
                (p) => p.estado !== 'entregado' && p.estado !== 'cancelado'
            );

            setPedidos(activos);
            setPuesto(puestoData);
        } catch (err) {
            console.error(err);
            setPedidos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
        const interval = setInterval(cargarDatos, 10000);
        return () => clearInterval(interval);
    }, []);

    const cambiarEstado = async (pedidoId: number, estado: string) => {
        try {
            await cambiarEstadoPedido(pedidoId, estado);
            await cargarDatos();
        } catch (err) {
            console.error(err);
            setToastMessage({ text: 'No se pudo actualizar el pedido', type: 'error' });
            setTimeout(() => setToastMessage(null), 4000);
        }
    };

    const handlePanico = async (accion: string) => {
        if (!puestoId) return;
        try {
            const res = await triggerPanico(puestoId, accion);
            setToastMessage({ text: res.message, type: 'success' });
            if (accion === 'pausar' || accion === 'reanudar') setIsPanicModalOpen(false);
            cargarDatos();
        } catch (err: any) {
            setToastMessage({ text: err.message, type: 'error' });
        }
        setTimeout(() => setToastMessage(null), 4000);
    };

    const colorEstado: Record<string, { bg: string; text: string }> = {
        pendiente:  { bg: '#FEF3C7', text: '#92400E' },
        confirmado: { bg: '#DBEAFE', text: '#1E40AF' },
        preparando: { bg: '#FFF3E4', text: '#A67C52' },
        listo:      { bg: '#D1FAE5', text: '#065F46' },
        entregado:  { bg: '#F3F4F6', text: '#6B7280' },
        cancelado:  { bg: '#FEE2E2', text: '#991B1B' },
    };

    const pausado = puesto?.abierto === 0;

    return (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>

            {/* Toast */}
            {toastMessage && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-lg z-50 text-white text-sm font-semibold ${toastMessage.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
                    {toastMessage.text}
                </div>
            )}

            {/* Header */}
            <div
                className="flex-shrink-0 flex items-center justify-between px-4 py-3 transition-colors"
                style={{
                    background: pausado
                        ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                        : 'linear-gradient(135deg, #C8956C, #A67C52)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
            >
                <div>
                    <h1 className="text-sm font-extrabold text-white">
                        Panel Tickets{pausado ? ' (PAUSADO)' : ''}
                    </h1>
                    <p className="text-[11px] text-white/70">{user?.nombre} — {puesto?.nombre}</p>
                </div>
                <button onClick={logout} className="flex items-center gap-1 text-white/80 hover:text-white transition-opacity">
                    <LogOut className="w-4 h-4" />
                    <span className="text-xs font-medium">Salir</span>
                </button>
            </div>

            {/* Estado barra + botón pánico */}
            <div
                className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b"
                style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}
            >
                <div className="text-xs">
                    <span className="font-semibold" style={{ color: '#2C1810' }}>Estado: </span>
                    {puesto?.abierto === 1
                        ? <span className="font-bold" style={{ color: '#4CAF88' }}>Recibiendo Pedidos</span>
                        : <span className="font-bold text-red-600">PAUSADA (Saturación)</span>}
                </div>

                {puesto?.abierto === 1 ? (
                    <button
                        onClick={() => setIsPanicModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: '#EF4444' }}
                    >
                        🚨 Pánico
                    </button>
                ) : (
                    <button
                        onClick={() => handlePanico('reanudar')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white animate-bounce"
                        style={{ backgroundColor: '#4CAF88' }}
                    >
                        ✅ Reanudar
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-bold" style={{ color: '#2C1810' }}>Tickets en curso</h2>
                    <button
                        onClick={cargarDatos}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors"
                        style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', color: '#A67C52' }}
                    >
                        <RefreshCw className="w-3 h-3" />
                        Actualizar
                    </button>
                </div>

                {loading ? (
                    <p className="text-center text-sm py-10" style={{ color: '#C8956C', opacity: 0.6 }}>Cargando tickets...</p>
                ) : pedidos.length === 0 ? (
                    <p className="text-center text-sm py-10" style={{ color: '#C8956C', opacity: 0.6 }}>No hay tickets activos</p>
                ) : (
                    <div className="space-y-2">
                        {pedidos.map((pedido) => {
                            const c = colorEstado[pedido.estado] ?? { bg: '#F3F4F6', text: '#6B7280' };
                            return (
                                <div
                                    key={pedido.id}
                                    onClick={() => navigate(`/operador/tickets/${pedido.id}`)}
                                    className="rounded-2xl border cursor-pointer transition-all active:scale-[0.98] hover:shadow-md"
                                    style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', padding: '12px 14px' }}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="text-xs font-extrabold" style={{ color: '#2C1810' }}>Pedido #{pedido.id}</p>
                                            <p className="text-[11px]" style={{ color: '#8B6650' }}>Pedido cliente</p>
                                        </div>
                                        <span
                                            className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                            style={{ backgroundColor: c.bg, color: c.text }}
                                        >
                                            {pedido.estado}
                                        </span>
                                    </div>

                                    <p className="text-[11px] font-semibold mb-3" style={{ color: '#A67C52' }}>Total: {pedido.total}€</p>

                                    <div className="flex gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                                        {pedido.estado === 'pendiente' && (
                                            <button onClick={() => cambiarEstado(pedido.id, 'confirmado')} className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: '#6366F1' }}>
                                                Confirmar
                                            </button>
                                        )}
                                        {pedido.estado === 'confirmado' && (
                                            <button onClick={() => cambiarEstado(pedido.id, 'preparando')} className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: '#F59E0B' }}>
                                                En espera
                                            </button>
                                        )}
                                        {pedido.estado === 'preparando' && (
                                            <button onClick={() => cambiarEstado(pedido.id, 'listo')} className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: '#4CAF88' }}>
                                                Listo para recoger
                                            </button>
                                        )}
                                        {pedido.estado === 'listo' && (
                                            <button onClick={() => cambiarEstado(pedido.id, 'entregado')} className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: '#059669' }}>
                                                Entregar
                                            </button>
                                        )}
                                        {(pedido.estado === 'pendiente' || pedido.estado === 'confirmado' || pedido.estado === 'preparando') && (
                                            <button onClick={() => cambiarEstado(pedido.id, 'cancelado')} className="px-3 py-1.5 rounded-xl text-xs font-bold" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                                                Cancelar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal pánico */}
            {isPanicModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="rounded-3xl w-full max-w-sm p-6 shadow-2xl border" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-3">🔥</div>
                            <h3 className="text-base font-extrabold mb-2" style={{ color: '#2C1810' }}>¡Cocina Saturada!</h3>
                            <p className="text-xs" style={{ color: '#8B6650' }}>¿Qué necesitas para aliviar la carga de la barra?</p>
                        </div>

                        <div className="space-y-2">
                            <button onClick={() => handlePanico('llamar_camarero')} className="w-full py-3 rounded-full text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #C8956C, #A67C52)' }}>
                                Llamar personal de apoyo
                            </button>
                            <button onClick={() => handlePanico('pausar')} className="w-full py-3 rounded-full text-sm font-bold text-white bg-red-600">
                                Pausar NUEVOS pedidos
                            </button>
                            <button onClick={() => setIsPanicModalOpen(false)} className="w-full py-2 text-sm font-medium" style={{ color: '#8B6650' }}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
