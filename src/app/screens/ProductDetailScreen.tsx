import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Heart, MapPin, Clock3, Plus, Store } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useParams, useLocation } from '../utils/navigation';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { BottomNav } from '../components/BottomNav';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { getProductos, getPuesto } from '../api';
import { formatPrice } from '../utils/formatPrice';
import { getProductImage, isProductFavorite, toggleFavoriteProduct } from '../utils/productHelpers';

interface ProductDetail {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  precio_dinamico: number;
}

export function ProductDetailScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { isRTL } = useLanguage();
  const { addItem } = useCart();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [vendor, setVendor] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(() => isProductFavorite(String(id || '')));

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const vendorId = searchParams.get('vendorId');
  const vendorType = (searchParams.get('vendorType') as 'food-truck' | 'bar' | null) || 'food-truck';

  useEffect(() => {
    setIsFavorite(isProductFavorite(String(id || '')));
  }, [id]);

  useEffect(() => {
    const load = async () => {
      if (!id || !vendorId) {
        setLoading(false);
        return;
      }

      try {
        const [puesto, productos] = await Promise.all([
          getPuesto(Number(vendorId)),
          getProductos(Number(vendorId))
        ]);

        setVendor(puesto);

        if (Array.isArray(productos)) {
          const foundProduct = productos.find((item: any) => String(item.id) === String(id));

          if (foundProduct) {
            setProduct({
              id: String(foundProduct.id),
              nombre: foundProduct.nombre ?? 'Producto sin nombre',
              descripcion: foundProduct.descripcion ?? 'Sin descripcion disponible por ahora.',
              precio: Number(foundProduct.precio ?? 0),
              precio_dinamico: Number(foundProduct.precio_dinamico ?? 0)
            });
          } else {
            setProduct(null);
          }
        } else {
          setProduct(null);
        }
      } catch (error) {
        console.error('Error cargando detalle de producto:', error);
        setProduct(null);
        setVendor(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, vendorId]);

  const displayPrice = product ? (product.precio_dinamico > 0 ? product.precio_dinamico : product.precio) : 0;
  const productImage = useMemo(
    () => getProductImage(product?.nombre || 'Producto', vendorType),
    [product?.nombre, vendorType]
  );

  const handleToggleFavorite = () => {
    if (!product || !vendor) return;

    const nextState = toggleFavoriteProduct({
      id: product.id,
      name: product.nombre,
      description: product.descripcion,
      price: displayPrice,
      image: productImage,
      vendorId: String(vendor.id),
      vendorName: vendor.nombre || 'Puesto',
      vendorType
    });

    setIsFavorite(nextState);
    toast.success(nextState ? 'Producto anadido a favoritos' : 'Producto eliminado de favoritos');
  };

  const handleAddToCart = () => {
    if (!product || !vendor) return;

    const result = addItem({
      id: product.id,
      name: product.nombre,
      description: product.descripcion,
      price: displayPrice,
      quantity: 1,
      vendorId: String(vendor.id),
      vendorName: vendor.nombre || 'Puesto',
      vendorType
    });

    if (!result.ok) {
      toast.error('Solo puedes pedir de un puesto cada vez');
      return;
    }

    toast.success(`${product.nombre} - anadido al carrito`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
      </div>
    );
  }

  if (!product || !vendor) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Producto no disponible</h1>
        <p className="mt-2 text-sm text-gray-500">No hemos podido cargar el detalle de este producto.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="relative h-72 overflow-hidden bg-black">
        <ImageWithFallback
          src={productImage}
          alt={product.nombre}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/15" />

        <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm"
          >
            <ChevronLeft className={`h-6 w-6 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={handleToggleFavorite}
            className={`flex h-11 w-11 items-center justify-center rounded-full shadow-lg backdrop-blur-sm transition-colors ${
              isFavorite ? 'bg-rose-500 text-white' : 'bg-white/90 text-gray-900'
            }`}
          >
            <Heart className={`h-5 w-5 ${isFavorite ? 'fill-white' : ''}`} />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Detalle del producto</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">{product.nombre}</h1>
          <p className="mt-3 inline-flex rounded-full bg-white/15 px-4 py-2 text-lg font-bold backdrop-blur-sm">
            {formatPrice(displayPrice)}
          </p>
        </div>
      </div>

      <div className="relative -mt-6 rounded-t-[32px] bg-gray-50 px-4 pb-6 pt-6">
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Descripcion</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">{product.descripcion}</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Precio base</p>
              <p className="mt-2 text-lg font-bold text-gray-900">{formatPrice(product.precio)}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Precio actual</p>
              <p className="mt-2 text-lg font-bold text-orange-600">{formatPrice(displayPrice)}</p>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Anadir al carrito
          </button>
        </section>

        <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-orange-100 p-3 text-orange-600">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Puestos donde se puede pedir</h2>
              <p className="text-sm text-gray-500">Disponibilidad actual de este producto dentro del festival.</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-bold text-gray-900">{vendor.nombre}</p>
                <p className="mt-1 text-sm capitalize text-gray-500">{vendorType === 'bar' ? 'Barra' : 'Food truck'}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${vendor.abierto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {vendor.abierto ? 'Abierto' : 'Pausado'}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
                <Clock3 className="h-4 w-4 text-gray-400" />
                {vendor.tiempo_servicio_medio ?? 0} min de espera
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                Disponible para pedido directo
              </span>
            </div>

            <button
              onClick={() => navigate(vendorType === 'bar' ? `/bar/${vendor.id}` : `/food-truck/${vendor.id}`)}
              className="mt-4 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100"
            >
              Abrir puesto
            </button>
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
