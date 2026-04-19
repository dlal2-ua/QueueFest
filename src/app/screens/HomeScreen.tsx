// HomeScreen.tsx
// Pantalla de listado de puestos filtrados por festival y tipo
// Lee el festival elegido y el tipo (barra/foodtruck) del sessionStorage
// Si no hay festival seleccionado redirige a /festival-select

import { useState, useEffect } from 'react';
import { BottomNav } from '../components/BottomNav';
import { VendorCard } from '../components/VendorCard';
import { Search, ChevronLeft } from 'lucide-react';
import { useNavigate } from '../utils/navigation';
import { getPuestosByFestivalPublico } from '../api';

export function HomeScreen() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [puestos, setPuestos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Leer el festival y el tipo seleccionados en los pasos anteriores
  const festivalRaw = sessionStorage.getItem('festivalSeleccionado');
  const festival = festivalRaw ? JSON.parse(festivalRaw) : null;
  const tipo = sessionStorage.getItem('tipoSeleccionado') || 'foodtruck';

  const tipoLabel = tipo === 'barra' ? 'Barras' : 'Food Trucks';

  const cargarPuestos = async () => {
    if (!festival) {
      navigate('/festival-select');
      return;
    }
    try {
      const data = await getPuestosByFestivalPublico(festival.id, tipo);
      setPuestos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!festival) {
      navigate('/festival-select');
      return;
    }
    cargarPuestos();
    const interval = setInterval(cargarPuestos, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPuestos = puestos.filter(p =>
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/selection')}
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gray-100"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">{tipoLabel}</h1>
              {festival && (
                <p className="text-xs text-gray-500 -mt-0.5">{festival.nombre}</p>
              )}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <p className="text-center text-gray-500 mt-10">Cargando puestos...</p>
        ) : filteredPuestos.length === 0 ? (
          <p className="text-center text-gray-500 mt-10">No hay puestos disponibles</p>
        ) : (
          filteredPuestos.map((puesto) => (
            <VendorCard
              key={puesto.id}
              id={puesto.id}
              image="https://images.unsplash.com/photo-1555970348-3a10b197f131?w=800"
              name={puesto.nombre}
              cuisine={puesto.tipo === 'barra' ? 'Barra de bebidas' : 'Food Truck'}
              waitTime={puesto.tiempo_servicio_medio}
              hasOffer={false}
              type={puesto.tipo === 'barra' ? 'bar' : 'food-truck'}
            />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
