// BarDetailScreen.tsx
// Pantalla de detalle de una barra
// Carga los productos reales desde la BD via API
// El usuario puede añadir productos al carrito y ver el tiempo de espera real

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '../utils/navigation';
import { ChevronLeft, Clock } from 'lucide-react';
import { MenuItem } from '../components/MenuItem';
import { StickyBottomCTA } from '../components/StickyBottomCTA';
import { useCart } from '../context/CartContext';
import { getProductos, getPuestoEstado } from '../api';

export function BarDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, getTotal, getItemCount } = useCart();
  const [productos, setProductos] = useState<any[]>([]);
  const [puesto, setPuesto] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const prods = await getProductos(Number(id));
        setProductos(prods);

        try {
          const livePuesto = await getPuestoEstado(Number(id));
          setPuesto(livePuesto);
        } catch (e) {
          const puestosGuardados = JSON.parse(localStorage.getItem('puestos') || '[]');
          const p = puestosGuardados.find((p: any) => String(p.id) === String(id));
          setPuesto(p || { nombre: 'Barra', tiempo_servicio_medio: 0, abierto: 1 });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id]);

  const handleAddItem = (item: any) => {
    addItem({
      id: String(item.id),
      name: item.name,
      price: Number(item.price),
      quantity: 1,
      vendorId: String(id),
      vendorName: puesto?.nombre || 'Barra',
      vendorType: 'bar'
    });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Cargando...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="relative h-48 bg-gradient-to-br from-purple-500 to-pink-500">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="bg-white rounded-t-3xl -mt-6 relative z-10 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">{puesto?.nombre}</h1>
            <p className="text-gray-600">Barra de bebidas</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${puesto?.abierto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {puesto?.abierto ? 'Abierto' : 'Pausado'}
          </div>
        </div>

        {puesto?.abierto === 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 shadow-sm flex items-start gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <h3 className="font-bold text-red-800">Barra al máximo rendimiento</h3>
              <p className="text-sm mt-1">Por alta demanda, hemos pausado los pedidos. Volvemos a servir en 5-10 min.</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-gray-700 mb-6">
          <Clock className="w-5 h-5" />
          <span>{puesto?.tiempo_servicio_medio} min de espera</span>
        </div>

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
        itemCount={getItemCount()}
        total={getTotal()}
        onClick={() => navigate('/cart')}
      />
    </div>
  );
}