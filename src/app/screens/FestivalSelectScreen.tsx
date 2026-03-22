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
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Elige tu Festival</h1>
              <p className="text-xs text-gray-500">Selecciona el evento al que asistes</p>
            </div>
          </div>
        </div>

        {/* Buscador */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar festival..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 border border-transparent rounded-xl text-sm focus:outline-none focus:bg-white focus:border-gray-300 transition-all"
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
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide px-1">
              {filtrados.length} evento{filtrados.length !== 1 ? 's' : ''} disponible{filtrados.length !== 1 ? 's' : ''}
            </p>
            {filtrados.map(fest => (
              <button
                key={fest.id}
                onClick={() => handleSeleccionar(fest)}
                className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4 text-left hover:border-red-200 hover:shadow-md active:scale-[0.98] transition-all"
              >
                {/* Icono / inicial */}
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-red-200">
                  <span className="text-white text-lg font-bold">
                    {fest.nombre.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{fest.nombre}</h3>
                  {(fest.fecha_inicio || fest.fecha_fin) && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <p className="text-xs text-gray-500 truncate">
                        {fest.fecha_inicio && formatFecha(fest.fecha_inicio)}
                        {fest.fecha_inicio && fest.fecha_fin && ' → '}
                        {fest.fecha_fin && formatFecha(fest.fecha_fin)}
                      </p>
                    </div>
                  )}
                  <span className="inline-block mt-1.5 px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-full border border-green-100">
                    ACTIVO
                  </span>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
