import { useState, useEffect } from 'react';
import { ChevronLeft, Save } from 'lucide-react';
import { useNavigate, useParams } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';
import { getDirecciones, createDireccion, updateDireccion, type AddressInput } from '../api';

export function AddressFormScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isRTL } = useLanguage();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<AddressInput>({
    alias: '',
    calle: '',
    numero: '',
    piso: '',
    codigo_postal: '',
    ciudad: '',
    provincia: '',
    pais: 'España',
    es_predeterminada: false
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);

  useEffect(() => {
    if (isEditing && id) {
      loadAddress();
    }
  }, [id, isEditing]);

  const loadAddress = async () => {
    try {
      setLoadingData(true);
      const addresses = await getDirecciones();
      const address = addresses.find(addr => addr.id === Number(id));
      if (address) {
        setFormData({
          alias: address.alias,
          calle: address.calle,
          numero: address.numero || '',
          piso: address.piso || '',
          codigo_postal: address.codigo_postal || '',
          ciudad: address.ciudad,
          provincia: address.provincia || '',
          pais: address.pais,
          es_predeterminada: address.es_predeterminada
        });
      } else {
        toast.error('Dirección no encontrada');
        navigate('/addresses');
      }
    } catch (error) {
      console.error('Error al cargar dirección:', error);
      toast.error('Error al cargar dirección');
      navigate('/addresses');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.alias || !formData.calle || !formData.ciudad) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }

    try {
      setLoading(true);
      if (isEditing && id) {
        await updateDireccion(Number(id), formData);
        toast.success('Dirección actualizada correctamente');
      } else {
        await createDireccion(formData);
        toast.success('Dirección creada correctamente');
      }
      navigate('/addresses');
    } catch (error) {
      console.error('Error al guardar dirección:', error);
      toast.error('Error al guardar dirección');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof AddressInput, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate('/addresses')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <h1 className="text-xl font-semibold">
            {isEditing ? 'Editar dirección' : 'Nueva dirección'}
          </h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alias <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.alias}
              onChange={(e) => handleChange('alias', e.target.value)}
              placeholder="Ej: Casa, Trabajo, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Calle <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.calle}
              onChange={(e) => handleChange('calle', e.target.value)}
              placeholder="Nombre de la calle"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número
              </label>
              <input
                type="text"
                value={formData.numero}
                onChange={(e) => handleChange('numero', e.target.value)}
                placeholder="Nº"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Piso
              </label>
              <input
                type="text"
                value={formData.piso}
                onChange={(e) => handleChange('piso', e.target.value)}
                placeholder="Piso/Puerta"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código postal
              </label>
              <input
                type="text"
                value={formData.codigo_postal}
                onChange={(e) => handleChange('codigo_postal', e.target.value)}
                placeholder="CP"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ciudad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.ciudad}
                onChange={(e) => handleChange('ciudad', e.target.value)}
                placeholder="Ciudad"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provincia
            </label>
            <input
              type="text"
              value={formData.provincia}
              onChange={(e) => handleChange('provincia', e.target.value)}
              placeholder="Provincia"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              País
            </label>
            <input
              type="text"
              value={formData.pais}
              onChange={(e) => handleChange('pais', e.target.value)}
              placeholder="País"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="es_predeterminada"
              checked={formData.es_predeterminada}
              onChange={(e) => handleChange('es_predeterminada', e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="es_predeterminada" className="text-sm font-medium text-gray-700">
              Establecer como dirección predeterminada
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 text-white py-3 rounded-full font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              {isEditing ? 'Actualizar dirección' : 'Guardar dirección'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
