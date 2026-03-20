// GestorScreen.tsx
// Panel de supervision del gestor operativo
// Muestra estadisticas en tiempo real del festival
// Puede ver pedidos, ingresos, tiempos de espera y puestos abiertos
// Los datos se refrescan cada 30 segundos automaticamente

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getEstadisticas } from '../api';
import { BarChart2, Clock, ShoppingBag, Euro } from 'lucide-react';

export function GestorScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const cargarEstadisticas = async () => {
    try {
      const data = await getEstadisticas();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEstadisticas();
    const interval = setInterval(cargarEstadisticas, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-purple-600 text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Panel Gestor</h1>
          <p className="text-purple-200 text-sm">{user?.nombre}</p>
        </div>
        <button onClick={logout} className="text-purple-200 text-sm underline">
          Cerrar sesion
        </button>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Resumen del dia</h2>
          <button
            onClick={cargarEstadisticas}
            className="text-sm bg-white border border-gray-300 px-3 py-1 rounded-full"
          >
            Actualizar
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 mt-10">Cargando estadisticas...</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className="w-5 h-5 text-orange-500" />
                  <span className="text-sm text-gray-500">Pedidos hoy</span>
                </div>
                <p className="text-3xl font-bold">{stats?.pedidos_hoy || 0}</p>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Euro className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-500">Ingresos hoy</span>
                </div>
                <p className="text-3xl font-bold">{Number(stats?.ingresos_hoy || 0).toFixed(2)}€</p>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-500">Espera media</span>
                </div>
                <p className="text-3xl font-bold">{Number(stats?.espera_media || 0).toFixed(0)} min</p>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart2 className="w-5 h-5 text-purple-500" />
                  <span className="text-sm text-gray-500">Puestos abiertos</span>
                </div>
                <p className="text-3xl font-bold">{stats?.puestos_abiertos || 0}</p>
              </div>
            </div>

            {stats?.pedidos_hoy === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-yellow-800 text-sm text-center">
                  No hay pedidos registrados hoy todavia
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}