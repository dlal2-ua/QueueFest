import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import {
  crearFestival, getFestivales, eliminarFestival,
  crearPuesto, actualizarPuesto, getPuestos, eliminarPuesto,
  getProductos, crearProducto, actualizarProducto, eliminarProducto,
  getPromociones, crearPromocion, actualizarPromocion, eliminarPromocion,
  getParametros, actualizarParametros,
  getUsuarios, crearUsuario, eliminarUsuario
} from '../api';
import { PlusCircle, Calendar, MapPin, Settings, Users, Package, Store, CheckCircle2, XCircle, LogOut, Trash2, Tag } from 'lucide-react';

export function AdminScreen() {
  const { user, logout } = useAuth();

  const [tab, setTab] = useState<'festival' | 'puestos' | 'productos' | 'promociones' | 'parametros' | 'usuarios'>('festival');
  const [loading, setLoading] = useState(false);

  // Datos globales
  const [festivalesList, setFestivalesList] = useState<any[]>([]);
  const [puestosList, setPuestosList] = useState<any[]>([]);

  // States: Festival
  const [festival, setFestival] = useState({ nombre: '', fecha_inicio: '', fecha_fin: '' });

  // States: Puesto
  // [TODO: ESTÁTICO -> DINÁMICO] El `festival_id` inicial está fijado a 1. Si tu aplicación soporta múltiples festivales creados, esto debería venir de un selector, un contexto o leer la respueta al crear un nuevo festival.
  const [puesto, setPuesto] = useState({ festival_id: 1, nombre: '', tipo: 'barra', capacidad_max: 50, num_empleados: 3, horarios_apertura: '18:00 - 04:00' });

  // States: Productos
  const [productosList, setProductosList] = useState<any[]>([]);
  const [selectedPuestoId, setSelectedPuestoId] = useState<number | ''>('');
  const [producto, setProducto] = useState({ nombre: '', descripcion: '', precio: 0, precio_dinamico: 0, stock: 100, activo: true });

  // States: Promociones
  const [promocionesList, setPromocionesList] = useState<any[]>([]);
  const [selectedPuestoIdPromo, setSelectedPuestoIdPromo] = useState<number | ''>('');
  const [promocion, setPromocion] = useState({ titulo: '', descripcion: '', precio_promo: 0, activa: true });

  // States: Parámetros
  const [parametros, setParametros] = useState({
    pricing_dinamico_activo: false,
    umbral_cola: 20,
    porcentaje_subida: 10,
    promociones_activas: false,
    stock_minimo: 10
  });

  // States: Usuarios
  const [usuariosList, setUsuariosList] = useState<any[]>([]);
  const [nuevoUsuario, setNuevoUsuario] = useState({ email: '', password: '', nombre: '', rol: 'gestor', puesto_id: '' });

  // Loaders
  const loadFestivales = async () => {
    try {
      const data = await getFestivales();
      console.log("Respuesta del servidor (Festivales):", data); // 👀 Mira esto en la consola del navegador

      // Verificamos si es un array directo
      if (Array.isArray(data)) {
        setFestivalesList(data);
      }
      // Verificamos si viene dentro de una propiedad (cambia 'data.festivales' por lo que veas en tu console.log si es distinto)
      else if (data && data.festivales && Array.isArray(data.festivales)) {
        setFestivalesList(data.festivales);
      }
      else if (data && data.error) {
        toast.error(`Error del servidor: ${data.error}`);
      }
      else {
        toast.error('El formato de datos no es válido');
      }
    } catch (error) {
      console.error("Error al hacer la petición:", error);
      toast.error('Error de conexión al cargar festivales');
    }
  };

  const loadPuestos = async () => {
    try {
      const data = await getPuestos();
      if (Array.isArray(data)) setPuestosList(data);
    } catch { toast.error('Error al cargar puestos'); }
  };

  const loadProductos = async (pid: number) => {
    try {
      const data = await getProductos(pid);
      if (Array.isArray(data)) setProductosList(data);
    } catch { toast.error('Error al cargar productos'); }
  };

  const loadPromociones = async (pid: number) => {
    try {
      const data = await getPromociones(pid);
      if (Array.isArray(data)) setPromocionesList(data);
    } catch { toast.error('Error al cargar promociones'); }
  };

  const loadParametros = async () => {
    try {
      const data = await getParametros();
      if (data && data.id) setParametros(data);
    } catch { toast.error('Error al cargar parámetros'); }
  };

  const loadUsuarios = async () => {
    try {
      const data = await getUsuarios();
      if (Array.isArray(data)) setUsuariosList(data);
    } catch { toast.error('Error al cargar usuarios'); }
  };

  useEffect(() => {
    if (tab === 'festival') loadFestivales();
    if (tab === 'puestos' || tab === 'productos' || tab === 'promociones' || tab === 'usuarios') loadPuestos();
    if (tab === 'parametros') loadParametros();
    if (tab === 'usuarios') loadUsuarios();
  }, [tab]);

  useEffect(() => {
    if (selectedPuestoId) {
      loadProductos(Number(selectedPuestoId));
    } else {
      setProductosList([]);
    }
  }, [selectedPuestoId]);

  useEffect(() => {
    if (selectedPuestoIdPromo) {
      loadPromociones(Number(selectedPuestoIdPromo));
    } else {
      setPromocionesList([]);
    }
  }, [selectedPuestoIdPromo]);


  // Handlers
  const handleCrearFestival = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await crearFestival(festival);
      toast.success(`Festival registrado correctamente (ID: ${data?.id || 1})`);
      setFestival({ nombre: '', fecha_inicio: '', fecha_fin: '' });
      loadFestivales(); // Recargar la lista
    } catch { toast.error('Error al crear el festival'); }
    finally { setLoading(false); }
  };

  const handleCrearPuesto = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await crearPuesto(puesto);
      toast.success('Puesto guardado exitosamente');
      // [TODO: ESTÁTICO -> DINÁMICO] Resetear manteniendo el ID dinámico guardado en estado en vez del 1 estático.
      setPuesto({ festival_id: 1, nombre: '', tipo: 'barra', capacidad_max: 50, num_empleados: 3, horarios_apertura: '18:00 - 04:00' });
      loadPuestos();
    } catch { toast.error('Error al crear el puesto'); }
    finally { setLoading(false); }
  };

  const handleTogglePuesto = async (p: any) => {
    try {
      await actualizarPuesto(p.id, { ...p, abierto: !p.abierto });
      toast.success(`Puesto ${p.nombre} ${!p.abierto ? 'abierto' : 'cerrado'}`);
      loadPuestos();
    } catch { toast.error('Error al actualizar estado del puesto'); }
  };

  const handleCrearProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPuestoId) return toast.error('Selecciona un puesto primero');
    setLoading(true);
    try {
      await crearProducto({ ...producto, puesto_id: selectedPuestoId });
      toast.success('Producto añadido al catálogo');
      setProducto({ nombre: '', descripcion: '', precio: 0, precio_dinamico: 0, stock: 100, activo: true });
      loadProductos(Number(selectedPuestoId));
    } catch { toast.error('Error al crear producto'); }
    finally { setLoading(false); }
  };

  const handleToggleProducto = async (prod: any) => {
    try {
      await actualizarProducto(prod.id, { ...prod, activo: !prod.activo });
      toast.success(`Producto ${prod.nombre} ${!prod.activo ? 'activado' : 'desactivado'}`);
      if (selectedPuestoId) loadProductos(Number(selectedPuestoId));
    } catch { toast.error('Error actualizando producto'); }
  }

  const handleCrearPromocion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPuestoIdPromo) return toast.error('Selecciona un puesto primero');
    setLoading(true);
    try {
      await crearPromocion({ ...promocion, puesto_id: selectedPuestoIdPromo });
      toast.success('Promoción creada con éxito');
      setPromocion({ titulo: '', descripcion: '', precio_promo: 0, activa: true });
      loadPromociones(Number(selectedPuestoIdPromo));
    } catch { toast.error('Error al crear promoción'); }
    finally { setLoading(false); }
  };

  const handleTogglePromocion = async (promo: any) => {
    try {
      await actualizarPromocion(promo.id, { ...promo, activa: !promo.activa });
      toast.success(`Promoción ${promo.titulo} ${!promo.activa ? 'activada' : 'desactivada'}`);
      if (selectedPuestoIdPromo) loadPromociones(Number(selectedPuestoIdPromo));
    } catch { toast.error('Error actualizando promoción'); }
  }

  const handleGuardarParametros = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await actualizarParametros(parametros);
      toast.success('Parámetros globales actualizados');
    } catch { toast.error('Error al actualizar parámetros'); }
    finally { setLoading(false); }
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await crearUsuario(nuevoUsuario);
      toast.success('Usuario registrado con éxito');
      setNuevoUsuario({ email: '', password: '', nombre: '', rol: 'gestor', puesto_id: '' });
      loadUsuarios();
    } catch { toast.error('Error al registrar usuario'); }
    finally { setLoading(false); }
  };

  const handleEliminarFestival = async (id: number) => {
    if (!window.confirm('¿Seguro que quieres eliminar este evento? Todo lo relacionado puede perderse.')) return;
    try {
      await eliminarFestival(id);
      toast.success('Festival eliminado');
      loadFestivales();
    } catch { toast.error('Error al eliminar festival'); }
  };

  const handleEliminarPuesto = async (id: number) => {
    if (!window.confirm('¿Seguro que quieres eliminar este puesto?')) return;
    try {
      await eliminarPuesto(id);
      toast.success('Puesto eliminado');
      loadPuestos();
    } catch { toast.error('Error al eliminar puesto'); }
  };

  const handleEliminarProducto = async (id: number) => {
    if (!window.confirm('¿Seguro que quieres eliminar este producto del catálogo?')) return;
    try {
      await eliminarProducto(id);
      toast.success('Producto eliminado');
      if (selectedPuestoId) loadProductos(Number(selectedPuestoId));
    } catch { toast.error('Error al eliminar producto'); }
  };

  const handleEliminarPromocion = async (id: number) => {
    if (!window.confirm('¿Seguro que quieres eliminar esta promoción?')) return;
    try {
      await eliminarPromocion(id);
      toast.success('Promoción eliminada');
      if (selectedPuestoIdPromo) loadPromociones(Number(selectedPuestoIdPromo));
    } catch { toast.error('Error al eliminar promoción'); }
  };

  const handleEliminarUsuario = async (id: number) => {
    if (!window.confirm('¿Seguro que quieres revocar el acceso a este usuario?')) return;
    try {
      await eliminarUsuario(id);
      toast.success('Usuario eliminado');
      loadUsuarios();
    } catch { toast.error('Error al eliminar usuario'); }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header (Negro/Rojo Admin) */}
      <div className="bg-gray-900 border-b-4 border-red-600 text-white p-4 flex justify-between items-center shadow-md">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Settings className="text-red-500 w-5 h-5" /> Admin Center
          </h1>
          <p className="text-gray-400 text-sm">Sesión: {user?.nombre || 'Administrador'}</p>
        </div>
        <button onClick={logout} className="text-red-400 hover:text-red-300 flex items-center gap-1 text-sm font-medium transition-colors">
          <LogOut className="w-4 h-4" /> Salir
        </button>
      </div>

      {/* Navegación Tabs horizontal scrollable */}
      <div className="flex overflow-x-auto border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm hide-scrollbar">
        {[
          { id: 'festival', label: 'Evento', icon: Calendar },
          { id: 'puestos', label: 'Puestos', icon: Store },
          { id: 'productos', label: 'Catálogo', icon: Package },
          { id: 'promociones', label: 'Ofertas', icon: Tag },
          { id: 'parametros', label: 'Ajustes', icon: Settings },
          { id: 'usuarios', label: 'Usuarios', icon: Users },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-none flex items-center gap-1 px-4 py-3 text-sm font-medium transition-colors ${tab === t.id ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500 hover:text-gray-800'
              }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* TABS CONTENT */}

        {/* 1. FESTIVAL */}
        {tab === 'festival' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <form onSubmit={handleCrearFestival} className="space-y-4">
              <div className="bg-white rounded-xl p-5 shadow-sm space-y-4 border border-gray-100">
                <h2 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                  <Calendar className="w-5 h-5 text-red-600" /> Registrar Evento Global
                </h2>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Nombre del Evento</label>
                  <input type="text" value={festival.nombre} onChange={e => setFestival({ ...festival, nombre: e.target.value })} placeholder="QueueFest 2026" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha de Inicio</label>
                    <input type="date" value={festival.fecha_inicio} onChange={e => setFestival({ ...festival, fecha_inicio: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha de Fin</label>
                    <input type="date" value={festival.fecha_fin} onChange={e => setFestival({ ...festival, fecha_fin: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" required />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-md shadow-red-500/20">
                <PlusCircle className="w-5 h-5" /> {loading ? 'Creando...' : 'Crear Festival'}
              </button>
            </form>

            <div className="space-y-3 mt-6">
              {/* [TODO: ESTÁTICO -> DINÁMICO] El listado a continuación carga datos dinámicos (hace dinámico) del backend, asumiendo su modelo */}
              <h3 className="font-bold text-gray-700">Eventos Activos <span className="text-xs font-normal text-red-500 bg-red-50 px-2 py-1 rounded">(hace dinámico)</span></h3>
              {festivalesList.length === 0 ? (
                <p className="text-gray-500 text-sm italic text-center py-4 bg-gray-100 rounded-lg">No hay eventos registrados aún.</p>
              ) : festivalesList.map((fest, idx) => (
                <div key={fest.id} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 leading-tight">{fest.nombre || 'Festival Sin Nombre'}</h4>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${fest.activo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {fest.activo ? 'ACTIVO (1)' : 'INACTIVO (0)'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">ID: {fest.id} • Inicio: {fest.fecha_inicio ? new Date(fest.fecha_inicio).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <button onClick={() => handleEliminarFestival(fest.id)} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar Festival">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* 2. PUESTOS */}
        {tab === 'puestos' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <form onSubmit={handleCrearPuesto} className="bg-white rounded-xl p-5 shadow-sm space-y-4 border border-gray-100">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                <Store className="w-5 h-5 text-red-600" /> Configurar Nuevo Puesto
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Nombre del Puesto</label>
                  <input type="text" value={puesto.nombre} onChange={e => setPuesto({ ...puesto, nombre: e.target.value })} placeholder="Ej: Barra Central Stage" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
                  {/* [TODO: ESTÁTICO -> DINÁMICO] Esta lista de tipos debería cargarse desde la DB (p.ej GET /api/admin/tipos-puesto) si prevés escalarlo más allá de barra/foodtruck */}
                  <select value={puesto.tipo} onChange={e => setPuesto({ ...puesto, tipo: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500">
                    <option value="barra">Barra Bebidas</option>
                    <option value="foodtruck">Food Truck</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Horarios</label>
                  <input type="text" value={puesto.horarios_apertura} onChange={e => setPuesto({ ...puesto, horarios_apertura: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Capacidad Máx (Cola) <span className="text-gray-400 text-xs">(pers)</span></label>
                  <input type="number" value={puesto.capacidad_max} onChange={e => setPuesto({ ...puesto, capacidad_max: Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Empleados (Staff)</label>
                  <input type="number" value={puesto.num_empleados} onChange={e => setPuesto({ ...puesto, num_empleados: Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" required />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-gray-900 border border-gray-800 hover:bg-black text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                <PlusCircle className="w-4 h-4" /> Dar de alta Puesto
              </button>
            </form>

            <div className="space-y-3">
              <h3 className="font-bold text-gray-700">Puestos Actuales</h3>
              {puestosList.length === 0 ? (
                <p className="text-gray-500 text-sm italic text-center py-4 bg-gray-100 rounded-lg">No hay puestos registrados.</p>
              ) : puestosList.map((p, i) => (
                <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <div>
                    <h4 className="font-semibold text-gray-900 leading-tight">{p.nombre}</h4>
                    <span className="text-xs text-gray-500 capitalize">{p.tipo} • Staff: {p.num_empleados}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleTogglePuesto(p)} className={`px-3 py-1 text-xs font-bold rounded-full ${p.abierto ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'} transition-colors`}>
                      {p.abierto ? 'ABIERTO' : 'CERRADO'}
                    </button>
                    <button onClick={() => handleEliminarPuesto(p.id)} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar Puesto">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. PRODUCTOS */}
        {tab === 'productos' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white rounded-xl p-5 shadow-sm space-y-4 border border-gray-100">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                <Package className="w-5 h-5 text-red-600" /> Catálogo por Puesto
              </h2>
              <div>
                <label className="block text-sm font-medium mb-1">Selecciona Puesto para editar Catálogo</label>
                <select value={selectedPuestoId} onChange={(e) => setSelectedPuestoId(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg font-medium">
                  <option value="">-- Seleccionar Puesto --</option>
                  {puestosList.map((p, i) => <option key={i} value={p.id}>{p.nombre} ({p.tipo})</option>)}
                </select>
              </div>
            </div>

            {selectedPuestoId && (
              <>
                <form onSubmit={handleCrearProducto} className="bg-white rounded-xl p-4 shadow-sm space-y-4 border border-gray-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase">Nombre Producto</label>
                      <input type="text" value={producto.nombre} onChange={e => setProducto({ ...producto, nombre: e.target.value })} className="w-full p-2 border-b-2 border-gray-200 focus:border-red-500 outline-none font-medium" required placeholder="Ej. Cerveza doble" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase">Descripción</label>
                      <input type="text" value={producto.descripcion} onChange={e => setProducto({ ...producto, descripcion: e.target.value })} className="w-full p-2 border-b-2 border-gray-200 focus:border-red-500 outline-none text-sm" placeholder="Ingredientes o breve descripción" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Precio Base (€)</label>
                      <input type="number" step="0.5" value={producto.precio} onChange={e => setProducto({ ...producto, precio: Number(e.target.value) })} className="w-full p-2 border-b-2 border-gray-200 focus:border-red-500 outline-none font-bold text-gray-800" required />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Precio Dinámico (€) <span className="text-[10px] lowercase font-normal">(opcional)</span></label>
                      <input type="number" step="0.5" value={producto.precio_dinamico} onChange={e => setProducto({ ...producto, precio_dinamico: Number(e.target.value) })} className="w-full p-2 border-b-2 border-gray-200 focus:border-red-500 outline-none font-bold text-red-700" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase">Unidades Iniciales (Stock)</label>
                      <input type="number" value={producto.stock} onChange={e => setProducto({ ...producto, stock: Number(e.target.value) })} className="w-full p-2 border-b-2 border-gray-200 focus:border-red-500 outline-none" required />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-red-50 text-red-700 py-2.5 rounded-lg border border-red-200 font-semibold text-sm hover:bg-red-100 transition-colors">
                    + Insertar en Catálogo
                  </button>
                </form>

                <div className="space-y-2">
                  <h3 className="font-bold text-gray-700 text-sm mb-3">Productos Configurados</h3>
                  {productosList.map((prod, i) => (
                    <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                      <div>
                        <p className={`font-semibold ${prod.activo ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{prod.nombre}</p>
                        <p className="text-xs text-gray-500 font-medium">{prod.precio}€ • Stock: {prod.stock}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleToggleProducto(prod)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                          {prod.activo ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <XCircle className="w-6 h-6 text-gray-300" />}
                        </button>
                        <button onClick={() => handleEliminarProducto(prod.id)} className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors" title="Eliminar Producto">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {productosList.length === 0 && <p className="text-xs text-center text-gray-400">Sin productos aún.</p>}
                </div>
              </>
            )}
          </div>
        )}

        {/* 3.5. PROMOCIONES / OFERTAS */}
        {tab === 'promociones' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white rounded-xl p-5 shadow-sm space-y-4 border border-gray-100">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                <Tag className="w-5 h-5 text-red-600" /> Promociones y Ofertas
              </h2>
              <div>
                <label className="block text-sm font-medium mb-1">Selecciona Puesto para gestionar Ofertas</label>
                <select value={selectedPuestoIdPromo} onChange={(e) => setSelectedPuestoIdPromo(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg font-medium">
                  <option value="">-- Seleccionar Puesto --</option>
                  {puestosList.map((p, i) => <option key={i} value={p.id}>{p.nombre} ({p.tipo})</option>)}
                </select>
              </div>
            </div>

            {selectedPuestoIdPromo && (
              <>
                <form onSubmit={handleCrearPromocion} className="bg-white rounded-xl p-4 shadow-sm space-y-4 border border-gray-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase">Título de la Oferta</label>
                      <input type="text" value={promocion.titulo} onChange={e => setPromocion({ ...promocion, titulo: e.target.value })} className="w-full p-2 border-b-2 border-gray-200 focus:border-red-500 outline-none font-medium" required placeholder="Ej. 2x1 en Cervezas" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase">Descripción</label>
                      <input type="text" value={promocion.descripcion} onChange={e => setPromocion({ ...promocion, descripcion: e.target.value })} className="w-full p-2 border-b-2 border-gray-200 focus:border-red-500 outline-none text-sm" placeholder="Condiciones de la oferta" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Precio Promo (€)</label>
                      <input type="number" step="0.5" value={promocion.precio_promo} onChange={e => setPromocion({ ...promocion, precio_promo: Number(e.target.value) })} className="w-full p-2 border-b-2 border-gray-200 focus:border-red-500 outline-none font-bold text-red-700" required />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-red-50 text-red-700 py-2.5 rounded-lg border border-red-200 font-semibold text-sm hover:bg-red-100 transition-colors">
                    + Insertar Oferta Activa
                  </button>
                </form>

                <div className="space-y-2">
                  <h3 className="font-bold text-gray-700 text-sm mb-3">Ofertas Vigentes</h3>
                  {promocionesList.map((promo, i) => (
                    <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                      <div>
                        <p className={`font-semibold ${promo.activa ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{promo.titulo}</p>
                        <p className="text-xs text-gray-500 font-medium">{promo.precio_promo}€ • {promo.descripcion}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleTogglePromocion(promo)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                          {promo.activa ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <XCircle className="w-6 h-6 text-gray-300" />}
                        </button>
                        <button onClick={() => handleEliminarPromocion(promo.id)} className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors" title="Eliminar Oferta">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {promocionesList.length === 0 && <p className="text-xs text-center text-gray-400">Sin ofertas configuradas.</p>}
                </div>
              </>
            )}
          </div>
        )}

        {/* 4. PARAMETROS / AJUSTES */}
        {tab === 'parametros' && (
          <form onSubmit={handleGuardarParametros} className="bg-white rounded-xl p-5 shadow-sm space-y-6 border border-gray-100 animate-in fade-in slide-in-from-bottom-2">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
              <Settings className="w-5 h-5 text-red-600" /> Reglas de Negocio
            </h2>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">Pricing Dinámico</h4>
                <p className="text-xs text-gray-500 pr-4">Sube precios cuando hay picos de demanda según umbral de cola.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={parametros.pricing_dinamico_activo} onChange={e => setParametros({ ...parametros, pricing_dinamico_activo: e.target.checked })} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            {parametros.pricing_dinamico_activo && (
              <div className="grid grid-cols-2 gap-4 bg-red-50 p-4 rounded-lg border border-red-100">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-red-900">Umbral (Pedidos en cola)</label>
                  <input type="number" value={parametros.umbral_cola} onChange={e => setParametros({ ...parametros, umbral_cola: Number(e.target.value) })} className="w-full p-2 border border-red-200 rounded text-sm text-center font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-red-900">Subida de Precio (%)</label>
                  <input type="number" value={parametros.porcentaje_subida} onChange={e => setParametros({ ...parametros, porcentaje_subida: Number(e.target.value) })} className="w-full p-2 border border-red-200 rounded text-sm text-center font-bold" />
                </div>
              </div>
            )}

            <hr className="border-gray-100" />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">Promociones Automáticas</h4>
                <p className="text-xs text-gray-500 pr-4">Activa happy hours en horas valle detectadas automáticamente.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={parametros.promociones_activas} onChange={e => setParametros({ ...parametros, promociones_activas: e.target.checked })} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            <hr className="border-gray-100" />

            <div className="pt-2">
              <label className="block text-sm font-semibold mb-2 text-gray-800">Alerta Stock Crítico (Unidades Mínimas)</label>
              <input type="number" value={parametros.stock_minimo} onChange={e => setParametros({ ...parametros, stock_minimo: Number(e.target.value) })} className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 font-bold" />
            </div>

            <button type="submit" disabled={loading} className="w-full mt-6 bg-gray-900 hover:bg-black text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
              Guardar y Propagar Reglas
            </button>
          </form>
        )}

        {/* 5. USUARIOS Y PERMISOS */}
        {tab === 'usuarios' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <form onSubmit={handleCrearUsuario} className="bg-white rounded-xl p-5 shadow-sm space-y-4 border border-gray-100">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                <Users className="w-5 h-5 text-red-600" /> Control de Acceso (RBAC)
              </h2>
              <div className="space-y-3">
                <input type="text" placeholder="Nombre completo" value={nuevoUsuario.nombre} onChange={e => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" required />
                <input type="email" placeholder="Correo corporativo" value={nuevoUsuario.email} onChange={e => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" required />
                <div className="grid grid-cols-2 gap-3">
                  <input type="password" placeholder="Contraseña inicial" value={nuevoUsuario.password} onChange={e => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" required />
                  {/* [TODO: ESTÁTICO -> DINÁMICO] Los roles de usuario también podrían solicitarse desde la BD si tu sistema de roles en MySQL puede cambiar mediante migraciones o en el tiempo */}
                  <select value={nuevoUsuario.rol} onChange={e => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium">
                    <option value="gestor">Gestor (Supervisión)</option>
                    <option value="operador">Operador (Puesto)</option>
                    <option value="administrador">Administrador Total</option>
                  </select>
                </div>
                {nuevoUsuario.rol === 'operador' && (
                  <select value={nuevoUsuario.puesto_id} onChange={e => setNuevoUsuario({ ...nuevoUsuario, puesto_id: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-red-200 rounded-lg text-sm text-red-900" required>
                    <option value="">-- Asignar a un Puesto --</option>
                    {puestosList.map((p, i) => <option key={i} value={p.id}>{p.nombre}</option>)}
                  </select>
                )}
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors mt-2">Crear Credenciales</button>
              </div>
            </form>

            <div className="space-y-2 mt-6">
              <h3 className="font-bold text-gray-700 text-sm mb-2">Personal del Sistema <span className="text-[10px] font-normal text-red-500 bg-red-50 px-1.5 py-0.5 rounded">(hace dinámico)</span></h3>
              {usuariosList.length === 0 ? (
                <p className="text-gray-500 text-sm italic text-center py-4 bg-gray-100 rounded-lg">No hay usuarios registrados aún.</p>
              ) : usuariosList.map((usr, i) => (
                <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 leading-none">{usr.nombre}</h4>
                    <p className="text-[10px] text-gray-500">{usr.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${usr.rol === 'administrador' ? 'bg-black text-white' :
                      usr.rol === 'gestor' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                      }`}>
                      {usr.rol}
                    </span>
                    <button onClick={() => handleEliminarUsuario(usr.id)} className="text-red-500 hover:text-red-700 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}