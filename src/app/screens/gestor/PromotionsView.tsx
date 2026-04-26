import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  crearPromocionGestor,
  actualizarPromocionGestor,
  eliminarPromocionGestor,
  getGestorPromociones,
  getMapaPuestos,
  getProductos,
  type PromotionRecord,
  type PromotionType
} from '../../api';
import { BadgePercent, Pencil, Power, RefreshCw, Save, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  PROMOTION_TYPE_OPTIONS,
  buildPromotionOffer,
  getPromotionBundle,
  getPromotionReferencePrice,
  getPromotionSummary,
  getPromotionTypeLabel,
  normalizePromotionType,
  resolvePromotionPreviewPrice,
  resolvePromotionStoredPrice
} from '../../utils/promotions';

interface Props {
  festivalId: number;
  festivalNombre: string;
}

interface PuestoOption {
  id: number;
  nombre: string;
  tipo: string;
  abierto: boolean;
}

interface ProductoOption {
  id: number;
  nombre: string;
  precio: number;
  precio_dinamico: number;
  activo: boolean;
}

interface PromotionFormState {
  producto_id: string;
  titulo: string;
  descripcion: string;
  tipo: PromotionType;
  promotion_value: string;
  activa: boolean;
}

const EMPTY_FORM: PromotionFormState = {
  producto_id: '',
  titulo: '',
  descripcion: '',
  tipo: 'precio_fijo',
  promotion_value: '',
  activa: true
};

function formatMoney(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return '-';
  return `${numeric.toFixed(2)} EUR`;
}

function getInitialPromotionValue(promotion: PromotionRecord) {
  const type = normalizePromotionType(promotion.tipo);
  if (type === 'precio_fijo') {
    return String(promotion.precio_promo ?? '');
  }
  return promotion.valor_descuento == null ? '' : String(promotion.valor_descuento);
}

function buildPromotionPayload(form: PromotionFormState, puestoId: number, selectedProduct: ProductoOption | null) {
  const type = normalizePromotionType(form.tipo);
  const referencePrice = getPromotionReferencePrice(selectedProduct || undefined);
  const resolvedPromoPrice = resolvePromotionPreviewPrice({
    type,
    referencePrice,
    fixedPrice: form.promotion_value,
    discountValue: form.promotion_value
  });
  const storedPromoPrice = resolvePromotionStoredPrice({
    type,
    referencePrice,
    fixedPrice: form.promotion_value,
    discountValue: form.promotion_value
  });

  if (resolvedPromoPrice == null || storedPromoPrice == null) {
    if (type === 'dos_por_uno' || type === 'tres_por_dos' || type === 'descuento_porcentaje' || type === 'descuento_valor') {
      throw new Error('El producto debe tener un precio base mayor que 0 para usar este tipo de promocion');
    }
    throw new Error('Introduce un precio promocional valido');
  }

  const basePayload = {
    puesto_id: puestoId,
    producto_id: Number(form.producto_id),
    titulo: form.titulo,
    descripcion: form.descripcion,
    tipo: type,
    activa: form.activa
  };

  if (type === 'precio_fijo') {
    return {
      ...basePayload,
      precio_promo: storedPromoPrice,
      valor_descuento: null
    };
  }

  if (type === 'descuento_porcentaje' || type === 'descuento_valor') {
    return {
      ...basePayload,
      precio_promo: storedPromoPrice,
      valor_descuento: Number(form.promotion_value)
    };
  }

  return {
    ...basePayload,
    precio_promo: storedPromoPrice,
    valor_descuento: null
  };
}

