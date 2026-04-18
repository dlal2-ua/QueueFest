// OperadorScreen.tsx
// Pantalla principal del operador de barra
// Muestra los pedidos pendientes de su puesto
// Puede confirmar, marcar como preparando o listo cada pedido

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPedidosPuesto, getMisPuestosOperador } from '../api';
import { useNavigate } from '../utils/navigation';
import { LogOut, RefreshCw } from 'lucide-react';

export function OperadorScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [puestoId, setPuestoId] = useState<number | null>(null);

  const colorEstado: Record<string, { bg: string; text: string }> = {
    pendiente:  { bg: '#FEF3C7', text: '#92400E' },
    confirmado: { bg: '#DBEAFE', text: '#1E40AF' },
    preparando: { bg: '#FFF3E4', text: '#A67C52' },
    listo:      { bg: '#D1FAE5', text: '#065F46' },
    entregado:  { bg: '#F3F4F6', text: '#6B7280' },
    cancelado:  { bg: '#FEE2E2', text: '#991B1B' },
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
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>

      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-3"
        style={{ background: 'linear-gradient(135deg, #C8956C, #A67C52)', boxShadow: '0 2px 8px rgba(166,124,82,0.20)' }}
      >
        <div>
          <h1 className="text-sm font-extrabold text-white">Panel Pedidos</h1>
          <p className="text-[11px] text-white/70">{user?.nombre}</p>
        </div>
        <button onClick={logout} className="flex items-center gap-1 text-white/80 hover:text-white transition-opacity">
          <LogOut className="w-4 h-4" />
          <span className="text-xs font-medium">Salir</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold" style={{ color: '#2C1810' }}>Todos los pedidos y estado</h2>
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
          <p className="text-center text-sm py-10" style={{ color: '#C8956C', opacity: 0.6 }}>Cargando pedidos...</p>
        ) : pedidos.length === 0 ? (
          <p className="text-center text-sm py-10" style={{ color: '#C8956C', opacity: 0.6 }}>No hay pedidos</p>
        ) : (
          <div className="space-y-2">
            {pedidos.map((pedido) => {
              const c = colorEstado[pedido.estado] ?? { bg: '#F3F4F6', text: '#6B7280' };
              return (
                <div
                  key={pedido.id}
                  onClick={() => navigate(`/operador/pedidos/${pedido.id}`)}
                  className="rounded-2xl border cursor-pointer transition-all active:scale-[0.98] hover:shadow-md"
                  style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', padding: '12px 14px' }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="text-xs font-extrabold" style={{ color: '#2C1810' }}>Pedido #{pedido.id}</p>
                      <p className="text-[11px]" style={{ color: '#8B6650' }}>{pedido.usuario_nombre}</p>
                    </div>
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: c.bg, color: c.text }}
                    >
                      {pedido.estado}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold" style={{ color: '#A67C52' }}>Total: {pedido.total}€</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
