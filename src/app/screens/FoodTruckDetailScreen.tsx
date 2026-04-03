import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '../utils/navigation';
import { ChevronLeft, Clock, Tag, Loader2 } from 'lucide-react';
import { MenuItem } from '../components/MenuItem';
import { StickyBottomCTA } from '../components/StickyBottomCTA';
import { useCart } from '../context/CartContext';
import { StatusBadge } from '../components/StatusBadge';
import { getProductos, getPuesto } from '../api';

export function FoodTruckDetailScreen() {
  const { id } = useParams(); // id del puesto (foodtruck)
  const navigate = useNavigate();
  const { addItem, getTotal, getItemCount } = useCart();

  const [truck, setTruck] = useState<any | null>(null);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Festival elegido en la pantalla anterior
  const festival = JSON.parse(sessionStorage.getItem('festivalSeleccionado') || '{}');

  useEffect(() => {
    const load = async () => {
      try {
        const puesto = await getPuesto(Number(id));

        if (!puesto || puesto.tipo !== 'foodtruck') {
          setTruck(null);
          setCategorias([]);
          return;
        }

        if (festival?.id && Number(puesto.festival_id) !== Number(festival.id)) {
          setTruck(null);
          setCategorias([]);
          return;
        }

        setTruck(puesto);

        const productos = await getProductos(Number(id));
        if (Array.isArray(productos)) {
          const grupos: Record<string, any[]> = {};
          productos.forEach((producto: any) => {
            const normalizedProduct = {
              ...producto,
              nombre: producto?.nombre ?? 'Producto sin nombre',
              descripcion: producto?.descripcion ?? '',
              precio: Number(producto?.precio ?? 0),
              precio_dinamico: Number(producto?.precio_dinamico ?? 0),
              categoria: producto?.categoria || 'Menu'
            };

            const categoria = normalizedProduct.categoria;
            if (!grupos[categoria]) grupos[categoria] = [];
            grupos[categoria].push(normalizedProduct);
          });
          setCategorias(
            Object.entries(grupos).map(([nombre, items]) => ({ nombre, items }))
          );
        } else {
          setCategorias([]);
        }
      } catch (err) {
        console.error('Error cargando food truck:', err);
        setTruck(null);
        setCategorias([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [festival?.id, id]);

  const handleAddItem = (item: any) => {
    return addItem({
      id: String(item.id),
      name: item.name,
      description: item.description,
      price: item.price,
      quantity: 1,
      vendorId: String(id),
      vendorName: truck?.nombre || `Food Truck #${id}`,
      vendorType: 'food-truck'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!truck) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50 p-6">
        <p className="text-gray-500 text-center">No se encontro este food truck en el festival actual.</p>
        <button onClick={() => navigate(-1)} className="text-sm text-green-600 font-medium">Volver</button>
      </div>
    );
  }

  const waitTime = truck.tiempo_servicio_medio ?? 0;
  const queueStatus = waitTime < 10 ? 'fast' : waitTime > 25 ? 'saturated' : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="relative h-48 bg-gradient-to-br from-green-500 to-emerald-600 flex items-end">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="absolute top-4 right-4 flex gap-2">
          {queueStatus && <StatusBadge type={queueStatus} />}
        </div>
        <div className="p-5 pb-6">
          <p className="text-green-200 text-xs font-medium uppercase tracking-wide">{festival?.nombre}</p>
        </div>
      </div>

      <div className="bg-white rounded-t-3xl -mt-4 relative z-10 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">{truck.nombre}</h1>
            <p className="text-gray-500 text-sm capitalize">{truck.tipo}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${truck.abierto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {truck.abierto ? 'Abierto' : 'Cerrado'}
          </div>
        </div>

        {waitTime > 0 && (
          <div className="flex items-center gap-2 text-gray-600 mb-4">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{waitTime} min de espera</span>
          </div>
        )}

        <button
          onClick={() => navigate(`/food-truck/${id}/offers`)}
          className="w-full mb-6 p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-700">Ver Ofertas Especiales</span>
          </div>
          <ChevronLeft className="w-5 h-5 rotate-180 text-green-600" />
        </button>

        {categorias.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Sin productos disponibles.</p>
        ) : (
          <div className="space-y-6">
            {categorias.map((cat) => (
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
      </div>

      <StickyBottomCTA
        itemCount={getItemCount()}
        total={getTotal()}
        onClick={() => navigate('/cart')}
      />
    </div>
  );
}