function PromotionValueField({
  form,
  setForm,
  selectedProduct
}: {
  form: PromotionFormState;
  setForm: Dispatch<SetStateAction<PromotionFormState>>;
  selectedProduct: ProductoOption | null;
}) {
  const selectedTypeOption = PROMOTION_TYPE_OPTIONS.find((item) => item.value === form.tipo);
  const referencePrice = getPromotionReferencePrice(selectedProduct || undefined);
  const bundle = getPromotionBundle(form.tipo);
  const previewPrice = resolvePromotionPreviewPrice({
    type: form.tipo,
    referencePrice,
    fixedPrice: form.promotion_value,
    discountValue: form.promotion_value
  });
  const previewUnitPrice = previewPrice == null
    ? null
    : Number((previewPrice / bundle.unitsPerPromotion).toFixed(2));
  const needsReferencePrice = form.tipo !== 'precio_fijo';

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#8B6650' }}>
          Tipo de promocion
        </label>
        <select
          value={form.tipo}
          onChange={(event) => setForm((current) => ({ ...current, tipo: normalizePromotionType(event.target.value) }))}
          className="w-full rounded-xl border px-3 py-3 text-sm font-semibold outline-none"
          style={{ backgroundColor: '#fff', borderColor: '#E8D5C0', color: '#2C1810' }}
        >
          {PROMOTION_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {selectedTypeOption?.needsNumericValue && (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#8B6650' }}>
            {selectedTypeOption.numericLabel}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.promotion_value}
            onChange={(event) => setForm((current) => ({ ...current, promotion_value: event.target.value }))}
            className="w-full rounded-xl border px-3 py-3 text-sm font-semibold outline-none"
            style={{ backgroundColor: '#fff', borderColor: '#E8D5C0', color: '#2C1810' }}
            placeholder={selectedTypeOption.numericPlaceholder}
            required
          />
        </div>
      )}

      {selectedProduct && (
        <div className="rounded-2xl border px-4 py-3 space-y-1.5" style={{ backgroundColor: '#FFF7ED', borderColor: '#F5D0A9', color: '#9A5B1F' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider">Vista previa</p>
          <p className="text-sm">Precio de referencia: {formatMoney(referencePrice)}</p>
          <p className="text-sm">{getPromotionSummary(form.tipo, form.promotion_value)}</p>
          {bundle.unitsPerPromotion > 1 && (
            <p className="text-sm">
              Pack de {bundle.unitsPerPromotion} unidades y se cobran {bundle.paidUnitsPerPromotion}.
            </p>
          )}
          <p className="text-sm font-bold">
            Precio total de la promo: {previewPrice == null
              ? (needsReferencePrice && referencePrice <= 0
                ? 'El producto necesita un precio base mayor que 0'
                : 'Completa el valor de la promocion')
              : formatMoney(previewPrice)}
          </p>
          {previewUnitPrice != null && bundle.unitsPerPromotion > 1 && (
            <p className="text-sm font-bold">
              Precio medio por unidad: {formatMoney(previewUnitPrice)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function PromotionsView({ festivalId, festivalNombre }: Props) {
  const [puestos, setPuestos] = useState<PuestoOption[]>([]);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [promociones, setPromociones] = useState<PromotionRecord[]>([]);
  const [selectedPuestoId, setSelectedPuestoId] = useState<string>('');
  const [form, setForm] = useState<PromotionFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<PromotionFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedProduct = useMemo(
    () => productos.find((producto) => String(producto.id) === form.producto_id) || null,
    [form.producto_id, productos]
  );

  const selectedEditProduct = useMemo(
    () => productos.find((producto) => String(producto.id) === editingForm.producto_id) || null,
    [editingForm.producto_id, productos]
  );

  const loadPuestos = useCallback(async () => {
    const data = await getMapaPuestos(festivalId);
    const normalized = Array.isArray(data) ? data : [];
    setPuestos(normalized);

    if (!selectedPuestoId && normalized.length > 0) {
      setSelectedPuestoId(String(normalized[0].id));
    }
  }, [festivalId, selectedPuestoId]);

  const loadCurrentScope = useCallback(async () => {
    if (!selectedPuestoId) {
      setProductos([]);
      setPromociones([]);
      return;
    }

    const puestoId = Number(selectedPuestoId);
    const [productosData, promocionesData] = await Promise.all([
      getProductos(puestoId),
      getGestorPromociones(festivalId, puestoId)
    ]);

    setProductos(Array.isArray(productosData) ? productosData : []);
    setPromociones(Array.isArray(promocionesData) ? promocionesData : []);
  }, [festivalId, selectedPuestoId]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await loadPuestos();
      if (selectedPuestoId) {
        await loadCurrentScope();
      }
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar los puestos del festival');
    } finally {
      setLoading(false);
    }
  }, [loadCurrentScope, loadPuestos, selectedPuestoId]);

  useEffect(() => {
    refreshAll();
  }, [festivalId, refreshAll]);

  useEffect(() => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setEditingForm(EMPTY_FORM);
  }, [selectedPuestoId]);

  useEffect(() => {
    if (!selectedPuestoId) return;

    let cancelled = false;
    setLoading(true);

    loadCurrentScope()
      .catch((error) => {
        console.error(error);
        toast.error('No se pudieron cargar los productos y promociones');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadCurrentScope, selectedPuestoId]);

  const syncPromoTitleFromProduct = (productId: string, target: 'create' | 'edit') => {
    const product = productos.find((item) => String(item.id) === productId);
    if (!product) return;

    if (target === 'create') {
      setForm((current) => current.titulo.trim()
        ? { ...current, producto_id: productId }
        : { ...current, producto_id: productId, titulo: `${product.nombre} promo` });
      return;
    }

    setEditingForm((current) => current.titulo.trim()
      ? { ...current, producto_id: productId }
      : { ...current, producto_id: productId, titulo: `${product.nombre} promo` });
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPuestoId) {
      toast.error('Selecciona un puesto para crear una promocion');
      return;
    }

    setSaving(true);
    try {
      await crearPromocionGestor(buildPromotionPayload(form, Number(selectedPuestoId), selectedProduct));
      toast.success('Promocion creada');
      setForm(EMPTY_FORM);
      await loadCurrentScope();
    } catch (error: any) {
      toast.error(error.message || 'No se pudo crear la promocion');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (promotion: PromotionRecord) => {
    setEditingId(promotion.id);
    setEditingForm({
      producto_id: promotion.producto_id == null ? '' : String(promotion.producto_id),
      titulo: promotion.titulo || '',
      descripcion: promotion.descripcion || '',
      tipo: normalizePromotionType(promotion.tipo),
      promotion_value: getInitialPromotionValue(promotion),
      activa: Boolean(promotion.activa)
    });
  };

  const handleSaveEdit = async (promotionId: number) => {
    if (!selectedPuestoId) return;

    setSaving(true);
    try {
      await actualizarPromocionGestor(promotionId, buildPromotionPayload(editingForm, Number(selectedPuestoId), selectedEditProduct));
      toast.success('Promocion actualizada');
      setEditingId(null);
      setEditingForm(EMPTY_FORM);
      await loadCurrentScope();
    } catch (error: any) {
      toast.error(error.message || 'No se pudo actualizar la promocion');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (promotion: PromotionRecord) => {
    if (!promotion.producto_id) {
      toast.error('Esta promocion necesita vincularse a un producto antes de activarse');
      return;
    }

    setSaving(true);
    try {
      await actualizarPromocionGestor(promotion.id, {
        activa: !promotion.activa
      });
      toast.success(promotion.activa ? 'Promocion desactivada' : 'Promocion activada');
      await loadCurrentScope();
    } catch (error: any) {
      toast.error(error.message || 'No se pudo cambiar el estado de la promocion');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (promotionId: number) => {
    if (!window.confirm('Eliminar esta promocion?')) return;

    setSaving(true);
    try {
      await eliminarPromocionGestor(promotionId);
      toast.success('Promocion eliminada');
      if (editingId === promotionId) {
        setEditingId(null);
        setEditingForm(EMPTY_FORM);
      }
      await loadCurrentScope();
    } catch (error: any) {
      toast.error(error.message || 'No se pudo eliminar la promocion');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#FDF6EE' }}>
      <div className="px-4 py-4 space-y-4 pb-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold flex items-center gap-2" style={{ color: '#2C1810' }}>
              <BadgePercent className="w-4 h-4" style={{ color: '#A67C52' }} />
              Ofertas y promociones
            </h2>
            <p className="text-[11px]" style={{ color: '#8B6650' }}>{festivalNombre}</p>
          </div>
          <button
            onClick={refreshAll}
            disabled={loading || saving}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-40"
            style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', color: '#A67C52' }}
          >
            <RefreshCw className={`w-3 h-3 ${(loading || saving) ? 'animate-spin' : ''}`} />
            Recargar
          </button>
        </div>

        <div className="rounded-2xl border p-4 space-y-4" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#8B6650' }}>
              Puesto
            </label>
            <select
              value={selectedPuestoId}
              onChange={(event) => setSelectedPuestoId(event.target.value)}
              className="w-full rounded-xl border px-3 py-3 text-sm font-semibold outline-none"
              style={{ backgroundColor: '#fff', borderColor: '#E8D5C0', color: '#2C1810' }}
            >
              <option value="">Selecciona un puesto</option>
              {puestos.map((puesto) => (
                <option key={puesto.id} value={puesto.id}>
                  {puesto.nombre} {puesto.abierto ? '(abierto)' : '(cerrado)'}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#8B6650' }}>
                  Producto asociado
                </label>
                <select
                  value={form.producto_id}
                  onChange={(event) => syncPromoTitleFromProduct(event.target.value, 'create')}
                  className="w-full rounded-xl border px-3 py-3 text-sm font-semibold outline-none"
                  style={{ backgroundColor: '#fff', borderColor: '#E8D5C0', color: '#2C1810' }}
                  disabled={!selectedPuestoId || productos.length === 0}
                  required
                >
                  <option value="">Selecciona un producto activo</option>
                  {productos.map((producto) => (
                    <option key={producto.id} value={producto.id}>
                      {producto.nombre} · {formatMoney(Number(producto.precio_dinamico) > 0 ? producto.precio_dinamico : producto.precio)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#8B6650' }}>
                  Titulo visible
                </label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))}
                  className="w-full rounded-xl border px-3 py-3 text-sm outline-none"
                  style={{ backgroundColor: '#fff', borderColor: '#E8D5C0', color: '#2C1810' }}
                  placeholder="Ej. Burger promo"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#8B6650' }}>
                  Descripcion
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))}
                  className="w-full rounded-xl border px-3 py-3 text-sm outline-none resize-none"
                  style={{ backgroundColor: '#fff', borderColor: '#E8D5C0', color: '#2C1810', minHeight: 88 }}
                  placeholder="Que incluye o por que merece la pena"
                />
              </div>

              <PromotionValueField
                form={form}
                setForm={setForm}
                selectedProduct={selectedProduct}
              />
            </div>

            <button
              type="submit"
              disabled={saving || !selectedPuestoId || productos.length === 0}
              className="w-full rounded-full py-3 text-sm font-bold text-white transition-opacity disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #C8956C, #A67C52)' }}
            >
              Crear promocion
            </button>
          </form>

          {selectedPuestoId && productos.length === 0 && !loading && (
            <div className="rounded-2xl border px-4 py-3 text-sm" style={{ backgroundColor: '#FFF7ED', borderColor: '#F5D0A9', color: '#9A5B1F' }}>
              Este puesto no tiene productos activos. Primero anade o reactiva productos para poder crear promociones que se puedan comprar.
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#C8956C' }}>
              Promociones del puesto
            </h3>
            <span className="text-[11px]" style={{ color: '#8B6650' }}>
              {promociones.length} registradas
            </span>
          </div>

          {loading ? (
            [...Array(3)].map((_, index) => (
              <div key={index} className="h-28 rounded-2xl animate-pulse" style={{ backgroundColor: '#FFF3E4' }} />
            ))
          ) : promociones.length === 0 ? (
            <div className="rounded-2xl border px-4 py-6 text-center text-sm" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0', color: '#8B6650' }}>
              Todavia no hay promociones configuradas para este puesto.
            </div>
          ) : promociones.map((promotion) => {
            const isEditing = editingId === promotion.id;
            const productMissing = !promotion.producto_id;
            const productInactive = promotion.producto_activo === false;
            const offerView = buildPromotionOffer(promotion);

            return (
              <div key={promotion.id} className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: '#FFF3E4', borderColor: '#E8D5C0' }}>
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-1 gap-3">
                      <select
                        value={editingForm.producto_id}
                        onChange={(event) => syncPromoTitleFromProduct(event.target.value, 'edit')}
                        className="w-full rounded-xl border px-3 py-3 text-sm font-semibold outline-none"
                        style={{ backgroundColor: '#fff', borderColor: '#E8D5C0', color: '#2C1810' }}
                        required
                      >
                        <option value="">Selecciona un producto activo</option>
                        {productos.map((producto) => (
                          <option key={producto.id} value={producto.id}>
                            {producto.nombre} · {formatMoney(Number(producto.precio_dinamico) > 0 ? producto.precio_dinamico : producto.precio)}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={editingForm.titulo}
                        onChange={(event) => setEditingForm((current) => ({ ...current, titulo: event.target.value }))}
                        className="w-full rounded-xl border px-3 py-3 text-sm outline-none"
                        style={{ backgroundColor: '#fff', borderColor: '#E8D5C0', color: '#2C1810' }}
                        required
                      />

                      <textarea
                        value={editingForm.descripcion}
                        onChange={(event) => setEditingForm((current) => ({ ...current, descripcion: event.target.value }))}
                        className="w-full rounded-xl border px-3 py-3 text-sm outline-none resize-none"
                        style={{ backgroundColor: '#fff', borderColor: '#E8D5C0', color: '#2C1810', minHeight: 84 }}
                      />

                      <PromotionValueField
                        form={editingForm}
                        setForm={setEditingForm}
                        selectedProduct={selectedEditProduct}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(promotion.id)}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold text-white disabled:opacity-40"
                        style={{ backgroundColor: '#4CAF88' }}
                      >
                        <Save className="w-4 h-4" />
                        Guardar
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingForm(EMPTY_FORM);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold"
                        style={{ backgroundColor: '#fff', border: '1px solid #E8D5C0', color: '#8B6650' }}
                      >
                        <XCircle className="w-4 h-4" />
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-extrabold" style={{ color: '#2C1810' }}>{promotion.titulo}</span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: promotion.activa ? '#D1FAE5' : '#FEE2E2',
                              color: promotion.activa ? '#065F46' : '#991B1B'
                            }}
                          >
                            {promotion.activa ? 'Activa' : 'Inactiva'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
                            {offerView.discount}
                          </span>
                          {productMissing && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                              Requiere producto
                            </span>
                          )}
                          {productInactive && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                              Producto inactivo
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm" style={{ color: '#8B6650' }}>
                          {promotion.descripcion || getPromotionSummary(promotion.tipo, promotion.valor_descuento)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold" style={{ color: '#A67C52' }}>{formatMoney(offerView.price)}</p>
                        <p className="text-[11px]" style={{ color: '#8B6650' }}>
                          {offerView.priceCaption}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl px-3 py-2" style={{ backgroundColor: '#fff' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#C8956C' }}>
                          Tipo
                        </p>
                        <p className="text-sm font-semibold" style={{ color: '#2C1810' }}>
                          {getPromotionTypeLabel(promotion.tipo)}
                        </p>
                      </div>
                      <div className="rounded-xl px-3 py-2" style={{ backgroundColor: '#fff' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#C8956C' }}>
                          Referencia
                        </p>
                        <p className="text-sm font-semibold" style={{ color: '#2C1810' }}>
                          {offerView.originalPrice == null ? '-' : formatMoney(offerView.originalPrice)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl px-3 py-2" style={{ backgroundColor: '#fff' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#C8956C' }}>
                        Producto
                      </p>
                      <p className="text-sm font-semibold" style={{ color: '#2C1810' }}>
                        {promotion.producto_nombre || 'Producto sin vincular'}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggle(promotion)}
                        disabled={saving || productMissing || productInactive}
                        className="flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold disabled:opacity-40"
                        style={{ backgroundColor: '#fff', border: '1px solid #E8D5C0', color: '#8B6650' }}
                      >
                        <Power className="w-4 h-4" />
                        {promotion.activa ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => handleStartEdit(promotion)}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold text-white disabled:opacity-40"
                        style={{ backgroundColor: '#A67C52' }}
                      >
                        <Pencil className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(promotion.id)}
                        disabled={saving}
                        className="w-12 flex items-center justify-center rounded-full text-white disabled:opacity-40"
                        style={{ backgroundColor: '#D97706' }}
                        aria-label={`Eliminar promocion ${promotion.titulo}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border px-4 py-3 text-[11px]" style={{ backgroundColor: '#FFF7ED', borderColor: '#F5D0A9', color: '#9A5B1F' }}>
          Las promociones ahora pueden ser de precio fijo, 2x1, 3x2, descuento porcentual o descuento en valor, y siempre quedan enlazadas a un producto activo para respetar el precio real tambien en el pago.
        </div>
      </div>
    </div>
  );
}
