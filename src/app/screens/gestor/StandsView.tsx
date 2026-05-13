import { useEffect, useState, useCallback } from 'react';
import { getMapaPuestos, getPedidosPuesto, getAllProductosFestival, getProductosPuesto, asignarProductoAPuesto, quitarProductoDePuesto, type ProductoFestival } from '../../api';
import { useGestorSSE } from '../../hooks/useGestorSSE';
import { ChevronLeft, BarChart2, MapPin, ChevronRight, Search, ShoppingCart } from 'lucide-react';
import { formatWait } from '../../utils/formatTime';
import { toast } from 'sonner';

/* ─── Tipos ────────────────────────────────────────────────────────────── */
interface PuestoMapa {
  id: number;
  nombre: string;
  tipo: string;
  abierto: boolean;
  pedidos_activos: number;
  espera_min: number;
  ingresos_hoy: number;
}

type MetricKey = 'pedidos_activos' | 'espera_min' | 'ingresos_hoy';

const METRICAS: Record<MetricKey, { label: string; unit: string }> = {
  pedidos_activos: { label: 'Pedidos activos', unit: ''    },
  espera_min:      { label: 'Espera (min)',     unit: 'min' },
  ingresos_hoy:    { label: 'Ingresos hoy',    unit: '€'   },
};

const sat = (val: number, max: number, metrica: string) => {
  // For pedidos_activos use absolute festival thresholds, else relative
  if (metrica === 'pedidos_activos') {
    if (val === 0)   return { label: 'Libre',    color: '#4CAF88' };
    if (val <= 10)   return { label: 'Moderado', color: '#F59E0B' };
    return                  { label: 'Saturado', color: '#EF4444' };
  }
  const r = val / max;
  if (r < 0.33) return { label: 'Bajo',    color: '#4CAF88' };
  if (r < 0.66) return { label: 'Medio',   color: '#F59E0B' };
  return               { label: 'Alto',    color: '#EF4444' };
};

/* ─── Sub-vista 5A: Lista ───────────────────────────────────────────────── */
interface ListaProps {
  festivalId: number;
  onSelect: (p: PuestoMapa) => void;
}

