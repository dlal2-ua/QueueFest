import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPedidosPuesto, cambiarEstadoPedido, getPuestoEstado, triggerPanico, getMisPuestosOperador } from '../api';
import { useNavigate } from '../utils/navigation';

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

    const colorEstado: Record<string, string> = {
        pendiente: 'bg-yellow-100 text-yellow-800',
        confirmado: 'bg-blue-100 text-blue-800',
        preparando: 'bg-orange-100 text-orange-800',
        listo: 'bg-green-100 text-green-800',
        entregado: 'bg-gray-100 text-gray-800',
        cancelado: 'bg-red-100 text-red-800'
    };

    return (
        <div className="min-h-screen bg-gray-50 relative">
            {toastMessage && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 text-white font-medium ${toastMessage.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
                    {toastMessage.text}
                </div>
            )}

            <div className={`text-white p-4 flex justify-between items-center transition-colors ${puesto?.abierto === 0 ? 'bg-red-600 animate-pulse' : 'bg-orange-500'}`}>
                <div>
                    <h1 className="text-xl font-bold">Panel Tickets {puesto?.abierto === 0 && ' (PAUSADO)'}</h1>
                    <p className="text-white/80 text-sm">{user?.nombre} - {puesto?.nombre}</p>
                </div>
                <button onClick={logout} className="text-white/80 text-sm underline hover:text-white">
                    Cerrar sesion
                </button>
            </div>

            <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between border-b">
                <div className="text-sm">
                    <span className="font-semibold text-gray-700">Estado de barra:</span>{' '}
                    {puesto?.abierto === 1
                        ? <span className="text-green-600 font-bold">Recibiendo Pedidos</span>
                        : <span className="text-red-600 font-bold">PAUSADA (Saturación)</span>}
                </div>

                {puesto?.abierto === 1 ? (
                    <button
                        onClick={() => setIsPanicModalOpen(true)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all"
                    >
                        <span className="text-xl">🚨</span> Botón Pánico
                    </button>
                ) : (
                    <button
                        onClick={() => handlePanico('reanudar')}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all animate-bounce"
                    >
                        <span className="text-xl">✅</span> Reanudar Pedidos
                    </button>
                )}
            </div>

            <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Tickets en curso</h2>
                    <button onClick={cargarDatos} className="text-sm bg-white border border-gray-300 px-3 py-1 rounded-full shadow-sm hover:bg-gray-50">
                        Actualizar
                    </button>
                </div>

                {loading ? (
                    <p className="text-center text-gray-500 mt-10">Cargando tickets...</p>
                ) : pedidos.length === 0 ? (
                    <p className="text-center text-gray-500 mt-10">No hay tickets activos</p>
                ) : (
                    <div className="space-y-3">
                        {pedidos.map((pedido) => (
                            <div
                                key={pedido.id}
                                onClick={() => navigate(`/operador/tickets/${pedido.id}`)}
                                className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="font-semibold">Pedido #{pedido.id}</p>
                                        <p className="text-sm text-gray-500">Pedido cliente</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${colorEstado[pedido.estado]}`}>
                                        {pedido.estado}
                                    </span>
                                </div>

                                <p className="text-sm text-gray-600 mb-3">Total: {pedido.total}€</p>

                                <div className="flex gap-2 flex-wrap">
                                    {pedido.estado === 'pendiente' && (
                                        <button onClick={(e) => { e.stopPropagation(); cambiarEstado(pedido.id, 'confirmado'); }} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium">
                                            Confirmar
                                        </button>
                                    )}
                                    {pedido.estado === 'confirmado' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); cambiarEstado(pedido.id, 'preparando'); }}
                                            className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-sm font-medium"
                                        >
                                            En espera
                                        </button>
                                    )}
                                    {pedido.estado === 'preparando' && (
                                        <button onClick={(e) => { e.stopPropagation(); cambiarEstado(pedido.id, 'listo'); }} className="flex-1 bg-green-500 text-white py-2 rounded-lg text-sm font-medium">
                                            Listo para recoger
                                        </button>
                                    )}
                                    {pedido.estado === 'listo' && (
                                        <button onClick={(e) => { e.stopPropagation(); cambiarEstado(pedido.id, 'entregado'); }} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">
                                            Entregar
                                        </button>
                                    )}
                                    {(pedido.estado === 'pendiente' || pedido.estado === 'confirmado' || pedido.estado === 'preparando') && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); cambiarEstado(pedido.id, 'cancelado'); }}
                                            className="bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm"
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isPanicModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-3">🔥</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">¡Cocina Saturada!</h3>
                            <p className="text-gray-600 text-sm">¿Qué necesitas para aliviar la carga de la barra?</p>
                        </div>

                        <div className="space-y-3">
                            <button onClick={() => handlePanico('llamar_camarero')} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-colors shadow-sm">
                                Llamar personal de apoyo
                            </button>
                            <button onClick={() => handlePanico('pausar')} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition-colors shadow-sm">
                                Pausar NUEVOS pedidos
                            </button>
                            <button onClick={() => setIsPanicModalOpen(false)} className="w-full text-gray-500 font-medium py-2 mt-2">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}