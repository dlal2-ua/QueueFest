// TrackOrderScreen.tsx
// Pantalla "Mi Pedido" — Seguimiento en tiempo real del estado del pedido
// Hace polling cada 5 segundos a GET /api/pedidos/:id para reflejar
// cambios de estado realizados por el operador

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Package, ChefHat, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';
import { formatPrice } from '../utils/formatPrice';
import { getPedido } from '../api';
import { PickupQR } from '../components/PickupQR';

// Estados de la DB mapeados a la UI
type DBStatus = 'pendiente' | 'confirmado' | 'preparando' | 'listo' | 'entregado' | 'cancelado';

interface PedidoItem {
  nombre: string;
  producto_nombre?: string;
  cantidad: number;
  precio_unitario: number;
}

interface PedidoDetail {
  id: number;
  puesto_nombre?: string;
  estado: DBStatus;
  total: number;
  creado_en: string;
  tiempo_servicio_medio?: number;
  items?: PedidoItem[];
}

const POLL_INTERVAL = 5000; // 5 segundos

export function TrackOrderScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t, isRTL } = useLanguage();

  const [pedido, setPedido] = useState<PedidoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPedido = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getPedido(Number(id));
      setPedido(data);
      setError(null);
    } catch (err) {
      console.error('Error al obtener pedido:', err);
      setError('No se pudo cargar el pedido');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Carga inicial + polling cada 5s
  useEffect(() => {
    fetchPedido();
    const interval = setInterval(fetchPedido, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPedido]);

  // Los 3 pasos principales que ve el usuario
  const steps = [
    { key: 'recibido', icon: Package, label: t('track.inQueue') || 'Recibido' },
    { key: 'preparando', icon: ChefHat, label: t('track.preparing') || 'Preparando' },
    { key: 'listo', icon: CheckCircle, label: t('track.readyPickup') || 'Listo' },
  ];

  // Mapear estado de la DB → índice del paso visual (0, 1, 2)
  const getStepIndex = (estado?: DBStatus): number => {
    switch (estado) {
      case 'pendiente':
      case 'confirmado':
        return 0; // Recibido
      case 'preparando':
        return 1; // Cocinando
      case 'listo':
      case 'entregado':
        return 2; // Listo
      default:
        return -1; // cancelado u otro
    }
  };

  const currentStepIndex = getStepIndex(pedido?.estado);

  const getProgress = () => {
    if (currentStepIndex <= 0) return 0;
    if (currentStepIndex === 1) return 50;
    return 100;
  };

  const estimatedTime = pedido?.tiempo_servicio_medio ?? 15;
  const items = pedido?.items ?? [];
  const isCancelled = pedido?.estado === 'cancelado';

  // ─── Render ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !pedido) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-gray-600 mb-4">{error || 'Pedido no encontrado'}</p>
        <button
          onClick={() => navigate('/profile/orders')}
          className="bg-black text-white rounded-full px-6 py-3 font-medium"
        >
          Volver a pedidos
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate('/profile/orders')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <h1 className="text-xl font-semibold">{t('track.title') || 'Mi Pedido'}</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Order Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="text-center mb-6">
            <div className="text-sm text-gray-500 mb-1">{t('track.orderNumber') || 'Número de pedido'}</div>
            <div className="text-3xl font-bold">#{pedido.id}</div>
          </div>

          {!isCancelled && (
            <div className="text-center mb-6">
              <div className="text-sm text-gray-500 mb-1">{t('track.estimatedTime') || 'Tiempo estimado'}</div>
              <div className="text-4xl font-bold text-blue-600">
                {estimatedTime} <span className="text-2xl">{t('track.minutes') || 'min'}</span>
              </div>
            </div>
          )}

          {/* Vendor */}
          <div className="text-center pb-4 border-b border-gray-100">
            <div className="font-semibold text-lg">{pedido.puesto_nombre || 'Puesto'}</div>
          </div>

          {/* Items */}
          <div className="pt-4 space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.cantidad}x {item.producto_nombre || item.nombre}
                </span>
                <span className="text-gray-600">
                  {formatPrice(item.precio_unitario * item.cantidad)}
                </span>
              </div>
            ))}
            <div className="flex justify-between font-semibold pt-2 border-t border-gray-100">
              <span>{t('cart.total') || 'Total'}</span>
              <span>{formatPrice(Number(pedido.total))}</span>
            </div>
          </div>
        </div>

        {/* Cancelled Banner */}
        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-red-700 font-semibold text-lg">Pedido cancelado</p>
          </div>
        )}

        {/* Progress Bar — solo si no está cancelado */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200">
                <div
                  className="h-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${getProgress()}%` }}
                />
              </div>

              {/* Steps */}
              <div className="relative flex justify-between">
                {steps.map((step, index) => {
                  const isActive = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const Icon = step.icon;

                  return (
                    <div key={step.key} className="flex flex-col items-center" style={{ width: '33%' }}>
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-all ${isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-400'
                          } ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}
                      >
                        <Icon className="w-7 h-7" />
                      </div>
                      <div
                        className={`text-xs text-center font-medium px-2 ${isActive ? 'text-gray-900' : 'text-gray-400'
                          }`}
                      >
                        {step.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* QR de recogida — solo mientras el pedido no está cancelado */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="text-sm text-gray-500 text-center mb-4">Código de recogida</div>
            <PickupQR orderId={pedido.id} />
          </div>
        )}

        {/* Back to Home Button */}
        <button
          onClick={() => navigate('/home')}
          className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl py-4 font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