function ListaPuestos({ festivalId, onSelect }: ListaProps) {
  const [puestos, setPuestos] = useState<PuestoMapa[]>([]);
  const [metrica, setMetrica] = useState<MetricKey>('pedidos_activos');
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(() => {
    getMapaPuestos(festivalId).then(d => { if (Array.isArray(d)) setPuestos(d); }).catch(() => {});
  }, [festivalId]);

  useEffect(() => {
    setLoading(true);
    getMapaPuestos(festivalId)
      .then(data => setPuestos(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
    const iv = setInterval(cargar, 30000);
    return () => clearInterval(iv);
  }, [festivalId, cargar]);
  useGestorSSE(festivalId, (type) => { if (type === 'order_changed') cargar(); });

  const values = puestos.map(p => p[metrica] ?? 0);
  const max    = Math.max(...values, 1);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>

      {/* Cabecera */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold flex items-center gap-2" style={{ color: '#2C1810' }}>
            <BarChart2 className="w-4 h-4" style={{ color: '#A67C52' }} />
            Puestos
          </h2>
          <div className="flex items-center gap-2 text-[10px] font-semibold" style={{ color: '#8B6650' }}>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Libre</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Mod.</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Sat.</span>
          </div>
        </div>

        {/* Tabs de métrica */}
        <div className="flex gap-1 rounded-2xl p-1" style={{ backgroundColor: '#FFF3E4', border: '1px solid #E8D5C0' }}>
          {(Object.keys(METRICAS) as MetricKey[]).map(k => (
            <button
              key={k}
              onClick={() => setMetrica(k)}
              className="flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all"
              style={metrica === k ? { backgroundColor: '#A67C52', color: '#fff' } : { color: '#8B6650' }}
            >
              {METRICAS[k].label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ backgroundColor: '#FFF3E4' }} />
          ))
        ) : puestos.length === 0 ? (
          <p className="text-center text-sm py-8" style={{ color: '#C8956C', opacity: 0.5 }}>
            Sin datos de puestos
          </p>
        ) : (
          puestos.map(p => {
            const val   = p[metrica] ?? 0;
            const ratio = val / max;
            const s     = sat(val, max, metrica);
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className="w-full text-left rounded-2xl border transition-all active:scale-[0.98] hover:shadow-md"
                style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', padding: '12px 14px' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold" style={{ color: '#2C1810' }}>{p.nombre}</span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: p.abierto ? '#D1FAE5' : '#FEE2E2',
                               color: p.abierto ? '#065F46' : '#991B1B' }}
                    >
                      {p.abierto ? 'Abierto' : 'Cerrado'}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#C8956C' }} />
                </div>

                {/* Barra de progreso */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-5 rounded-lg overflow-hidden" style={{ backgroundColor: '#E8D5C0' }}>
                    <div
                      className="h-full rounded-lg transition-all duration-500"
                      style={{ width: `${Math.max(ratio * 100, val > 0 ? 6 : 0)}%`, backgroundColor: s.color }}
                    />
                  </div>
                  <span className="text-[10px] font-bold w-10 text-right flex-shrink-0" style={{ color: s.color }}>
                    {metrica === 'espera_min' ? formatWait(val, p.pedidos_activos > 0) : `${val}${METRICAS[metrica].unit}`}
                  </span>
                  <span className="text-[9px] font-semibold w-12 text-right flex-shrink-0" style={{ color: s.color }}>
                    {s.label}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─── Sub-vista 5B: Detalle del puesto ─────────────────────────────────── */
interface DetalleProps {
  puesto: PuestoMapa;
  festivalId: number;
  onBack: () => void;
  navigate: (v: string) => void;
}

function DetallePuesto({ puesto, festivalId, onBack, navigate }: DetalleProps) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [todosLosProductos, setTodosLosProductos] = useState<ProductoFestival[]>([]);
  const [productosDelPuesto, setProductosDelPuesto] = useState<number[]>([]);
  const [buscador, setBuscador] = useState('');
  const [loadingProductos, setLoadingProductos] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPedidosPuesto(puesto.id)
      .then(data => setPedidos(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [puesto.id]);

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        setLoadingProductos(true);
        const [todos, delPuesto] = await Promise.all([
          getAllProductosFestival(festivalId),
          getProductosPuesto(puesto.id)
        ]);
        setTodosLosProductos(todos);
        setProductosDelPuesto(delPuesto);
      } catch (err) {
        console.error('Error al cargar productos:', err);
        toast.error('Error al cargar productos');
      } finally {
        setLoadingProductos(false);
      }
    };
    cargarProductos();
  }, [festivalId, puesto.id]);

  const handleToggleProducto = async (productoId: number) => {
    const estaAsignado = productosDelPuesto.includes(productoId);

    try {
      if (estaAsignado) {
        await quitarProductoDePuesto(puesto.id, productoId);
        setProductosDelPuesto(prev => prev.filter(id => id !== productoId));
        toast.success('Producto quitado del puesto');
      } else {
        await asignarProductoAPuesto(puesto.id, productoId);
        setProductosDelPuesto(prev => [...prev, productoId]);
        toast.success('Producto asignado al puesto');
      }
    } catch (err: any) {
      console.error('Error al toggle producto:', err);
      toast.error(err.message || 'Error al actualizar producto');
    }
  };

  const productosFiltrados = todosLosProductos.filter(p =>
    p.nombre.toLowerCase().includes(buscador.toLowerCase())
  );

  const hoy = new Date().toDateString();
  const pedidosHoy = pedidos.filter(p => new Date(p.creado_en).toDateString() === hoy);
  const ingresos   = pedidosHoy.reduce((s, p) => s + Number(p.total || 0), 0);
  const activos    = pedidosHoy.filter(p => !['entregado','cancelado'].includes(p.estado)).length;

  const ingresosPorHora: number[] = Array(24).fill(0);
  pedidosHoy.forEach(p => { ingresosPorHora[new Date(p.creado_en).getHours()] += Number(p.total || 0); });
  const maxH = Math.max(...ingresosPorHora, 1);

  const ultimos7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toDateString();
    return {
      label: d.toLocaleDateString('es-ES', { weekday: 'short' }),
      total: pedidos.filter(p => new Date(p.creado_en).toDateString() === key)
                    .reduce((s, p) => s + Number(p.total || 0), 0),
    };
  });
  const max7 = Math.max(...ultimos7.map(d => d.total), 1);
  const horaPico = ingresosPorHora.indexOf(Math.max(...ingresosPorHora));

  const tarjetas = [
    { label: 'Ingresos hoy',    valor: `${ingresos.toFixed(0)}€`, color: '#4CAF88' },
    { label: 'Pedidos hoy',     valor: pedidosHoy.length,          color: '#6366F1' },
    { label: 'Pedidos activos', valor: activos,                    color: '#F59E0B' },
    { label: 'Hora pico',       valor: `${horaPico}:00`,            color: '#A67C52' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FDF6EE' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
           style={{ backgroundColor: '#FFF3E4', borderBottom: '1px solid #E8D5C0' }}>
        <button onClick={onBack} className="flex items-center gap-1 hover:opacity-70 transition-opacity">
          <ChevronLeft className="w-5 h-5" style={{ color: '#A67C52' }} />
          <span className="text-xs font-semibold" style={{ color: '#A67C52' }}>Volver</span>
        </button>
        <div className="text-center">
          <h2 className="text-sm font-extrabold" style={{ color: '#2C1810' }}>{puesto.nombre}</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ backgroundColor: puesto.abierto ? '#D1FAE5' : '#FEE2E2',
                         color: puesto.abierto ? '#065F46' : '#991B1B', fontWeight: 600 }}>
            {puesto.abierto ? 'Abierto' : 'Cerrado'}
          </span>
        </div>
        <div className="w-14" />
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-8">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ backgroundColor: '#FFF3E4' }} />
          ))
        ) : (
          <>
            {/* Tarjetas 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              {tarjetas.map(({ label, valor, color }) => (
                <div key={label} className="rounded-2xl flex flex-col items-center py-4 px-3 border"
                     style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
                  <p className="text-2xl font-extrabold" style={{ color }}>{valor}</p>
                  <p className="text-[10px] mt-1 text-center" style={{ color: '#8B6650' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Ingresos por hora */}
            <div className="rounded-2xl p-4 border" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
              <h3 className="text-xs font-bold mb-3" style={{ color: '#2C1810' }}>Ingresos por hora (hoy)</h3>
              <div className="flex items-end gap-px" style={{ height: 72 }}>
                {ingresosPorHora.map((v, h) => (
                  <div key={h} className="flex-1 flex flex-col justify-end" title={`${h}:00 — ${v.toFixed(0)}€`}>
                    <div className="w-full rounded-t-sm"
                         style={{ height: `${Math.max((v / maxH) * 60, v > 0 ? 4 : 0)}px`,
                                  backgroundColor: v > 0 ? '#A67C52' : '#E8D5C0' }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px]" style={{ color: '#C8956C' }}>0h</span>
                <span className="text-[9px]" style={{ color: '#C8956C' }}>12h</span>
                <span className="text-[9px]" style={{ color: '#C8956C' }}>23h</span>
              </div>
            </div>

            {/* Últimos 7 días */}
            <div className="rounded-2xl p-4 border" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
              <h3 className="text-xs font-bold mb-3" style={{ color: '#2C1810' }}>Últimos 7 días</h3>
              <div className="flex items-end gap-1" style={{ height: 64 }}>
                {ultimos7.map(({ label, total }) => (
                  <div key={label} className="flex-1 flex flex-col items-center justify-end gap-1">
                    <div className="w-full rounded-t-sm"
                         style={{ height: `${Math.max((total / max7) * 50, total > 0 ? 4 : 0)}px`,
                                  backgroundColor: total > 0 ? '#C8956C' : '#E8D5C0' }} />
                    <span className="text-[9px]" style={{ color: '#8B6650' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* GEST-015: Selección de productos */}
            <div className="rounded-2xl p-4 border" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold flex items-center gap-2" style={{ color: '#2C1810' }}>
                  <ShoppingCart className="w-4 h-4" style={{ color: '#A67C52' }} />
                  Productos del puesto ({productosDelPuesto.length})
                </h3>
              </div>

              {/* Buscador */}
              <div className="mb-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#C8956C' }} />
                <input
                  type="text"
                  value={buscador}
                  onChange={(e) => setBuscador(e.target.value)}
                  placeholder="Buscar producto..."
                  className="w-full pl-10 pr-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: '#E8D5C0', color: '#2C1810' }}
                />
              </div>

              {/* Cards de productos */}
              {loadingProductos ? (
                <div className="grid grid-cols-2 gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 rounded-xl animate-pulse" style={{ backgroundColor: '#E8D5C0' }} />
                  ))}
                </div>
              ) : productosFiltrados.length === 0 ? (
                <div className="text-center py-6 text-xs" style={{ color: '#C8956C' }}>
                  {buscador ? 'No se encontraron productos' : 'No hay productos en el festival'}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                  {productosFiltrados.map(producto => {
                    const estaSeleccionado = productosDelPuesto.includes(producto.id);
                    return (
                      <button
                        key={producto.id}
                        onClick={() => handleToggleProducto(producto.id)}
                        className="relative rounded-xl border overflow-hidden transition-all active:scale-95"
                        style={{
                          borderColor: estaSeleccionado ? '#4CAF88' : '#E8D5C0',
                          backgroundColor: '#FFF',
                          borderWidth: estaSeleccionado ? '2px' : '1px'
                        }}
                      >
                        {/* Capa verde si está seleccionado */}
                        {estaSeleccionado && (
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{ backgroundColor: 'rgba(76, 175, 136, 0.15)' }}
                          />
                        )}

                        {/* Foto del producto */}
                        {producto.foto_url ? (
                          <div className="h-20 bg-cover bg-center" style={{ backgroundImage: `url(${producto.foto_url})` }} />
                        ) : (
                          <div className="h-20 flex items-center justify-center" style={{ backgroundColor: '#E8D5C0' }}>
                            <ShoppingCart className="w-6 h-6" style={{ color: '#C8956C' }} />
                          </div>
                        )}

                        {/* Info del producto */}
                        <div className="p-2">
                          <p className="text-xs font-bold line-clamp-1" style={{ color: '#2C1810' }}>
                            {producto.nombre}
                          </p>
                          <p className="text-xs font-semibold" style={{ color: '#A67C52' }}>
                            {Number(producto.precio).toFixed(2)}€
                          </p>
                        </div>

                        {/* Indicador de selección */}
                        {estaSeleccionado && (
                          <div
                            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: '#4CAF88' }}
                          >
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Botón localizar */}
            <button
              onClick={() => navigate('map')}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-full font-bold text-white active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #C8956C, #A67C52)',
                       boxShadow: '0 6px 20px rgba(168,124,82,0.30)' }}
            >
              <MapPin className="w-5 h-5" />
              Localizar en el mapa
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Componente raíz ───────────────────────────────────────────────────── */
interface Props {
  festivalId: number;
  navigate: (v: string) => void;
}

export function StandsView({ festivalId, navigate }: Props) {
  const [seleccionado, setSeleccionado] = useState<PuestoMapa | null>(null);

  if (seleccionado) {
    return <DetallePuesto puesto={seleccionado} festivalId={festivalId} onBack={() => setSeleccionado(null)} navigate={navigate} />;
  }
  return <ListaPuestos festivalId={festivalId} onSelect={setSeleccionado} />;
}
