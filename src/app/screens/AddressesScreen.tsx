import { useState, useEffect } from 'react';
import { ChevronLeft, MapPin, Plus, Edit2, Trash2, Check } from 'lucide-react';
import { useNavigate } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';
import { getDirecciones, deleteDireccion, type Address } from '../api';

export function AddressesScreen() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const data = await getDirecciones();
      setAddresses(data);
    } catch (error) {
      console.error('Error al cargar direcciones:', error);
      // No mostrar error si simplemente no hay direcciones
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta dirección?')) {
      return;
    }

    try {
      await deleteDireccion(id);
      setAddresses(prev => prev.filter(addr => addr.id !== id));
      toast.success('Dirección eliminada correctamente');
    } catch (error) {
      console.error('Error al eliminar dirección:', error);
      toast.error('Error al eliminar dirección');
    }
  };

  const formatAddress = (addr: Address) => {
    const parts = [
      addr.calle,
      addr.numero,
      addr.piso,
      addr.codigo_postal,
      addr.ciudad,
      addr.provincia
    ].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/profile')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
            <h1 className="text-xl font-semibold">Mis direcciones</h1>
          </div>
          <button
            onClick={() => navigate('/addresses/new')}
            className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Cargando...</p>
          </div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No tienes direcciones guardadas</p>
            <p className="text-sm text-gray-400 mb-4">Añade tu primera dirección para facilitar tus pedidos</p>
            <button
              onClick={() => navigate('/addresses/new')}
              className="px-6 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Añadir dirección
            </button>
          </div>
        ) : (
          addresses.map((address) => (
            <div
              key={address.id}
              className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{address.alias}</h3>
                      {address.es_predeterminada && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          <Check className="w-3 h-3" />
                          Predeterminada
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{formatAddress(address)}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => navigate(`/addresses/edit/${address.id}`)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(address.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
