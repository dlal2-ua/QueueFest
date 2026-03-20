// AdminScreen.tsx
// Panel del administrador del festival
// Permite crear festivales y añadir puestos (barras y food trucks)
// Es la pantalla de configuracion inicial antes de que empiece el evento
// Solo accesible para usuarios con rol administrador

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { crearFestival, crearPuesto } from '../api';
import { toast } from 'sonner';
import { PlusCircle, Calendar, MapPin } from 'lucide-react';

export function AdminScreen() {
  const { user, logout } = useAuth();

  const [festival, setFestival] = useState({
    nombre: '',
    fecha_inicio: '',
    fecha_fin: ''
  });

  const [puesto, setPuesto] = useState({
    festival_id: '',
    nombre: '',
    tipo: 'barra',
    capacidad_max: 5,
    num_empleados: 2
  });

  const [tab, setTab] = useState<'festival' | 'puesto'>('festival');
  const [loading, setLoading] = useState(false);

  const handleCrearFestival = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await crearFestival(festival);
      toast.success(`Festival creado con ID: ${data.id}`);
      setPuesto(p => ({ ...p, festival_id: String(data.id) }));
      setFestival({ nombre: '', fecha_inicio: '', fecha_fin: '' });
      setTab('puesto');
    } catch (err) {
      toast.error('Error al crear el festival');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearPuesto = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await crearPuesto(puesto);
      toast.success('Puesto creado correctamente');
      setPuesto(p => ({ ...p, nombre: '' }));
    } catch (err) {
      toast.error('Error al crear el puesto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Panel Admin</h1>
          <p className="text-gray-400 text-sm">{user?.nombre}</p>
        </div>
        <button onClick={logout} className="text-gray-400 text-sm underline">
          Cerrar sesion
        </button>
      </div>

      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setTab('festival')}
          className={`flex-1 py-3 text-sm font-medium ${tab === 'festival' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500'}`}
        >
          Crear Festival
        </button>
        <button
          onClick={() => setTab('puesto')}
          className={`flex-1 py-3 text-sm font-medium ${tab === 'puesto' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500'}`}
        >
          Añadir Puesto
        </button>
      </div>

      <div className="p-4">
        {tab === 'festival' && (
          <form onSubmit={handleCrearFestival} className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <h2 className="font-semibold">Nuevo Festival</h2>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre del festival</label>
                <input
                  type="text"
                  value={festival.nombre}
                  onChange={e => setFestival(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Festival de Verano 2026"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha de inicio</label>
                <input
                  type="date"
                  value={festival.fecha_inicio}
                  onChange={e => setFestival(f => ({ ...f, fecha_inicio: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha de fin</label>
                <input
                  type="date"
                  value={festival.fecha_fin}
                  onChange={e => setFestival(f => ({ ...f, fecha_fin: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <PlusCircle className="w-5 h-5" />
              {loading ? 'Creando...' : 'Crear Festival'}
            </button>
          </form>
        )}

        {tab === 'puesto' && (
          <form onSubmit={handleCrearPuesto} className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-gray-500" />
                <h2 className="font-semibold">Nuevo Puesto</h2>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ID del festival</label>
                <input
                  type="number"
                  value={puesto.festival_id}
                  onChange={e => setPuesto(p => ({ ...p, festival_id: e.target.value }))}
                  placeholder="ID del festival creado"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre del puesto</label>
                <input
                  type="text"
                  value={puesto.nombre}
                  onChange={e => setPuesto(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: Barra Principal"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  value={puesto.tipo}
                  onChange={e => setPuesto(p => ({ ...p, tipo: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="barra">Barra</option>
                  <option value="foodtruck">Food Truck</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Capacidad maxima</label>
                <input
                  type="number"
                  value={puesto.capacidad_max}
                  onChange={e => setPuesto(p => ({ ...p, capacidad_max: Number(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                  min={1}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Numero de empleados</label>
                <input
                  type="number"
                  value={puesto.num_empleados}
                  onChange={e => setPuesto(p => ({ ...p, num_empleados: Number(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                  min={1}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <PlusCircle className="w-5 h-5" />
              {loading ? 'Creando...' : 'Añadir Puesto'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}