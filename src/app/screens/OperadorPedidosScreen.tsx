// OperadorScreen.tsx
// Pantalla principal del operador de barra
// Muestra los pedidos pendientes de su puesto
// Puede confirmar, marcar como preparando o listo cada pedido

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPedidosPuesto, getMisPuestosOperador } from '../api';
import { useNavigate } from '../utils/navigation';

export function OperadorScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [puestoId, setPuestoId] = useState<number | null>(null);

  const colorEstado: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-800',
    confirmado: 'bg-blue-100 text-blue-800',
    preparando: 'bg-orange-100 text-orange-800',
    listo: 'bg-green-100 text-green-800',
    entregado: 'bg-gray-100 text-gray-800',
    cancelado: 'bg-red-100 text-red-800'
  };

  const cargarDatos = async () => {
    try {
      let currentPuestoId = puestoId;
      if (!currentPuestoId) {
        const puestos = await getMisPuestosOperador();
        if (!Array.isArray(puestos) || puestos.length === 0) {
          setPedidos([]);
          setLoading(false);
          return;
        }
        currentPuestoId = Number(puestos[0].id);
        setPuestoId(currentPuestoId);
      }

      const pedidosData = await getPedidosPuesto(currentPuestoId);
      setPedidos(Array.isArray(pedidosData) ? pedidosData : []);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="text-white p-4 flex justify-between items-center bg-orange-500">
        <div>
          <h1 className="text-xl font-bold">Panel Pedidos (solo lectura)</h1>
          <p className="text-white/80 text-sm">{user?.nombre}</p>
        </div>
        <button onClick={logout} className="text-white/80 text-sm underline hover:text-white">
          Cerrar sesion
        </button>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Todos los pedidos y estado</h2>
          <button
            onClick={cargarDatos}
            className="text-sm bg-white border border-gray-300 px-3 py-1 rounded-full shadow-sm hover:bg-gray-50"
          >
            Actualizar
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 mt-10">Cargando pedidos...</p>
        ) : pedidos.length === 0 ? (
          <p className="text-center text-gray-500 mt-10">No hay pedidos</p>
        ) : (
          <div className="space-y-3">
            {pedidos.map((pedido) => (
              <div
                key={pedido.id}
                onClick={() => navigate(`/operador/pedidos/${pedido.id}`)}
                className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">Pedido #{pedido.id}</p>
                    <p className="text-sm text-gray-500">{pedido.usuario_nombre}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${colorEstado[pedido.estado]}`}>
                    {pedido.estado}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Total: {pedido.total}€</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}