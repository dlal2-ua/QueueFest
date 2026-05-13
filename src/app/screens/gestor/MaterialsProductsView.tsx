import { useEffect, useState } from 'react';
import {
  getFestivalProductos,
  getProductoComposicion,
  getMateriasPrimas,
  getPuestos,
  createProductoWithComposition,
  type FestivalProducto,
  type ProductoComposicion,
  type MateriaPrima,
  type Puesto
} from '../../api';
import { toast } from 'sonner';
import { Package2, ShoppingCart, ChevronLeft, Eye, Plus, X } from 'lucide-react';

interface MaterialsProductsViewProps {
  festivalId: number;
}

type Vista = 'principal' | 'crear-producto' | 'ver-composicion';

export function MaterialsProductsView({ festivalId }: MaterialsProductsViewProps) {
  const [vista, setVista] = useState<Vista>('principal');
  const [productosFestival, setProductosFestival] = useState<FestivalProducto[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<FestivalProducto | null>(null);
  const [composicionSeleccionada, setComposicionSeleccionada] = useState<ProductoComposicion[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarProductosFestival = async () => {
    try {
      setLoading(true);
      const data = await getFestivalProductos(festivalId);
      setProductosFestival(data);
    } catch (err) {
      console.error('Error al cargar productos del festival:', err);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProductosFestival();
  }, [festivalId]);

  const handleVerComposicion = async (producto: FestivalProducto) => {
    try {
      const composicion = await getProductoComposicion(producto.id);
      setProductoSeleccionado(producto);
      setComposicionSeleccionada(composicion);
      setVista('ver-composicion');
    } catch (err) {
      console.error('Error al cargar composición:', err);
      toast.error('Error al cargar composición del producto');
    }
  };

  // ===== VISTA PRINCIPAL =====
  if (vista === 'principal') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold flex items-center gap-2" style={{ color: '#2C1810' }}>
              <Package2 className="w-5 h-5" style={{ color: '#A67C52' }} />
              Productos del Festival
            </h2>
          </div>
          <p className="text-xs mb-3" style={{ color: '#8B6650' }}>
            Gestiona los productos del festival y su composición de materias primas
          </p>

          <button
            onClick={() => setVista('crear-producto')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
          >
            <ShoppingCart className="w-4 h-4" />
            Crear producto con composición
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <h3 className="text-sm font-bold mb-3" style={{ color: '#2C1810' }}>
            Productos ({productosFestival.length})
          </h3>

          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse mb-3" style={{ backgroundColor: '#FFF3E4' }} />
            ))
          ) : productosFestival.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3" style={{ color: '#C8956C', opacity: 0.3 }} />
              <p className="text-sm mb-2" style={{ color: '#C8956C' }}>
                No hay productos creados
              </p>
              <button
                onClick={() => setVista('crear-producto')}
                className="px-6 py-2 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: '#6366F1' }}
              >
                Crear el primero
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {productosFestival.map(producto => (
                <div
                  key={producto.id}
                  className="rounded-2xl border p-3"
                  style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-extrabold" style={{ color: '#2C1810' }}>
                        {producto.nombre}
                      </h4>
                      <p className="text-xs" style={{ color: '#8B6650' }}>
                        Puesto: {producto.puesto_nombre}
                      </p>
                      {producto.descripcion && (
                        <p className="text-xs mt-1" style={{ color: '#A67C52' }}>
                          {producto.descripcion}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleVerComposicion(producto)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 transition-all"
                      style={{ color: '#6366F1' }}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="py-1.5 rounded-lg text-center" style={{ backgroundColor: '#E8D5C0' }}>
                    <p className="text-sm font-bold" style={{ color: '#A67C52' }}>
                      {Number(producto.precio).toFixed(2)}€
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== VISTA VER COMPOSICIÓN =====
  if (vista === 'ver-composicion' && productoSeleccionado) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>
        <div className="flex-shrink-0 px-4 py-3 border-b flex items-center gap-3" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
          <button
            onClick={() => setVista('principal')}
            className="p-2 hover:bg-white/50 rounded-lg transition-all"
            style={{ color: '#A67C52' }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-extrabold" style={{ color: '#2C1810' }}>
            Composición: {productoSeleccionado.nombre}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-2xl mx-auto space-y-3">
            {composicionSeleccionada.length === 0 ? (
              <p className="text-center text-sm" style={{ color: '#C8956C' }}>
                Este producto no tiene materias primas asignadas
              </p>
            ) : (
              composicionSeleccionada.map(comp => (
                <div
                  key={comp.id}
                  className="rounded-xl border p-3"
                  style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}
                >
                  <h4 className="text-sm font-bold" style={{ color: '#2C1810' }}>
                    {comp.materia_prima_nombre}
                  </h4>
                  <p className="text-xs" style={{ color: '#8B6650' }}>
                    Cantidad por unidad: {comp.cantidad_por_unidad} {comp.unidad_medida}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===== VISTA CREAR PRODUCTO =====
  return (
    <CreateProductView
      festivalId={festivalId}
      onBack={() => setVista('principal')}
      onSuccess={() => {
        cargarProductosFestival();
        setVista('principal');
      }}
    />
  );
}

// ===== COMPONENTE: CREAR PRODUCTO CON COMPOSICIÓN =====
interface CreateProductViewProps {
  festivalId: number;
  onBack: () => void;
  onSuccess: () => void;
}

function CreateProductView({ festivalId, onBack, onSuccess }: CreateProductViewProps) {
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [todasLasMaterias, setTodasLasMaterias] = useState<MateriaPrima[]>([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [puestoId, setPuestoId] = useState('');
  const [composicion, setComposicion] = useState<Array<{ materia_prima_id: number; cantidad: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPuestos().then(allPuestos => allPuestos.filter((p: any) => p.festival_id === festivalId)),
      getMateriasPrimas()
    ])
      .then(([puestosFiltrados, materias]) => {
        setPuestos(puestosFiltrados);
        setTodasLasMaterias(materias);
      })
      .catch(err => {
        console.error('Error al cargar datos:', err);
        toast.error('Error al cargar datos');
      })
      .finally(() => setLoading(false));
  }, [festivalId]);

  const handleAñadirMateria = () => {
    if (todasLasMaterias.length === 0) {
      toast.error('No hay materias primas disponibles');
      return;
    }
    setComposicion([...composicion, { materia_prima_id: 0, cantidad: 0 }]);
  };

  const handleRemoverMateria = (index: number) => {
    setComposicion(composicion.filter((_, i) => i !== index));
  };

  const handleCambiarMateria = (index: number, materiaPrimaId: number) => {
    const nueva = [...composicion];
    nueva[index].materia_prima_id = materiaPrimaId;
    setComposicion(nueva);
  };

  const handleCambiarCantidad = (index: number, cantidad: number) => {
    const nueva = [...composicion];
    nueva[index].cantidad = cantidad;
    setComposicion(nueva);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre || !precio || !puestoId) {
      toast.error('Completa nombre, precio y puesto');
      return;
    }

    if (composicion.length === 0) {
      toast.error('Añade al menos una materia prima');
      return;
    }

    if (composicion.some(c => !c.materia_prima_id || c.cantidad <= 0)) {
      toast.error('Todas las materias primas deben tener cantidad mayor a 0');
      return;
    }

    try {
      await createProductoWithComposition(festivalId, {
        nombre,
        descripcion: descripcion || undefined,
        precio: parseFloat(precio),
        foto_url: fotoUrl || undefined,
        puesto_id: parseInt(puestoId),
        composicion
      });
      toast.success('Producto creado correctamente');
      onSuccess();
    } catch (err: any) {
      console.error('Error al crear producto:', err);
      toast.error(err.message || 'Error al crear producto');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>
      <div className="flex-shrink-0 px-4 py-3 border-b flex items-center gap-3" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/50 rounded-lg transition-all"
          style={{ color: '#A67C52' }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-extrabold" style={{ color: '#2C1810' }}>
          Crear producto con composición
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
          <div className="rounded-2xl p-4 border space-y-3" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
            <h3 className="text-sm font-bold" style={{ color: '#2C1810' }}>Información del producto</h3>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#8B6650' }}>
                Nombre *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: '#E8D5C0', color: '#2C1810' }}
                placeholder="ej: Cheeseburger"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#8B6650' }}>
                Descripción
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                style={{ borderColor: '#E8D5C0', color: '#2C1810' }}
                placeholder="Descripción del producto..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#8B6650' }}>
                  Precio (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: '#E8D5C0', color: '#2C1810' }}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#8B6650' }}>
                  Puesto *
                </label>
                <select
                  value={puestoId}
                  onChange={(e) => setPuestoId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: '#E8D5C0', color: '#2C1810' }}
                  required
                  disabled={loading}
                >
                  <option value="">Selecciona...</option>
                  {puestos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.tipo})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#8B6650' }}>
                URL de la foto
              </label>
              <input
                type="url"
                value={fotoUrl}
                onChange={(e) => setFotoUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: '#E8D5C0', color: '#2C1810' }}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="rounded-2xl p-4 border space-y-3" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: '#2C1810' }}>
                Composición ({composicion.length} materias primas)
              </h3>
              <button
                type="button"
                onClick={handleAñadirMateria}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ backgroundColor: '#A67C52', color: '#fff' }}
                disabled={todasLasMaterias.length === 0}
              >
                <Plus className="w-3 h-3" />
                Añadir
              </button>
            </div>

            {todasLasMaterias.length === 0 ? (
              <div className="text-xs text-center py-4 rounded-lg border" style={{ borderColor: '#E8D5C0', color: '#EF4444' }}>
                ⚠️ No hay materias primas disponibles.
              </div>
            ) : composicion.length === 0 ? (
              <div className="text-xs text-center py-4" style={{ color: '#C8956C' }}>
                Añade materias primas a la composición del producto
              </div>
            ) : (
              <div className="space-y-2">
                {composicion.map((comp, index) => {
                  const materiaSeleccionada = todasLasMaterias.find(m => m.id === comp.materia_prima_id);
                  return (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg border" style={{ borderColor: '#E8D5C0' }}>
                      <select
                        value={comp.materia_prima_id}
                        onChange={(e) => handleCambiarMateria(index, parseInt(e.target.value))}
                        className="flex-1 px-2 py-1.5 rounded-lg border text-xs"
                        style={{ borderColor: '#E8D5C0', color: '#2C1810' }}
                        required
                      >
                        <option value="0">Selecciona...</option>
                        {todasLasMaterias.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.nombre} ({m.unidad_medida})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={comp.cantidad || ''}
                        onChange={(e) => handleCambiarCantidad(index, parseFloat(e.target.value))}
                        placeholder={materiaSeleccionada ? materiaSeleccionada.unidad_medida : 'Cantidad'}
                        className="w-24 px-2 py-1.5 rounded-lg border text-xs text-center"
                        style={{ borderColor: '#E8D5C0', color: '#2C1810' }}
                        required
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoverMateria(index)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-all"
                        style={{ color: '#EF4444' }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-3 rounded-xl text-sm font-bold border transition-all"
              style={{ borderColor: '#E8D5C0', color: '#8B6650' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!nombre || !precio || !puestoId || composicion.length === 0}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
            >
              Crear producto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
