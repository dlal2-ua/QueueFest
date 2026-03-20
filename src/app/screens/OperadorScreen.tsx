// OperadorScreen.tsx
// Pantalla principal del operador de barra
// Muestra los pedidos pendientes de su puesto
// Puede confirmar, marcar como preparando o listo cada pedido

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPedidosPuesto, cambiarEstadoPedido } from '../api';

export function OperadorScreen() {
  const { user, logout } = useAuth();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarPedidos = async () => {
    try {
      const data = await getPedidosPuesto(1);
      setPedidos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPedidos();
    const interval = setInterval(cargarPedidos, 10000);
    return () => clearInterval(interval);
  }, []);

  const cambiarEstado = async (pedidoId: number, estado: string) => {
    await cambiarEstadoPedido(pedidoId, estado);
    cargarPedidos();
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-orange-500 text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Panel Operador</h1>
          <p className="text-orange-100 text-sm">{user?.nombre}</p>
        </div>
        <button onClick={logout} className="text-orange-100 text-sm underline">
          Cerrar sesion
        </button>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Pedidos activos</h2>
          <button
            onClick={cargarPedidos}
            className="text-sm bg-white border border-gray-300 px-3 py-1 rounded-full"
          >
            Actualizar
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 mt-10">Cargando pedidos...</p>
        ) : pedidos.length === 0 ? (
          <p className="text-center text-gray-500 mt-10">No hay pedidos activos</p>
        ) : (
          <div className="space-y-3">
            {pedidos.map((pedido) => (
              <div key={pedido.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold">Pedido #{pedido.id}</p>
                    <p className="text-sm text-gray-500">{pedido.usuario_nombre}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${colorEstado[pedido.estado]}`}>
                    {pedido.estado}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">Total: {pedido.total}€</p>
                <div className="flex gap-2 flex-wrap">
                  {pedido.estado === 'pendiente' && (
                    <button
                      onClick={() => cambiarEstado(pedido.id, 'confirmado')}
                      className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium"
                    >
                      Confirmar
                    </button>
                  )}
                  {pedido.estado === 'confirmado' && (
                    <button
                      onClick={() => cambiarEstado(pedido.id, 'preparando')}
                      className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-sm font-medium"
                    >
                      Preparando
                    </button>
                  )}
                  {pedido.estado === 'preparando' && (
                    <button
                      onClick={() => cambiarEstado(pedido.id, 'listo')}
                      className="flex-1 bg-green-500 text-white py-2 rounded-lg text-sm font-medium"
                    >
                      Listo para recoger
                    </button>
                  )}
                  {pedido.estado !== 'cancelado' && pedido.estado !== 'entregado' && (
                    <button
                      onClick={() => cambiarEstado(pedido.id, 'cancelado')}
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
    </div>
  );
}