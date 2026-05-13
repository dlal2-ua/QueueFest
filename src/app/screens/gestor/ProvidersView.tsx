import { useEffect, useState } from 'react';
import {
  getProveedores, getProveedor, crearProveedor, actualizarProveedor, darDeBajaProveedor,
  type Proveedor, type MateriaPrimaProveedor
} from '../../api';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, ChevronLeft, Package, Clock, Star, History } from 'lucide-react';

interface ProvidersViewProps {
  festivalId: number;
}

export function ProvidersView({ festivalId }: ProvidersViewProps) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState<'lista' | 'formulario' | 'detalle'>('lista');
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null);
  const [modoEdicion, setModoEdicion] = useState<'crear' | 'editar'>('crear');

  const [formData, setFormData] = useState({
    nombre: '', nif_cif: '', email: '', telefono: '', localidad: '',
    provincia: '', pais: 'España', direccion: '', codigo_postal: '',
    categoria: '', plazo_entrega_dias: 2, notas: ''
  });

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      const data = await getProveedores();
      setProveedores(data);
    } catch (err) {
      console.error('Error al cargar proveedores:', err);
      toast.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarProveedores(); }, []);

  const handleCrear = () => {
    setModoEdicion('crear');
    setFormData({ nombre: '', nif_cif: '', email: '', telefono: '', localidad: '',
      provincia: '', pais: 'España', direccion: '', codigo_postal: '',
      categoria: '', plazo_entrega_dias: 2, notas: '' });
    setVista('formulario');
  };

  const handleEditar = (proveedor: Proveedor) => {
    setModoEdicion('editar');
    setFormData({
      nombre: proveedor.nombre, nif_cif: proveedor.nif_cif,
      email: proveedor.email || '', telefono: proveedor.telefono || '',
      localidad: proveedor.localidad || '', provincia: proveedor.provincia || '',
      pais: proveedor.pais || 'España', direccion: proveedor.direccion || '',
      codigo_postal: proveedor.codigo_postal || '', categoria: proveedor.categoria || '',
      plazo_entrega_dias: proveedor.plazo_entrega_dias || 2, notas: proveedor.notas || ''
    });
    setProveedorSeleccionado(proveedor);
    setVista('formulario');
  };

  const handleVerDetalle = async (proveedor: Proveedor) => {
    try {
      const detalle = await getProveedor(proveedor.id);
      setProveedorSeleccionado(detalle);
      setVista('detalle');
    } catch (err) {
      console.error('Error al cargar detalle:', err);
      toast.error('Error al cargar detalle del proveedor');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.nif_cif) {
      toast.error('Nombre y NIF/CIF son obligatorios');
      return;
    }
    try {
      if (modoEdicion === 'crear') {
        await crearProveedor(formData);
        toast.success('Proveedor creado correctamente');
      } else {
        await actualizarProveedor(proveedorSeleccionado!.id, formData);
        toast.success('Proveedor actualizado correctamente');
      }
      await cargarProveedores();
      setVista('lista');
    } catch (err) {
      console.error('Error al guardar proveedor:', err);
      toast.error('Error al guardar proveedor');
    }
  };

  const handleDarDeBaja = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres dar de baja este proveedor?')) return;
    try {
      await darDeBajaProveedor(id);
      toast.success('Proveedor dado de baja correctamente');
      await cargarProveedores();
    } catch (err) {
      console.error('Error al dar de baja:', err);
      toast.error('Error al dar de baja el proveedor');
    }
  };

  // ===== VISTA LISTA =====
  if (vista === 'lista') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-extrabold flex items-center gap-2" style={{ color: '#2C1810' }}>
              <Package className="w-5 h-5" style={{ color: '#A67C52' }} />
              Proveedores
            </h2>
            <button
              onClick={handleCrear}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #A67C52, #8B6650)' }}
            >
              <Plus className="w-4 h-4" />
              Añadir
            </button>
          </div>
          <p className="text-xs" style={{ color: '#8B6650' }}>
            Gestiona los proveedores del festival
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: '#FFF3E4' }} />
            ))
          ) : proveedores.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto mb-3" style={{ color: '#C8956C', opacity: 0.3 }} />
              <p className="text-sm mb-4" style={{ color: '#C8956C' }}>No hay proveedores registrados</p>
              <button
                onClick={handleCrear}
                className="px-6 py-2 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: '#A67C52' }}
              >
                Crear el primero
              </button>
            </div>
          ) : (
            proveedores.map(proveedor => (
              <div
                key={proveedor.id}
                className="rounded-2xl border p-4 hover:shadow-md transition-all cursor-pointer"
                style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}
                onClick={() => handleVerDetalle(proveedor)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-sm font-extrabold mb-0.5" style={{ color: '#2C1810' }}>
                      {proveedor.nombre}
                    </h3>
                    <p className="text-xs" style={{ color: '#8B6650' }}>
                      {proveedor.nif_cif}
                      {proveedor.categoria ? ` · ${proveedor.categoria}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditar(proveedor); }}
                      className="p-2 rounded-lg hover:bg-white/50 transition-all"
                      style={{ color: '#A67C52' }}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDarDeBaja(proveedor.id); }}
                      className="p-2 rounded-lg hover:bg-red-50 transition-all"
                      style={{ color: '#EF4444' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center py-2 rounded-lg" style={{ backgroundColor: '#E8D5C0' }}>
                    <p className="text-xs font-bold" style={{ color: '#A67C52' }}>
                      {proveedor.num_materias_primas || 0}
                    </p>
                    <p className="text-[9px]" style={{ color: '#8B6650' }}>Suministros</p>
                  </div>
                  <div className="text-center py-2 rounded-lg" style={{ backgroundColor: '#E8D5C0' }}>
                    <p className="text-xs font-bold" style={{ color: '#A67C52' }}>
                      {proveedor.plazo_entrega_dias || '—'}d
                    </p>
                    <p className="text-[9px]" style={{ color: '#8B6650' }}>Entrega</p>
                  </div>
                  <div className="text-center py-2 rounded-lg" style={{ backgroundColor: '#E8D5C0' }}>
                    <p className="text-xs font-bold" style={{ color: '#A67C52' }}>
                      {proveedor.valoracion ? `${proveedor.valoracion}/5` : '—'}
                    </p>
                    <p className="text-[9px]" style={{ color: '#8B6650' }}>Valoración</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ===== VISTA FORMULARIO =====
  if (vista === 'formulario') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>
        <div className="flex-shrink-0 px-4 py-3 border-b flex items-center gap-3" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
          <button onClick={() => setVista('lista')} className="p-2 hover:bg-white/50 rounded-lg transition-all" style={{ color: '#A67C52' }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-extrabold" style={{ color: '#2C1810' }}>
            {modoEdicion === 'crear' ? 'Nuevo proveedor' : 'Editar proveedor'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
            <div className="rounded-2xl p-4 border space-y-3" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
              <h3 className="text-sm font-bold" style={{ color: '#2C1810' }}>Información básica</h3>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#8B6650' }}>Nombre *</label>
                <input type="text" value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E8D5C0', color: '#2C1810' }} required />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#8B6650' }}>NIF/CIF *</label>
                <input type="text" value={formData.nif_cif}
                  onChange={(e) => setFormData({ ...formData, nif_cif: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E8D5C0', color: '#2C1810' }} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#8B6650' }}>Email</label>
                  <input type="email" value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E8D5C0', color: '#2C1810' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#8B6650' }}>Teléfono</label>
                  <input type="tel" value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E8D5C0', color: '#2C1810' }} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-4 border space-y-3" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
              <h3 className="text-sm font-bold" style={{ color: '#2C1810' }}>Ubicación</h3>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#8B6650' }}>Dirección</label>
                <input type="text" value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E8D5C0', color: '#2C1810' }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#8B6650' }}>Localidad</label>
                  <input type="text" value={formData.localidad}
                    onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E8D5C0', color: '#2C1810' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#8B6650' }}>Provincia</label>
                  <input type="text" value={formData.provincia}
                    onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E8D5C0', color: '#2C1810' }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#8B6650' }}>Código Postal</label>
                  <input type="text" value={formData.codigo_postal}
                    onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E8D5C0', color: '#2C1810' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#8B6650' }}>País</label>
                  <input type="text" value={formData.pais}
                    onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E8D5C0', color: '#2C1810' }} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-4 border space-y-3" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
              <h3 className="text-sm font-bold" style={{ color: '#2C1810' }}>Información adicional</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#8B6650' }}>Categoría</label>
                  <input type="text" value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    placeholder="ej: carnes, bebidas..."
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E8D5C0', color: '#2C1810' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#8B6650' }}>Plazo entrega (días)</label>
                  <input type="number" value={formData.plazo_entrega_dias} min="1"
                    onChange={(e) => setFormData({ ...formData, plazo_entrega_dias: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E8D5C0', color: '#2C1810' }} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#8B6650' }}>Notas</label>
                <textarea value={formData.notas} rows={3}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ borderColor: '#E8D5C0', color: '#2C1810' }}
                  placeholder="Notas internas sobre el proveedor..." />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setVista('lista')}
                className="flex-1 py-3 rounded-xl text-sm font-bold border transition-all"
                style={{ borderColor: '#E8D5C0', color: '#8B6650' }}>
                Cancelar
              </button>
              <button type="submit"
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #A67C52, #8B6650)' }}>
                {modoEdicion === 'crear' ? 'Crear proveedor' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ===== VISTA DETALLE =====
  return (
    <DetalleProveedor
      proveedor={proveedorSeleccionado!}
      onBack={() => setVista('lista')}
      onEditar={() => handleEditar(proveedorSeleccionado!)}
    />
  );
}

// ===== COMPONENTE DETALLE =====
interface DetalleProveedorProps {
  proveedor: Proveedor;
  onBack: () => void;
  onEditar: () => void;
}

function DetalleProveedor({ proveedor, onBack, onEditar }: DetalleProveedorProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>
      <div className="flex-shrink-0 px-4 py-3 border-b" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/50 rounded-lg transition-all" style={{ color: '#A67C52' }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-base font-extrabold" style={{ color: '#2C1810' }}>{proveedor.nombre}</h2>
            <p className="text-xs" style={{ color: '#8B6650' }}>{proveedor.nif_cif}</p>
          </div>
          <button onClick={onEditar} className="p-2 hover:bg-white/50 rounded-lg transition-all" style={{ color: '#A67C52' }}>
            <Edit className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Métricas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-3 border text-center" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
            <Clock className="w-4 h-4 mx-auto mb-1" style={{ color: '#A67C52' }} />
            <p className="text-sm font-bold" style={{ color: '#2C1810' }}>{proveedor.plazo_entrega_dias || '—'}d</p>
            <p className="text-xs" style={{ color: '#8B6650' }}>Plazo entrega</p>
          </div>
          <div className="rounded-2xl p-3 border text-center" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
            <Star className="w-4 h-4 mx-auto mb-1" style={{ color: '#A67C52' }} />
            <p className="text-sm font-bold" style={{ color: '#2C1810' }}>{proveedor.valoracion ? `${proveedor.valoracion}/5` : '—'}</p>
            <p className="text-xs" style={{ color: '#8B6650' }}>Valoración</p>
          </div>
        </div>

        {/* Contacto */}
        <div className="rounded-2xl p-4 border" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#2C1810' }}>Contacto</h3>
          <div className="space-y-1.5 text-xs" style={{ color: '#8B6650' }}>
            {proveedor.email && <p>📧 {proveedor.email}</p>}
            {proveedor.telefono && <p>📞 {proveedor.telefono}</p>}
            {proveedor.direccion && <p>📍 {proveedor.direccion}{proveedor.localidad ? `, ${proveedor.localidad}` : ''}{proveedor.provincia ? ` (${proveedor.provincia})` : ''}</p>}
            {proveedor.categoria && <p>🏷️ {proveedor.categoria}</p>}
            {proveedor.notas && <p className="mt-2 italic">"{proveedor.notas}"</p>}
            {!proveedor.email && !proveedor.telefono && !proveedor.direccion && (
              <p style={{ color: '#C8956C' }}>Sin datos de contacto</p>
            )}
          </div>
        </div>

        {/* Historial de suministros */}
        <div className="rounded-2xl p-4 border" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4" style={{ color: '#A67C52' }} />
            <h3 className="text-sm font-bold" style={{ color: '#2C1810' }}>
              Materias suministradas ({proveedor.materias_primas?.length || 0})
            </h3>
          </div>

          {!proveedor.materias_primas || proveedor.materias_primas.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: '#C8956C' }}>
              Sin historial de suministros registrado
            </p>
          ) : (
            <div className="space-y-2">
              {(proveedor.materias_primas as MateriaPrimaProveedor[]).map(mp => (
                <div
                  key={mp.materia_prima_id}
                  className="flex items-center justify-between p-2.5 rounded-xl border"
                  style={{ borderColor: '#E8D5C0', backgroundColor: 'rgba(255,255,255,0.5)' }}
                >
                  <div>
                    <p className="text-xs font-bold" style={{ color: '#2C1810' }}>{mp.materia_prima_nombre}</p>
                    <p className="text-[10px]" style={{ color: '#8B6650' }}>
                      Total: {Number(mp.cantidad_total).toFixed(2)} {mp.unidad_medida}
                    </p>
                  </div>
                  <p className="text-[10px]" style={{ color: '#A67C52' }}>
                    {new Date(mp.ultimo_movimiento).toLocaleDateString('es-ES')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
