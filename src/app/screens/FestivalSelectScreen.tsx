import { useState, useEffect } from 'react';
import { useNavigate } from '../utils/navigation';
import { Search, Calendar, ChevronRight, Loader2, MapPin } from 'lucide-react';
import { getFestivalesPublicos } from '../api';

export function FestivalSelectScreen() {
  const navigate = useNavigate();

  const [festivales, setFestivales] = useState<any[]>([]);
  const [filtrados, setFiltrados] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getFestivalesPublicos();
        if (Array.isArray(data)) {
          setFestivales(data);
          setFiltrados(data);
        }
      } catch {
        // Si falla la API muestra lista vacía sin romper la app
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filtrar en tiempo real al escribir
  useEffect(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) {
      setFiltrados(festivales);
    } else {
      setFiltrados(festivales.filter(f => f.nombre.toLowerCase().includes(q)));
    }
  }, [busqueda, festivales]);

  const handleSeleccionar = (festival: any) => {
    // Guardar el festival elegido en sessionStorage para que las pantallas
    // de bar/foodtruck puedan usarlo para filtrar puestos y productos
    sessionStorage.setItem('festivalSeleccionado', JSON.stringify(festival));
    navigate('/selection'); // pantalla de selección bar vs foodtruck
  };

  const formatFecha = (fecha: string) => {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">

      {/* Header */}
      <div className="bg-transparent pt-10 pb-2">
        <div className="p-6 pb-2 text-center flex flex-col items-center">
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">Elige tu Festival</h1>
          <p className="text-gray-500 font-medium">Selecciona el evento al que asistes</p>
        </div>

        {/* Buscador */}
        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar festival..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm shadow-sm focus:outline-none focus:bg-white focus:border-red-300 focus:ring-4 focus:ring-red-50 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-red-500" />
            <p className="text-sm text-gray-500">Cargando festivales...</p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <Calendar className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm text-center">
              {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay festivales activos en este momento'}
            </p>
            {busqueda && (
              <button onClick={() => setBusqueda('')} className="text-red-600 text-sm font-medium">
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider px-2">
              {filtrados.length} evento{filtrados.length !== 1 ? 's' : ''} disponible{filtrados.length !== 1 ? 's' : ''}
            </p>
            {filtrados.map(fest => (
              <button
                key={fest.id}
                onClick={() => handleSeleccionar(fest)}
                className="group w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 text-left hover:shadow-md hover:border-red-100 active:scale-[0.98] transition-all duration-300 relative overflow-hidden"
              >
                {/* Subtle side border on hover */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-400 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 truncate mb-1 group-hover:text-red-600 transition-colors">{fest.nombre}</h3>
                  {(fest.fecha_inicio || fest.fecha_fin) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <p className="text-sm text-gray-500 truncate">
                        {fest.fecha_inicio && formatFecha(fest.fecha_inicio)}
                        {fest.fecha_inicio && fest.fecha_fin && ' → '}
                        {fest.fecha_fin && formatFecha(fest.fecha_fin)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-red-50 transition-colors">
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
