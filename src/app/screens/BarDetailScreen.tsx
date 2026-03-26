import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '../utils/navigation';
import { ChevronLeft, Clock, Tag, Loader2 } from 'lucide-react';
import { MenuItem } from '../components/MenuItem';
import { StickyBottomCTA } from '../components/StickyBottomCTA';
import { useCart } from '../context/CartContext';
import { StatusBadge } from '../components/StatusBadge';
import { getPuestosByFestival, getProductos } from '../api';

export function BarDetailScreen() {
  const { id } = useParams();          // id del puesto (barra)
  const navigate = useNavigate();
  const { addItem, getTotal, getItemCount } = useCart();

  const [localTotal, setLocalTotal] = useState(0);
  const [localCount, setLocalCount] = useState(0);

  const [bar, setBar] = useState<any | null>(null);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Festival elegido en la pantalla anterior
  const festival = JSON.parse(sessionStorage.getItem('festivalSeleccionado') || '{}');

  useEffect(() => {
    const load = async () => {
      try {
        // Obtener info del puesto dentro del festival
        if (festival?.id) {
          const puestos = await getPuestosByFestival(festival.id);
          const puesto = Array.isArray(puestos)
            ? puestos.find((p: any) => String(p.id) === String(id))
            : null;
          if (puesto) setBar(puesto);
        }

        // Obtener productos del puesto
        const productos = await getProductos(Number(id));
        if (Array.isArray(productos)) {
          // Agrupar por categoría si existe el campo, si no una sola categoría "Menú"
          const grupos: Record<string, any[]> = {};
          productos.forEach((p: any) => {
            const cat = p.categoria || 'Menú';
            if (!grupos[cat]) grupos[cat] = [];
            grupos[cat].push(p);
          });
          setCategorias(
            Object.entries(grupos).map(([nombre, items]) => ({ nombre, items }))
          );
        }
      } catch (err) {
        console.error('Error cargando barra:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, festival?.id]);

  const handleAddItem = (item: any) => {
    addItem({
      id: String(item.id),
      name: item.name,
      description: item.description,
      price: item.price,
      quantity: 1,
      vendorId: String(id),
      vendorName: bar?.nombre || `Barra #${id}`,
      vendorType: 'bar'
    });
    setLocalTotal(prev => prev + item.price);
    setLocalCount(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!bar) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50 p-6">
        <p className="text-gray-500 text-center">No se encontró esta barra en el festival actual.</p>
        <button onClick={() => navigate(-1)} className="text-sm text-red-600 font-medium">Volver</button>
      </div>
    );
  }

  const waitTime = bar.tiempo_servicio_medio ?? 0;
  const queueStatus = waitTime < 10 ? 'fast' : waitTime > 25 ? 'saturated' : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Hero imagen o cabecera de color */}
      <div className="relative h-48 bg-gradient-to-br from-purple-600 to-pink-500 flex items-end">
        <div className="relative h-48 bg-gradient-to-br from-purple-500 to-pink-500">
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="absolute top-4 right-4 flex gap-2">
            {bar.abierto && <StatusBadge type="offer" />}
            {queueStatus && <StatusBadge type={queueStatus} />}
          </div>
          <div className="p-5 pb-6">
            <p className="text-purple-200 text-xs font-medium uppercase tracking-wide">{festival?.nombre}</p>
          </div>
        </div>

        <div className="bg-white rounded-t-3xl -mt-4 relative z-10 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">{bar.nombre}</h1>
              <p className="text-gray-500 text-sm capitalize">{bar.tipo}</p>
              <h1 className="text-2xl font-bold mb-1">{puesto?.nombre}</h1>
              <p className="text-gray-600">Barra de bebidas</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${bar.abierto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
              {bar.abierto ? 'Abierto' : 'Cerrado'}
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${puesto?.abierto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {puesto?.abierto ? 'Abierto' : 'Pausado'}
              </div>
            </div>

            {waitTime > 0 && (
          <div className="flex items-center gap-2 text-gray-600 mb-4">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{waitTime} min de espera</span>
        {puesto?.abierto === 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 shadow-sm flex items-start gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <h3 className="font-bold text-red-800">Barra al máximo rendimiento</h3>
              <p className="text-sm mt-1">Por alta demanda, hemos pausado los pedidos. Volvemos a servir en 5-10 min.</p>
            </div>
          </div>
        )}
        )}

        <div className="flex items-center gap-2 text-gray-700 mb-6">
          <Clock className="w-5 h-5" />
          <span>{puesto?.tiempo_servicio_medio} min de espera</span>
        </div>

        {/* Botón ir a ofertas */}
        <button
          onClick={() => navigate(`/bar/${id}/offers`)}
          className="w-full mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-100 border border-purple-200 rounded-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-purple-700">Ver Ofertas Especiales</span>
          </div>
          <ChevronLeft className="w-5 h-5 rotate-180 text-purple-600" />
        </button>

        {/* Catálogo por categorías */}
        {categorias.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Sin productos disponibles.</p>
        ) : (
          <div className="space-y-6">
            {categorias.map(cat => (
              <div key={cat.nombre}>
                <h2 className="text-lg font-bold mb-3">{cat.nombre}</h2>
                <div className="bg-white rounded-xl divide-y divide-gray-50">
                  {cat.items.map((item: any) => (
                    <MenuItem
                      key={item.id}
                      id={item.id}
                      name={item.nombre}
                      description={item.descripcion}
                      price={item.precio_dinamico > 0 ? item.precio_dinamico : item.precio}
                      onAdd={handleAddItem}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Carta</h2>
          {productos.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay productos disponibles</p>
          ) : (
            <div className="bg-white rounded-xl">
              {productos.map((item) => (
                <MenuItem
                  key={item.id}
                  id={String(item.id)}
                  name={item.nombre}
                  description={item.descripcion}
                  price={Number(item.precio_dinamico || item.precio)}
                  disabled={puesto?.abierto === 0}
                  onAdd={handleAddItem}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <StickyBottomCTA
        itemCount={getItemCount() + localCount}
        total={getTotal() + localTotal}
        onClick={() => navigate('/cart')}
        itemCount={getItemCount()}
        total={getTotal()}
        onClick={() => navigate('/cart')}
      />
    </div>
          );
}