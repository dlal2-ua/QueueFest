import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';
import { formatPrice } from '../utils/formatPrice';
import { getMisPedidos } from '../api';
import { BottomNav } from '../components/BottomNav';

interface Order {
  id: number;
  creado_en: string;
  puesto_nombre: string;
  total: string | number;
  estado: 'pendiente' | 'confirmado' | 'preparando' | 'listo' | 'entregado' | 'cancelado';
}

const ACTIVE_STATUSES: Order['estado'][] = ['pendiente', 'confirmado', 'preparando', 'listo'];

export function OrderHistoryScreen() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'active' | 'history'>('active');

  const fetchOrders = async () => {
    try {
      const data = await getMisPedidos();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const activeOrders = useMemo(
    () => orders.filter((order) => ACTIVE_STATUSES.includes(order.estado)),
    [orders]
  );

  const historyOrders = useMemo(
    () => orders.filter((order) => !ACTIVE_STATUSES.includes(order.estado)),
    [orders]
  );

  const visibleOrders = selectedTab === 'active' ? activeOrders : historyOrders;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-700',
      confirmado: 'bg-yellow-100 text-yellow-700',
      preparando: 'bg-blue-100 text-blue-700',
      listo: 'bg-green-100 text-green-700',
      entregado: 'bg-gray-100 text-gray-700',
      cancelado: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pendiente: 'Pendiente',
      confirmado: 'Recibido',
      preparando: 'En preparacion',
      listo: 'Listo para recoger',
      entregado: 'Completado',
      cancelado: 'Cancelado'
    };
    const trans = t(`orders.${status}`);
    return trans === `orders.${status}` ? labels[status] || status : trans;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderOrderCard = (order: Order) => (
    <div
      key={order.id}
      onClick={() => navigate(`/track-order/${order.id}`)}
      className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold">
              {t('orders.orderNumber') || 'Pedido #'}{order.id}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(order.estado)}`}>
              {getStatusLabel(order.estado)}
            </span>
          </div>
          <p className="text-sm text-gray-500">{formatDate(order.creado_en)}</p>
        </div>
        <ChevronRight className={`w-5 h-5 text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />
      </div>

      <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
        <p className="text-sm text-gray-600">{order.puesto_nombre}</p>
        <p className="font-semibold">{formatPrice(Number(order.total))}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{t('orders.title') || 'Mis pedidos'}</h1>
            <p className="text-sm text-gray-500">Consulta tus pedidos actuales o el historico</p>
          </div>
          <button
            onClick={fetchOrders}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Actualizar pedidos"
          >
            <RefreshCw className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-4 pb-4">
          <div className="bg-gray-100 rounded-2xl p-1 grid grid-cols-2 gap-1">
            <button
              onClick={() => setSelectedTab('active')}
              className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                selectedTab === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Actuales ({activeOrders.length})
            </button>
            <button
              onClick={() => setSelectedTab('history')}
              className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                selectedTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Historico ({historyOrders.length})
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {t('orders.empty') || 'Todavia no tienes pedidos'}
          </div>
        ) : (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedTab === 'active' ? 'Pedidos actuales' : 'Historico de pedidos'}
              </h2>
              <span className="text-sm text-gray-500">{visibleOrders.length}</span>
            </div>

            {visibleOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-4 text-sm text-gray-500 shadow-sm">
                {selectedTab === 'active'
                  ? 'No tienes pedidos activos ahora mismo.'
                  : 'Todavia no hay pedidos finalizados o cancelados.'}
              </div>
            ) : (
              visibleOrders.map(renderOrderCard)
            )}
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
