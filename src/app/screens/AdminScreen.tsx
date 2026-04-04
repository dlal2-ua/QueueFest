import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import {
  crearFestival, getFestivales, eliminarFestival, desactivarFestival, activarFestival, actualizarFestival, subirFotoFestival,
  crearPuesto, actualizarPuesto, getPuestosByFestival, eliminarPuesto, subirFotoPuesto,
  getProductos, getAdminProductos, crearProducto, actualizarProducto, eliminarProducto, subirFotoProducto,
  getPromociones, crearPromocion, actualizarPromocion, eliminarPromocion,
  getParametros, actualizarParametros,
  getUsuariosStaff, getUsuarios, crearUsuario, eliminarUsuario
} from '../api';
import {
  PlusCircle, Calendar, Settings, Users, Package,
  Store, CheckCircle2, XCircle, LogOut, Trash2, Tag, Eye, PowerOff, Pencil, X
} from 'lucide-react';

export function AdminScreen() {
  const { user, logout } = useAuth();

  const tabsRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<'festival' | 'puestos' | 'productos' | 'promociones' | 'parametros' | 'usuarios'>('festival');
  const [loading, setLoading] = useState(false);

  // ── Festival activo en contexto ──────────────────────────────────────────
  const [festivalesList, setFestivalesList] = useState<any[]>([]);
  // Se persiste en localStorage para sobrevivir re-renders y recargas de página
  const [festivalActivo, setFestivalActivo] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('adminFestivalActivo');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const persistFestivalActivo = (fest: any | null) => {
    setFestivalActivo(fest);
    if (fest) localStorage.setItem('adminFestivalActivo', JSON.stringify(fest));
    else localStorage.removeItem('adminFestivalActivo');
  };

  // Datos filtrados por festival activo
  const [puestosList, setPuestosList] = useState<any[]>([]);

  // States: Festival (formulario)
  const [festival, setFestival] = useState({ nombre: '', fecha_inicio: '', fecha_fin: '', localizacion: '' });
  const [fotoFestival, setFotoFestival] = useState<File | null>(null);
  
  const [editandoFestivalId, setEditandoFestivalId] = useState<number | null>(null);
  const [festivalEditFormData, setFestivalEditFormData] = useState({ nombre: '', fecha_inicio: '', fecha_fin: '', localizacion: '', foto_url: '' });
  const [fotoFestivalEdit, setFotoFestivalEdit] = useState<File | null>(null);

  // States: Puesto
  const [puesto, setPuesto] = useState({
    festival_id: festivalActivo?.id || 0,
    nombre: '', tipo: 'barra', capacidad_max: 50, num_empleados: 3,
    horarios_apertura: '18:00 - 04:00'
  });
  const [fotoPuesto, setFotoPuesto] = useState<File | null>(null);

  // States: Productos
  const [productosList, setProductosList] = useState<any[]>([]);
  const [selectedPuestoId, setSelectedPuestoId] = useState<number | ''>('');
  const [producto, setProducto] = useState({
    nombre: '', descripcion: '', precio: 0, precio_dinamico: 0, stock: 100, activo: true
  });
  const [fotoProducto, setFotoProducto] = useState<File | null>(null);

  // States: Promociones
  const [promocionesList, setPromocionesList] = useState<any[]>([]);
  const [selectedPuestoIdPromo, setSelectedPuestoIdPromo] = useState<number | ''>('');
  const [promocion, setPromocion] = useState({ titulo: '', descripcion: '', precio_promo: 0, activa: true });

  // States: Edición en línea
  const [editandoPuestoId, setEditandoPuestoId] = useState<number | null>(null);
  const [puestoEditFormData, setPuestoEditFormData] = useState({ nombre: '', tipo: 'barra', capacidad_max: 50, num_empleados: 3, horarios_apertura: '', foto_url: '' });
  const [fotoPuestoEdit, setFotoPuestoEdit] = useState<File | null>(null);

  const [editandoProductoId, setEditandoProductoId] = useState<number | null>(null);
  const [productoEditFormData, setProductoEditFormData] = useState({ nombre: '', descripcion: '', precio: 0, precio_dinamico: 0, stock: 100, foto_url: '' });
  const [fotoProductoEdit, setFotoProductoEdit] = useState<File | null>(null);

  const [editandoPromocionId, setEditandoPromocionId] = useState<number | null>(null);
  const [promocionEditFormData, setPromocionEditFormData] = useState({ titulo: '', descripcion: '', precio_promo: 0 });

  // States: Parámetros
  const [parametros, setParametros] = useState({
    pricing_dinamico_activo: false, umbral_cola: 20,
    porcentaje_subida: 10, promociones_activas: false, stock_minimo: 10
  });

  // States: Usuarios staff
  const [usuariosList, setUsuariosList] = useState<any[]>([]);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    email: '', password: '', nombre: '', rol: 'gestor', puesto_id: ''
  });

  // ── Loaders ──────────────────────────────────────────────────────────────

  const loadFestivales = useCallback(async () => {
    try {
      const data = await getFestivales();
      if (!Array.isArray(data)) return;
      setFestivalesList(data);

      setFestivalActivo((prev: any) => {
        // Si ya hay uno guardado, refrescar sus datos desde la respuesta
        if (prev?.id) {
          const actualizado = data.find((f: any) => f.id === prev.id);
          if (actualizado) {
            localStorage.setItem('adminFestivalActivo', JSON.stringify(actualizado));
            return actualizado;
          }
        }
        // Si no había ninguno, auto-seleccionar el primer festival activo
        const primerActivo = data.find((f: any) => f.activo === 1 || f.activo === true);
        if (primerActivo) {
          localStorage.setItem('adminFestivalActivo', JSON.stringify(primerActivo));
          return primerActivo;
        }
        return prev;
      });
    } catch { toast.error('Error al cargar festivales'); }
  }, []);

  // Recibe el festival como argumento para evitar la race condition donde
  // el estado `festivalActivo` aún no se ha actualizado en el mismo ciclo
  const loadPuestos = useCallback(async (festivalParam?: any) => {
    const fest = festivalParam ?? festivalActivo;
    if (!fest?.id) {
      setPuestosList([]);
      return;
    }
    try {
      const data = await getPuestosByFestival(fest.id);
      if (Array.isArray(data)) setPuestosList(data);
    } catch { toast.error('Error al cargar puestos'); }
  }, [festivalActivo]);

  const loadProductos = useCallback(async (pid: number) => {
    try {
      const data = await getAdminProductos(pid);
      if (Array.isArray(data)) setProductosList(data);
    } catch { toast.error('Error al cargar productos'); }
  }, []);

  const loadPromociones = useCallback(async (pid: number) => {
    try {
      const data = await getPromociones(pid);
      if (Array.isArray(data)) setPromocionesList(data);
    } catch { toast.error('Error al cargar promociones'); }
  }, []);

  const loadParametros = useCallback(async () => {
    try {
      const data = await getParametros();
      if (data && data.id) setParametros(data);
    } catch { toast.error('Error al cargar parámetros'); }
  }, []);

  const loadUsuarios = useCallback(async () => {
    try {
      const data = await getUsuariosStaff();
      if (Array.isArray(data)) { setUsuariosList(data); return; }
    } catch { /* fallback silencioso */ }
    try {
      const data = await getUsuarios();
      if (Array.isArray(data)) {
        setUsuariosList(data.filter((u: any) => [1, 2, 3].includes(Number(u.rol_id))));
      }
    } catch { toast.error('Error al cargar usuarios'); }
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────

  // Efecto para auto-scrollear a la pestaña activa
  useEffect(() => {
    if (tabsRef.current) {
      const activeTab = tabsRef.current.querySelector<HTMLButtonElement>('.tab-active');
      if (activeTab) {
        const scrollLeft = activeTab.offsetLeft - (tabsRef.current.clientWidth / 2) + (activeTab.clientWidth / 2);
        tabsRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [tab]);

  // Cuando cambia el ID del festival activo: sincronizar form y recargar puestos
  // Pasamos el festival explícitamente para evitar la race condition con el estado
  useEffect(() => {
    if (festivalActivo?.id) {
      setPuesto(prev => ({ ...prev, festival_id: festivalActivo.id }));
      setSelectedPuestoId('');
      setSelectedPuestoIdPromo('');
      loadPuestos(festivalActivo);
    }
  }, [festivalActivo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al cambiar de tab, cargar lo necesario
  useEffect(() => {
    if (tab === 'festival') {
      loadFestivales();
    } else if (['puestos', 'productos', 'promociones'].includes(tab)) {
      if (festivalActivo?.id) {
        loadPuestos(festivalActivo);
      } else {
        // Sin festival activo, cargar la lista para que el usuario pueda elegir
        loadFestivales();
      }
    } else if (tab === 'parametros') {
      loadParametros();
    } else if (tab === 'usuarios') {
      if (festivalActivo?.id) loadPuestos(festivalActivo);
      loadUsuarios();
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedPuestoId) loadProductos(Number(selectedPuestoId));
    else setProductosList([]);
  }, [selectedPuestoId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedPuestoIdPromo) loadPromociones(Number(selectedPuestoIdPromo));
    else setPromocionesList([]);
  }, [selectedPuestoIdPromo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCrearFestival = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await crearFestival(festival);
      if (fotoFestival) {
        const fd = new FormData();
        fd.append('foto', fotoFestival);
        await subirFotoFestival(data.id, fd);
      }
      toast.success(`Festival creado (ID: ${data?.id || '?'})`);
      setFestival({ nombre: '', fecha_inicio: '', fecha_fin: '', localizacion: '' });
      setFotoFestival(null);
      loadFestivales();
    } catch { toast.error('Error al crear el festival'); }
    finally { setLoading(false); }
  };

  const handleCambiarFestival = (fest: any) => {
    persistFestivalActivo(fest);
    setPuestosList([]);
    loadPuestos(fest); // pasamos el objeto directamente, no esperamos al estado
    toast.success(`Contexto cambiado a: ${fest.nombre}`);
  };

  const handleDesactivarFestival = async () => {
    if (!festivalActivo) return;
    if (!window.confirm(`¿Desactivar "${festivalActivo.nombre}"?`)) return;
    try {
      await desactivarFestival(festivalActivo.id);
      toast.success('Evento desactivado');
      persistFestivalActivo({ ...festivalActivo, activo: 0 });
      loadFestivales();
    } catch { toast.error('Error al desactivar el evento'); }
  };

  const handleActivarFestival = async () => {
    if (!festivalActivo) return;
    if (!window.confirm(`¿Activar "${festivalActivo.nombre}"?`)) return;
    try {
      await activarFestival(festivalActivo.id);
      toast.success('Evento activado');
      persistFestivalActivo({ ...festivalActivo, activo: 1 });
      loadFestivales();
    } catch { toast.error('Error al activar el evento'); }
  };

  const handleCrearPuesto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!festivalActivo) return toast.error('Selecciona un festival primero');
    setLoading(true);
    try {
      const resp = await crearPuesto({ ...puesto, festival_id: festivalActivo.id });
      if (fotoPuesto) {
        const fd = new FormData();
        fd.append('foto', fotoPuesto);
        await subirFotoPuesto(resp.id, fd);
      }
      toast.success('Puesto creado');
      setPuesto(prev => ({ ...prev, nombre: '', capacidad_max: 50, num_empleados: 3 }));
      setFotoPuesto(null);
      loadPuestos(festivalActivo);
    } catch { toast.error('Error al crear el puesto'); }
    finally { setLoading(false); }
  };

  const handleTogglePuesto = async (p: any) => {
    try {
      await actualizarPuesto(p.id, { ...p, abierto: !p.abierto });
      toast.success(`Puesto ${p.nombre} ${!p.abierto ? 'abierto' : 'cerrado'}`);
      loadPuestos(festivalActivo);
    } catch { toast.error('Error al actualizar estado del puesto'); }
  };

  const handleCrearProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPuestoId) return toast.error('Selecciona un puesto primero');
    setLoading(true);
    try {
      const resp = await crearProducto({ ...producto, puesto_id: selectedPuestoId });
      if (fotoProducto) {
        const fd = new FormData();
        fd.append('foto', fotoProducto);
        await subirFotoProducto(resp.id, fd);
      }
      toast.success('Producto añadido');
      setProducto({ nombre: '', descripcion: '', precio: 0, precio_dinamico: 0, stock: 100, activo: true });
      setFotoProducto(null);
      loadProductos(Number(selectedPuestoId));
    } catch { toast.error('Error al crear producto'); }
    finally { setLoading(false); }
  };

  const handleToggleProducto = async (prod: any) => {
    try {
      await actualizarProducto(prod.id, { ...prod, activo: !prod.activo });
      toast.success('Producto actualizado');
      if (selectedPuestoId) loadProductos(Number(selectedPuestoId));
    } catch { toast.error('Error actualizando producto'); }
  };

  const handleCrearPromocion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPuestoIdPromo) return toast.error('Selecciona un puesto primero');
    setLoading(true);
    try {
      await crearPromocion({ ...promocion, puesto_id: selectedPuestoIdPromo });
      toast.success('Promoción creada');
      setPromocion({ titulo: '', descripcion: '', precio_promo: 0, activa: true });
      loadPromociones(Number(selectedPuestoIdPromo));
    } catch { toast.error('Error al crear promoción'); }
    finally { setLoading(false); }
  };

  const handleTogglePromocion = async (promo: any) => {
    try {
      await actualizarPromocion(promo.id, { ...promo, activa: !promo.activa });
      toast.success('Oferta actualizada');
      if (selectedPuestoIdPromo) loadPromociones(Number(selectedPuestoIdPromo));
    } catch { toast.error('Error actualizando oferta'); }
  };

  const handleGuardarParametros = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await actualizarParametros(parametros);
      toast.success('Parámetros actualizados');
    } catch { toast.error('Error al actualizar parámetros'); }
    finally { setLoading(false); }
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await crearUsuario(nuevoUsuario);
      toast.success('Usuario creado');
      setNuevoUsuario({ email: '', password: '', nombre: '', rol: 'gestor', puesto_id: '' });
      loadUsuarios();
    } catch { toast.error('Error al crear usuario'); }
    finally { setLoading(false); }
  };

  const handleEliminarFestival = async (id: number) => {
    if (!window.confirm('¿Eliminar este festival? Se perderán todos sus datos.')) return;
    try {
      await eliminarFestival(id);
      toast.success('Festival eliminado');
      if (festivalActivo?.id === id) persistFestivalActivo(null);
      loadFestivales();
    } catch { toast.error('Error al eliminar festival'); }
  };

  const handleEditFestival = (fest: any) => {
    setEditandoFestivalId(fest.id);
    setFestivalEditFormData({
      nombre: fest.nombre,
      fecha_inicio: fest.fecha_inicio ? fest.fecha_inicio.substring(0, 10) : '',
      fecha_fin: fest.fecha_fin ? fest.fecha_fin.substring(0, 10) : '',
      localizacion: fest.localizacion || '',
      foto_url: fest.foto_url || ''
    });
    setFotoFestivalEdit(null);
  };

  const handleSaveFestival = async (id: number) => {
    setLoading(true);
    try {
      await actualizarFestival(id, festivalEditFormData);
      if (fotoFestivalEdit) {
        const fd = new FormData();
        fd.append('foto', fotoFestivalEdit);
        await subirFotoFestival(id, fd);
      }
      toast.success('Festival actualizado');
      setEditandoFestivalId(null);
      // Si el festival editado es el activo, actualizar el estado
      if (festivalActivo?.id === id) {
        persistFestivalActivo({ ...festivalActivo, ...festivalEditFormData });
      }
      loadFestivales();
    } catch {
      toast.error('Error al actualizar el festival');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPuesto = (p: any) => {
    setEditandoPuestoId(p.id);
    setPuestoEditFormData({
      nombre: p.nombre,
      tipo: p.tipo,
      capacidad_max: p.capacidad_max,
      num_empleados: p.num_empleados,
      horarios_apertura: p.horarios_apertura,
      foto_url: p.foto_url || ''
    });
    setFotoPuestoEdit(null);
  };

  const handleSavePuesto = async (id: number) => {
    setLoading(true);
    try {
      await actualizarPuesto(id, puestoEditFormData);
      if (fotoPuestoEdit) {
        const fd = new FormData();
        fd.append('foto', fotoPuestoEdit);
        await subirFotoPuesto(id, fd);
      }
      toast.success('Puesto actualizado');
      setEditandoPuestoId(null);
      loadPuestos(festivalActivo);
    } catch {
      toast.error('Error al actualizar el puesto');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProducto = (prod: any) => {
    setEditandoProductoId(prod.id);
    setProductoEditFormData({
      nombre: prod.nombre,
      descripcion: prod.descripcion,
      precio: prod.precio,
      precio_dinamico: prod.precio_dinamico,
      stock: prod.stock,
      foto_url: prod.foto_url || ''
    });
    setFotoProductoEdit(null);
  };

  const handleSaveProducto = async (id: number) => {
    setLoading(true);
    try {
      await actualizarProducto(id, productoEditFormData);
      if (fotoProductoEdit) {
        const fd = new FormData();
        fd.append('foto', fotoProductoEdit);
        await subirFotoProducto(id, fd);
      }
      toast.success('Producto actualizado');
      setEditandoProductoId(null);
      if (selectedPuestoId) loadProductos(Number(selectedPuestoId));
    } catch {
      toast.error('Error al actualizar producto');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPromocion = (promo: any) => {
    setEditandoPromocionId(promo.id);
    setPromocionEditFormData({
      titulo: promo.titulo,
      descripcion: promo.descripcion,
      precio_promo: promo.precio_promo
    });
  };

  const handleSavePromocion = async (id: number) => {
    setLoading(true);
    try {
      await actualizarPromocion(id, promocionEditFormData);
      toast.success('Promoción actualizada');
      setEditandoPromocionId(null);
      if (selectedPuestoIdPromo) loadPromociones(Number(selectedPuestoIdPromo));
    } catch {
      toast.error('Error al actualizar promoción');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarPuesto = async (id: number) => {
    if (!window.confirm('¿Eliminar este puesto?')) return;
    try {
      await eliminarPuesto(id);
      toast.success('Puesto eliminado');
      loadPuestos(festivalActivo);
    } catch { toast.error('Error al eliminar puesto'); }
  };

  const handleEliminarProducto = async (id: number) => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    try {
      await eliminarProducto(id);
      toast.success('Producto eliminado');
      if (selectedPuestoId) loadProductos(Number(selectedPuestoId));
    } catch { toast.error('Error al eliminar producto'); }
  };

  const handleEliminarPromocion = async (id: number) => {
    if (!window.confirm('¿Eliminar esta promoción?')) return;
    try {
      await eliminarPromocion(id);
      toast.success('Promoción eliminada');
      if (selectedPuestoIdPromo) loadPromociones(Number(selectedPuestoIdPromo));
    } catch { toast.error('Error al eliminar promoción'); }
  };

  const handleEliminarUsuario = async (id: number) => {
    if (!window.confirm('¿Revocar acceso a este usuario?')) return;
    try {
      await eliminarUsuario(id);
      toast.success('Usuario eliminado');
      loadUsuarios();
    } catch { toast.error('Error al eliminar usuario'); }
  };

  // ── Helpers UI ────────────────────────────────────────────────────────────

  const rolLabel = (rolId: number) => {
    if (rolId === 1) return { label: 'Administrador', cls: 'bg-black text-white' };
    if (rolId === 2) return { label: 'Gestor', cls: 'bg-blue-100 text-blue-700' };
    if (rolId === 4) return { label: 'Usuario Básico', cls: 'bg-green-100 text-green-700' };
    return { label: 'Operador', cls: 'bg-red-100 text-red-700' };
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border-b-4 border-red-600 text-white p-4 shadow-md">
        <div className="flex justify-between items-start">
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

        {/* Banner festival activo */}
        {festivalActivo ? (
          <div className="mt-3 flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
            <Calendar className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 leading-none">Evento en contexto</p>
              <p className="text-sm font-bold text-white truncate">{festivalActivo.nombre}</p>
            </div>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border flex-shrink-0 ${festivalActivo.activo ? 'bg-green-900 text-green-300 border-green-700' : 'bg-gray-700 text-gray-400 border-gray-600'
              }`}>
              {festivalActivo.activo ? 'ACTIVO' : 'INACTIVO'}
            </span>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 bg-yellow-900/40 rounded-lg px-3 py-2 border border-yellow-700/50">
            <Calendar className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <p className="text-xs text-yellow-300">
              Sin evento seleccionado — ve a <strong>Evento</strong> y pulsa <strong>Ver</strong>
            </p>
          </div>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div ref={tabsRef} className="flex overflow-x-auto border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm hide-scrollbar scroll-smooth">
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
            className={`flex-none flex items-center gap-1 px-4 py-3 text-sm font-medium transition-colors ${tab === t.id ? 'tab-active border-b-2 border-red-600 text-red-600' : 'text-gray-500 hover:text-gray-800'
              }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">

        {/* ── 1. FESTIVAL ─────────────────────────────────────────────── */}
        {tab === 'festival' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <form onSubmit={handleCrearFestival} className="space-y-4">
              <div className="bg-white rounded-xl p-5 shadow-sm space-y-4 border border-gray-100">
                <h2 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                  <Calendar className="w-5 h-5 text-red-600" /> Registrar Evento Global
                </h2>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Nombre del Evento</label>
                  <input
                    type="text" value={festival.nombre}
                    onChange={e => setFestival({ ...festival, nombre: e.target.value })}
                    placeholder="QueueFest 2026"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  />
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
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Localización</label>
                  <input
                    type="text" value={festival.localizacion}
                    onChange={e => setFestival({ ...festival, localizacion: e.target.value })}
                    placeholder="Ej: Recinto Ferial, Madrid"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Foto del Evento</label>
                  <input
                    type="file" accept="image/*"
                    onChange={e => setFotoFestival(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                  />
                  {fotoFestival && (
                    <img src={URL.createObjectURL(fotoFestival)} alt="preview" className="mt-2 h-24 w-full object-cover rounded-lg border border-gray-200" />
                  )}
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-md shadow-red-500/20">
                <PlusCircle className="w-5 h-5" /> {loading ? 'Creando...' : 'Crear Festival'}
              </button>
            </form>

            <div className="space-y-3">
              <h3 className="font-bold text-gray-700">Todos los Eventos</h3>
              {festivalesList.length === 0 ? (
                <p className="text-gray-500 text-sm italic text-center py-4 bg-gray-100 rounded-lg">No hay eventos registrados aún.</p>
              ) : festivalesList.map((fest) => (
                <div key={fest.id} className={`bg-white p-3 rounded-xl shadow-sm border ${festivalActivo?.id === fest.id ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-100'}`}>
                  {editandoFestivalId === fest.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-2">
                        <input
                          type="text"
                          value={festivalEditFormData.nombre}
                          onChange={e => setFestivalEditFormData({ ...festivalEditFormData, nombre: e.target.value })}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                          placeholder="Nombre"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block ml-1">Inicio</label>
                            <input
                              type="date"
                              value={festivalEditFormData.fecha_inicio}
                              onChange={e => setFestivalEditFormData({ ...festivalEditFormData, fecha_inicio: e.target.value })}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block ml-1">Fin</label>
                            <input
                              type="date"
                              value={festivalEditFormData.fecha_fin}
                              onChange={e => setFestivalEditFormData({ ...festivalEditFormData, fecha_fin: e.target.value })}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 font-bold uppercase block ml-1">Localización</label>
                          <input type="text" value={festivalEditFormData.localizacion} onChange={e => setFestivalEditFormData({ ...festivalEditFormData, localizacion: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" placeholder="Ciudad, recinto..." />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 font-bold uppercase block ml-1">Foto</label>
                          {festivalEditFormData.foto_url && !fotoFestivalEdit && (
                            <img src={`http://localhost:3000${festivalEditFormData.foto_url}`} alt="actual" className="mb-1 h-16 w-full object-cover rounded-lg border border-gray-200" />
                          )}
                          {fotoFestivalEdit && (
                            <img src={URL.createObjectURL(fotoFestivalEdit)} alt="nueva" className="mb-1 h-16 w-full object-cover rounded-lg border border-red-200" />
                          )}
                          <input type="file" accept="image/*" onChange={e => setFotoFestivalEdit(e.target.files?.[0] ?? null)} className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-red-50 file:text-red-700" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveFestival(fest.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 rounded-lg text-xs font-bold"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditandoFestivalId(null)}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded-lg text-xs font-bold"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-gray-900 leading-tight">{fest.nombre || 'Sin Nombre'}</h4>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${fest.activo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                            }`}>
                            {fest.activo ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                          {festivalActivo?.id === fest.id && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-600 text-white">EN USO</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          ID: {fest.id} • {fest.fecha_inicio ? new Date(fest.fecha_inicio).toLocaleDateString() : 'N/A'}{fest.fecha_fin ? ` al ${new Date(fest.fecha_fin).toLocaleDateString()}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleCambiarFestival(fest)}
                          disabled={festivalActivo?.id === fest.id}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${festivalActivo?.id === fest.id
                            ? 'bg-red-600 text-white cursor-default'
                            : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-700 border border-gray-200'
                            }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {festivalActivo?.id === fest.id ? 'Activo' : 'Ver'}
                        </button>
                        <button
                          onClick={() => handleEditFestival(fest)}
                          className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEliminarFestival(fest.id)} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 2. PUESTOS ──────────────────────────────────────────────── */}
        {tab === 'puestos' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {!festivalActivo && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
                ⚠️ Selecciona un evento desde la pestaña <strong>Evento → Ver</strong> para gestionar sus puestos.
              </div>
            )}
            <form onSubmit={handleCrearPuesto} className="bg-white rounded-xl p-5 shadow-sm space-y-4 border border-gray-100">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                <Store className="w-5 h-5 text-red-600" /> Nuevo Puesto
                {festivalActivo && <span className="text-xs font-normal text-gray-500 ml-auto">en {festivalActivo.nombre}</span>}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Nombre del Puesto</label>
                  <input type="text" value={puesto.nombre} onChange={e => setPuesto({ ...puesto, nombre: e.target.value })} placeholder="Ej: Barra Central Stage" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
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
                  <label className="block text-sm font-medium mb-1">Capacidad Máx <span className="text-gray-400 text-xs">(pers)</span></label>
                  <input type="number" value={puesto.capacidad_max} onChange={e => setPuesto({ ...puesto, capacidad_max: Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Empleados</label>
                  <input type="number" value={puesto.num_empleados} onChange={e => setPuesto({ ...puesto, num_empleados: Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" required />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Foto del Puesto</label>
                  <input
                    type="file" accept="image/*"
                    onChange={e => setFotoPuesto(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                  />
                  {fotoPuesto && (
                    <img src={URL.createObjectURL(fotoPuesto)} alt="preview" className="mt-2 h-20 w-full object-cover rounded-lg border border-gray-200" />
                  )}
                </div>
              </div>
              <button type="submit" disabled={loading || !festivalActivo} className="w-full bg-gray-900 hover:bg-black text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-40">
                <PlusCircle className="w-4 h-4" /> Dar de alta Puesto
              </button>
            </form>

            <div className="space-y-3">
              <h3 className="font-bold text-gray-700">Puestos de {festivalActivo?.nombre || '—'}</h3>
              {puestosList.length === 0 ? (
                <p className="text-gray-500 text-sm italic text-center py-4 bg-gray-100 rounded-lg">
                  {festivalActivo ? 'No hay puestos en este festival.' : 'Selecciona un festival primero.'}
                </p>
              ) : puestosList.map((p) => (
                <div key={p.id} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  {editandoPuestoId === p.id ? (
                    <div className="w-full space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-500 font-bold uppercase block ml-1">Nombre</label>
                          <input type="text" value={puestoEditFormData.nombre} onChange={e => setPuestoEditFormData({ ...puestoEditFormData, nombre: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 font-bold uppercase block ml-1">Tipo</label>
                          <select value={puestoEditFormData.tipo} onChange={e => setPuestoEditFormData({ ...puestoEditFormData, tipo: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500">
                            <option value="barra">Barra Bebidas</option>
                            <option value="foodtruck">Food Truck</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 font-bold uppercase block ml-1">Horarios</label>
                          <input type="text" value={puestoEditFormData.horarios_apertura} onChange={e => setPuestoEditFormData({ ...puestoEditFormData, horarios_apertura: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block ml-1">Cap.</label>
                            <input type="number" value={puestoEditFormData.capacidad_max} onChange={e => setPuestoEditFormData({ ...puestoEditFormData, capacidad_max: Number(e.target.value) })} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block ml-1">Staff</label>
                            <input type="number" value={puestoEditFormData.num_empleados} onChange={e => setPuestoEditFormData({ ...puestoEditFormData, num_empleados: Number(e.target.value) })} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 font-bold uppercase block ml-1">Foto</label>
                          {puestoEditFormData.foto_url && !fotoPuestoEdit && (
                            <img src={`http://localhost:3000${puestoEditFormData.foto_url}`} alt="actual" className="mb-1 h-14 w-full object-cover rounded-lg border border-gray-200" />
                          )}
                          {fotoPuestoEdit && (
                            <img src={URL.createObjectURL(fotoPuestoEdit)} alt="nueva" className="mb-1 h-14 w-full object-cover rounded-lg border border-red-200" />
                          )}
                          <input type="file" accept="image/*" onChange={e => setFotoPuestoEdit(e.target.files?.[0] ?? null)} className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-red-50 file:text-red-700" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleSavePuesto(p.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 rounded-lg text-xs font-bold">Guardar</button>
                        <button onClick={() => setEditandoPuestoId(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded-lg text-xs font-bold">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0 mr-2">
                        <h4 className="font-semibold text-gray-900 leading-tight">{p.nombre}</h4>
                        <span className="text-xs text-gray-500 capitalize">{p.tipo} • Staff: {p.num_empleados} • Horario: {p.horarios_apertura || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleTogglePuesto(p)} className={`mr-2 px-2 py-1 text-[10px] font-bold rounded-lg border ${p.abierto ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'} transition-colors`}>
                          {p.abierto ? 'ABIERTO' : 'CERRADO'}
                        </button>
                        <button onClick={() => handleEditPuesto(p)} className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEliminarPuesto(p.id)} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 3. PRODUCTOS ────────────────────────────────────────────── */}
        {tab === 'productos' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white rounded-xl p-5 shadow-sm space-y-4 border border-gray-100">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                <Package className="w-5 h-5 text-red-600" /> Catálogo por Puesto
                {festivalActivo && <span className="text-xs font-normal text-gray-500 ml-auto">{festivalActivo.nombre}</span>}
              </h2>
              <div>
                <label className="block text-sm font-medium mb-1">Selecciona Puesto</label>
                <select
                  value={selectedPuestoId}
                  onChange={e => setSelectedPuestoId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg font-medium"
                >
                  <option value="">-- Seleccionar Puesto --</option>
                  {puestosList.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.tipo})</option>)}
                </select>
                {puestosList.length === 0 && festivalActivo && (
                  <p className="text-xs text-amber-600 mt-1">Este festival no tiene puestos aún. Créalos en la pestaña Puestos.</p>
                )}
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
                      <input type="text" value={producto.descripcion} onChange={e => setProducto({ ...producto, descripcion: e.target.value })} className="w-full p-2 border-b-2 border-gray-200 focus:border-red-500 outline-none text-sm" placeholder="Ingredientes o descripción breve" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Precio Base (€)</label>
                      <input type="number" step="0.5" value={producto.precio} onChange={e => setProducto({ ...producto, precio: Number(e.target.value) })} className="w-full p-2 border-b-2 border-gray-200 focus:border-red-500 outline-none font-bold text-gray-800" required />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Precio Dinámico (€)</label>
                      <input type="number" step="0.5" value={producto.precio_dinamico} onChange={e => setProducto({ ...producto, precio_dinamico: Number(e.target.value) })} className="w-full p-2 border-b-2 border-gray-200 focus:border-red-500 outline-none font-bold text-red-700" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase">Stock inicial</label>
                      <input type="number" value={producto.stock} onChange={e => setProducto({ ...producto, stock: Number(e.target.value) })} className="w-full p-2 border-b-2 border-gray-200 focus:border-red-500 outline-none" required />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase">Foto del Producto</label>
                      <input
                        type="file" accept="image/*"
                        onChange={e => setFotoProducto(e.target.files?.[0] ?? null)}
                        className="w-full text-sm text-gray-500 file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 mt-1"
                      />
                      {fotoProducto && (
                        <img src={URL.createObjectURL(fotoProducto)} alt="preview" className="mt-2 h-20 w-full object-cover rounded-lg border border-gray-200" />
                      )}
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-red-50 text-red-700 py-2.5 rounded-lg border border-red-200 font-semibold text-sm hover:bg-red-100 transition-colors">
                    + Insertar en Catálogo
                  </button>
                </form>
                <div className="space-y-2">
                  <h3 className="font-bold text-gray-700 text-sm mb-3">Productos configurados</h3>
                  {productosList.length === 0
                    ? <p className="text-xs text-center text-gray-400">Sin productos aún.</p>
                    : productosList.map(prod => (
                      <div key={prod.id} className={`flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border transition-colors ${prod.activo ? 'border-gray-100' : 'border-red-100 bg-red-50/30'}`}>
                        {editandoProductoId === prod.id ? (
                          <div className="w-full space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div className="md:col-span-2">
                                <label className="text-[10px] text-gray-500 font-bold uppercase block ml-1">Nombre</label>
                                <input type="text" value={productoEditFormData.nombre} onChange={e => setProductoEditFormData({ ...productoEditFormData, nombre: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
                              </div>
                              <div className="md:col-span-2">
                                <label className="text-[10px] text-gray-500 font-bold uppercase block ml-1">Descripción</label>
                                <input type="text" value={productoEditFormData.descripcion} onChange={e => setProductoEditFormData({ ...productoEditFormData, descripcion: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-500 font-bold uppercase block ml-1">Precio</label>
                                <input type="number" step="0.5" value={productoEditFormData.precio} onChange={e => setProductoEditFormData({ ...productoEditFormData, precio: Number(e.target.value) })} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-500 font-bold uppercase block ml-1">P. Dinámico</label>
                                <input type="number" step="0.5" value={productoEditFormData.precio_dinamico} onChange={e => setProductoEditFormData({ ...productoEditFormData, precio_dinamico: Number(e.target.value) })} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
                              </div>
                              <div className="md:col-span-2">
                                <label className="text-[10px] text-gray-500 font-bold uppercase block ml-1">Stock</label>
                                <input type="number" value={productoEditFormData.stock} onChange={e => setProductoEditFormData({ ...productoEditFormData, stock: Number(e.target.value) })} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
                              </div>
                              <div className="md:col-span-2">
                                <label className="text-[10px] text-gray-500 font-bold uppercase block ml-1">Foto</label>
                                {productoEditFormData.foto_url && !fotoProductoEdit && (
                                  <img src={`http://localhost:3000${productoEditFormData.foto_url}`} alt="actual" className="mb-1 h-14 w-full object-cover rounded-lg border border-gray-200" />
                                )}
                                {fotoProductoEdit && (
                                  <img src={URL.createObjectURL(fotoProductoEdit)} alt="nueva" className="mb-1 h-14 w-full object-cover rounded-lg border border-red-200" />
                                )}
                                <input type="file" accept="image/*" onChange={e => setFotoProductoEdit(e.target.files?.[0] ?? null)} className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-red-50 file:text-red-700" />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleSaveProducto(prod.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 rounded-lg text-xs font-bold">Guardar</button>
                              <button onClick={() => setEditandoProductoId(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded-lg text-xs font-bold">Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0 mr-2">
                              <p className={`font-semibold ${prod.activo ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{prod.nombre}</p>
                              <p className="text-xs text-gray-500 font-medium">{prod.precio}€ • Stock: {prod.stock}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleToggleProducto(prod)}
                                title={prod.activo ? 'Desactivar producto' : 'Activar producto'}
                                className="p-1.5 rounded-full transition-colors hover:bg-gray-100"
                              >
                                {prod.activo
                                  ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                                  : <XCircle className="w-5 h-5 text-red-500" />}
                              </button>
                              <button onClick={() => handleEditProducto(prod)} className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleEliminarProducto(prod.id)} className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── 3.5 PROMOCIONES ─────────────────────────────────────────── */}
        {tab === 'promociones' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white rounded-xl p-5 shadow-sm space-y-4 border border-gray-100">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                <Tag className="w-5 h-5 text-red-600" /> Promociones y Ofertas
                {festivalActivo && <span className="text-xs font-normal text-gray-500 ml-auto">{festivalActivo.nombre}</span>}
              </h2>
              <div>
                <label className="block text-sm font-medium mb-1">Selecciona Puesto</label>
                <select
                  value={selectedPuestoIdPromo}
                  onChange={e => setSelectedPuestoIdPromo(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg font-medium"
                >
                  <option value="">-- Seleccionar Puesto --</option>
                  {puestosList.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.tipo})</option>)}
                </select>
              </div>
            </div>

            {selectedPuestoIdPromo && (
              <>
                <form onSubmit={handleCrearPromocion} className="bg-white rounded-xl p-4 shadow-sm space-y-4 border border-gray-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase">Título</label>
                      <input type="text" value={promocion.titulo} onChange={e => setPromocion({ ...promocion, titulo: e.target.value })} className="w-full p-2 border-b-2 border-gray-200 focus:border-red-500 outline-none font-medium" required placeholder="Ej. 2x1 en Cervezas" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase">Descripción</label>
                      <input type="text" value={promocion.descripcion} onChange={e => setPromocion({ ...promocion, descripcion: e.target.value })} className="w-full p-2 border-b-2 border-gray-200 focus:border-red-500 outline-none text-sm" placeholder="Condiciones" />
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
                  <h3 className="font-bold text-gray-700 text-sm mb-3">Ofertas vigentes</h3>
                  {promocionesList.length === 0
                    ? <p className="text-xs text-center text-gray-400">Sin ofertas configuradas.</p>
                    : promocionesList.map(promo => (
                      <div key={promo.id} className={`flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border transition-colors ${promo.activa ? 'border-gray-100' : 'border-red-100 bg-red-50/30'}`}>
                        {editandoPromocionId === promo.id ? (
                          <div className="w-full space-y-3">
                            <div className="grid grid-cols-1 gap-2">
                              <div>
                                <label className="text-[10px] text-gray-500 font-bold uppercase block ml-1">Título</label>
                                <input type="text" value={promocionEditFormData.titulo} onChange={e => setPromocionEditFormData({ ...promocionEditFormData, titulo: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-500 font-bold uppercase block ml-1">Descripción</label>
                                <input type="text" value={promocionEditFormData.descripcion} onChange={e => setPromocionEditFormData({ ...promocionEditFormData, descripcion: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-500 font-bold uppercase block ml-1">Precio Promo</label>
                                <input type="number" step="0.5" value={promocionEditFormData.precio_promo} onChange={e => setPromocionEditFormData({ ...promocionEditFormData, precio_promo: Number(e.target.value) })} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleSavePromocion(promo.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 rounded-lg text-xs font-bold">Guardar</button>
                              <button onClick={() => setEditandoPromocionId(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded-lg text-xs font-bold">Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0 mr-2">
                              <p className={`font-semibold ${promo.activa ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{promo.titulo}</p>
                              <p className="text-xs text-gray-500 font-medium">{promo.precio_promo}€ • {promo.descripcion}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleTogglePromocion(promo)}
                                title={promo.activa ? 'Desactivar oferta' : 'Activar oferta'}
                                className="p-1.5 rounded-full transition-colors hover:bg-gray-100"
                              >
                                {promo.activa
                                  ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                                  : <XCircle className="w-5 h-5 text-red-500" />}
                              </button>
                              <button onClick={() => handleEditPromocion(promo)} className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleEliminarPromocion(promo.id)} className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── 4. AJUSTES ──────────────────────────────────────────────── */}
        {tab === 'parametros' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <form onSubmit={handleGuardarParametros} className="bg-white rounded-xl p-5 shadow-sm space-y-6 border border-gray-100">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                <Settings className="w-5 h-5 text-red-600" /> Reglas de Negocio
              </h2>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">Pricing Dinámico</h4>
                  <p className="text-xs text-gray-500 pr-4">Sube precios cuando hay picos de demanda.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={parametros.pricing_dinamico_activo} onChange={e => setParametros({ ...parametros, pricing_dinamico_activo: e.target.checked })} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              {parametros.pricing_dinamico_activo && (
                <div className="grid grid-cols-2 gap-4 bg-red-50 p-4 rounded-lg border border-red-100">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-red-900">Umbral (pedidos en cola)</label>
                    <input type="number" value={parametros.umbral_cola} onChange={e => setParametros({ ...parametros, umbral_cola: Number(e.target.value) })} className="w-full p-2 border border-red-200 rounded text-sm text-center font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-red-900">Subida de precio (%)</label>
                    <input type="number" value={parametros.porcentaje_subida} onChange={e => setParametros({ ...parametros, porcentaje_subida: Number(e.target.value) })} className="w-full p-2 border border-red-200 rounded text-sm text-center font-bold" />
                  </div>
                </div>
              )}

              <hr className="border-gray-100" />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">Promociones Automáticas</h4>
                  <p className="text-xs text-gray-500 pr-4">Happy hours en horas valle detectadas.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={parametros.promociones_activas} onChange={e => setParametros({ ...parametros, promociones_activas: e.target.checked })} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <hr className="border-gray-100" />

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">Alerta Stock Crítico (unidades mínimas)</label>
                <input type="number" value={parametros.stock_minimo} onChange={e => setParametros({ ...parametros, stock_minimo: Number(e.target.value) })} className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 font-bold" />
              </div>

              <button type="submit" disabled={loading} className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                Guardar y Propagar Reglas
              </button>
            </form>

            {/* Desactivar evento */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-red-100 space-y-3">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                <PowerOff className="w-5 h-5 text-red-600" /> Gestión del Evento Activo
              </h2>
              {festivalActivo ? (
                <>
                  <p className="text-sm text-gray-600">
                    Evento en curso: <strong>{festivalActivo.nombre}</strong>
                    <span className={`ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full border ${festivalActivo.activo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}>
                      {festivalActivo.activo ? 'ACTIVO' : 'YA INACTIVO'}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">Desactivar ocultará el evento a los asistentes. Los datos se conservan.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleActivarFestival}
                      disabled={!!festivalActivo.activo}
                      className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold text-sm transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {festivalActivo.activo ? 'Ya activo' : 'Activar Evento'}
                    </button>
                    <button
                      onClick={handleDesactivarFestival}
                      disabled={!festivalActivo.activo}
                      className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold text-sm transition-colors"
                    >
                      <PowerOff className="w-4 h-4" />
                      {festivalActivo.activo ? 'Desactivar Evento' : 'Ya desactivado'}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500 italic">No hay evento seleccionado. Ve a <strong>Evento → Ver</strong>.</p>
              )}
            </div>
          </div>
        )}

        {/* ── 5. USUARIOS ─────────────────────────────────────────────── */}
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
                  <select value={nuevoUsuario.rol} onChange={e => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium">
                    <option value="gestor">Gestor</option>
                    <option value="operador">Operador</option>
                    <option value="administrador">Administrador</option>
                    <option value="usuario">Usuario Básico</option>
                  </select>
                </div>
                {nuevoUsuario.rol === 'operador' && (
                  <select value={nuevoUsuario.puesto_id} onChange={e => setNuevoUsuario({ ...nuevoUsuario, puesto_id: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-red-200 rounded-lg text-sm text-red-900" required>
                    <option value="">-- Asignar a un Puesto --</option>
                    {puestosList.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                )}
                <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors">
                  Crear Credenciales
                </button>
              </div>
            </form>

            {/* Listado de usuarios */}
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-700 text-sm">Personal del Sistema</h3>
                <div className="flex gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-black text-white font-bold">Admin</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">Gestor</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">Operador</span>
                </div>
              </div>
              {usuariosList.length === 0 ? (
                <p className="text-gray-500 text-sm italic text-center py-4 bg-gray-100 rounded-lg">No hay personal registrado.</p>
              ) : usuariosList.map(usr => {
                // Soporta rol_id numérico y rol string
                const rid = usr.rol_id != null
                  ? Number(usr.rol_id)
                  : usr.rol === 'administrador' ? 1 : usr.rol === 'gestor' ? 2 : usr.rol === 'usuario' ? 4 : 3;
                const { label, cls } = rolLabel(rid);
                return (
                  <div key={usr.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 leading-none">{usr.nombre}</h4>
                      <p className="text-[10px] text-gray-500">{usr.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${cls}`}>
                        {label}
                      </span>
                      <button onClick={() => handleEliminarUsuario(usr.id)} className="text-red-500 hover:text-red-700 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
