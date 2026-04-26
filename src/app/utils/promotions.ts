import type { PromotionRecord, PromotionType } from '../api';

export interface PromotionOfferView {
  id: string;
  promotionId: string;
  productId: string;
  title: string;
  description: string;
  price: number;
  discount: string;
  originalPrice?: number;
  priceCaption?: string;
  promotionType: PromotionType;
  unitsPerPromotion: number;
}

export const PROMOTION_TYPE_OPTIONS: Array<{
  value: PromotionType;
  label: string;
  needsNumericValue: boolean;
  numericLabel?: string;
  numericPlaceholder?: string;
}> = [
  {
    value: 'precio_fijo',
    label: 'Precio fijo',
    needsNumericValue: true,
    numericLabel: 'Precio promocional',
    numericPlaceholder: '0.00'
  },
  {
    value: 'dos_por_uno',
    label: '2x1',
    needsNumericValue: false
  },
  {
    value: 'tres_por_dos',
    label: '3x2',
    needsNumericValue: false
  },
  {
    value: 'descuento_porcentaje',
    label: 'Descuento %',
    needsNumericValue: true,
    numericLabel: 'Descuento (%)',
    numericPlaceholder: '10'
  },
  {
    value: 'descuento_valor',
    label: 'Descuento en valor',
    needsNumericValue: true,
    numericLabel: 'Descuento (EUR)',
    numericPlaceholder: '1.50'
  }
];

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function formatCompactNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatMoneyLabel(value: number) {
  return `${roundCurrency(value).toFixed(2)} EUR`;
}

export function normalizePromotionType(type?: string | null): PromotionType {
  switch (String(type || '').trim().toLowerCase()) {
    case '2x1':
    case 'dos_por_uno':
      return 'dos_por_uno';
    case '3x2':
    case 'tres_por_dos':
      return 'tres_por_dos';
    case 'descuento_porcentaje':
      return 'descuento_porcentaje';
    case 'descuento_valor':
      return 'descuento_valor';
    case 'precio_fijo':
    default:
      return 'precio_fijo';
  }
}

export function getPromotionBundle(type?: string | null) {
  const normalizedType = normalizePromotionType(type);

  switch (normalizedType) {
    case 'dos_por_uno':
      return { unitsPerPromotion: 2, paidUnitsPerPromotion: 1 };
    case 'tres_por_dos':
      return { unitsPerPromotion: 3, paidUnitsPerPromotion: 2 };
    default:
      return { unitsPerPromotion: 1, paidUnitsPerPromotion: 1 };
  }
}

export function getPromotionTypeLabel(type?: string | null) {
  const normalizedType = normalizePromotionType(type);
  const option = PROMOTION_TYPE_OPTIONS.find((item) => item.value === normalizedType);
  return option?.label || 'Promocion';
}

export function getPromotionReferencePrice(source: {
  precio?: number | null;
  precio_dinamico?: number | null;
  producto_precio?: number | null;
  producto_precio_dinamico?: number | null;
} | null | undefined) {
  if (!source) return 0;

  const dynamicPrice = Number(
    source.producto_precio_dinamico ?? source.precio_dinamico ?? 0
  );
  const basePrice = Number(
    source.producto_precio ?? source.precio ?? 0
  );

  return roundCurrency(dynamicPrice > 0 ? dynamicPrice : basePrice);
}

export function resolvePromotionPreviewPrice({
  type,
  referencePrice,
  fixedPrice,
  discountValue
}: {
  type?: string | null;
  referencePrice: number;
  fixedPrice?: string | number | null;
  discountValue?: string | number | null;
}) {
  const normalizedType = normalizePromotionType(type);
  const numericReferencePrice = Number(referencePrice);
  const numericFixedPrice = Number(fixedPrice);
  const numericDiscountValue = Number(discountValue);
  const bundle = getPromotionBundle(normalizedType);

  if (!Number.isFinite(numericReferencePrice) || numericReferencePrice <= 0) {
    return null;
  }

  if (normalizedType === 'precio_fijo') {
    if (!Number.isFinite(numericFixedPrice) || numericFixedPrice <= 0) return null;
    return roundCurrency(numericFixedPrice);
  }

  if (normalizedType === 'descuento_porcentaje') {
    if (!Number.isFinite(numericDiscountValue) || numericDiscountValue <= 0 || numericDiscountValue >= 100) {
      return null;
    }
    return roundCurrency(numericReferencePrice * (1 - (numericDiscountValue / 100)));
  }

  if (normalizedType === 'descuento_valor') {
    if (!Number.isFinite(numericDiscountValue) || numericDiscountValue <= 0 || numericDiscountValue >= numericReferencePrice) {
      return null;
    }
    return roundCurrency(numericReferencePrice - numericDiscountValue);
  }

  return roundCurrency(numericReferencePrice * bundle.paidUnitsPerPromotion);
}

export function resolvePromotionStoredPrice({
  type,
  referencePrice,
  fixedPrice,
  discountValue
}: {
  type?: string | null;
  referencePrice: number;
  fixedPrice?: string | number | null;
  discountValue?: string | number | null;
}) {
  const normalizedType = normalizePromotionType(type);
  const previewPrice = resolvePromotionPreviewPrice({ type, referencePrice, fixedPrice, discountValue });
  const bundle = getPromotionBundle(normalizedType);

  if (previewPrice == null) return null;

  if (normalizedType === 'dos_por_uno' || normalizedType === 'tres_por_dos') {
    return roundCurrency(previewPrice / bundle.unitsPerPromotion);
  }

  return previewPrice;
}

export function getPromotionBadge(type?: string | null, discountValue?: number | string | null) {
  const normalizedType = normalizePromotionType(type);
  const numericDiscountValue = Number(discountValue);

  switch (normalizedType) {
    case 'dos_por_uno':
      return '2x1';
    case 'tres_por_dos':
      return '3x2';
    case 'descuento_porcentaje':
      return Number.isFinite(numericDiscountValue) ? `-${formatCompactNumber(numericDiscountValue)}%` : 'DESCUENTO';
    case 'descuento_valor':
      return Number.isFinite(numericDiscountValue) ? `-${formatCompactNumber(numericDiscountValue)} EUR` : 'DESCUENTO';
    default:
      return 'PROMO';
  }
}

export function getPromotionSummary(type?: string | null, discountValue?: number | string | null) {
  const normalizedType = normalizePromotionType(type);
  const numericDiscountValue = Number(discountValue);

  switch (normalizedType) {
    case 'dos_por_uno':
      return 'Llevas 2 unidades y pagas 1.';
    case 'tres_por_dos':
      return 'Llevas 3 unidades y pagas 2.';
    case 'descuento_porcentaje':
      return Number.isFinite(numericDiscountValue)
        ? `${formatCompactNumber(numericDiscountValue)}% de descuento sobre el precio actual.`
        : 'Descuento porcentual sobre el precio actual.';
    case 'descuento_valor':
      return Number.isFinite(numericDiscountValue)
        ? `${formatCompactNumber(numericDiscountValue)} EUR menos sobre el precio actual.`
        : 'Descuento fijo sobre el precio actual.';
    default:
      return 'Precio especial por unidad.';
  }
}

export function getPromotionOfferUnitPrice(offer: Pick<PromotionOfferView, 'price' | 'unitsPerPromotion'>) {
  return roundCurrency(Number(offer.price) / Math.max(Number(offer.unitsPerPromotion) || 1, 1));
}

export function buildPromotionOffer(promotion: PromotionRecord): PromotionOfferView {
  const type = normalizePromotionType(promotion.tipo);
  const bundle = getPromotionBundle(type);
  const promotionTotalPrice = Number(promotion.precio_promo);
  const referenceUnitPrice = getPromotionReferencePrice(promotion);
  const totalReferencePrice = referenceUnitPrice > 0
    ? roundCurrency(referenceUnitPrice * bundle.unitsPerPromotion)
    : undefined;
  const summary = getPromotionSummary(type, promotion.valor_descuento);
  const effectiveUnitPrice = bundle.unitsPerPromotion > 1
    ? getPromotionOfferUnitPrice({ price: promotionTotalPrice, unitsPerPromotion: bundle.unitsPerPromotion })
    : undefined;
  const description = [promotion.descripcion?.trim(), summary]
    .filter(Boolean)
    .join(' ');

  return {
    id: `promo-${promotion.id}`,
    promotionId: String(promotion.id),
    productId: String(promotion.producto_id),
    title: promotion.titulo,
    description,
    price: promotionTotalPrice,
    discount: getPromotionBadge(type, promotion.valor_descuento),
    originalPrice: totalReferencePrice != null && totalReferencePrice > promotionTotalPrice
      ? totalReferencePrice
      : undefined,
    priceCaption: bundle.unitsPerPromotion > 1
      ? `${bundle.unitsPerPromotion} unidades por promo · ${formatMoneyLabel(effectiveUnitPrice || 0)}/unidad`
      : undefined,
    promotionType: type,
    unitsPerPromotion: bundle.unitsPerPromotion
  };
}

export function getBestPromotionForProduct(promotions: PromotionRecord[], productId: string | number | null | undefined) {
  const normalizedProductId = String(productId ?? '');
  const matchingOffers = promotions
    .filter((promotion) => String(promotion.producto_id) === normalizedProductId)
    .map(buildPromotionOffer);

  if (matchingOffers.length === 0) return null;

  return matchingOffers.sort((left, right) => {
    const leftUnitPrice = getPromotionOfferUnitPrice(left);
    const rightUnitPrice = getPromotionOfferUnitPrice(right);
    if (leftUnitPrice !== rightUnitPrice) return leftUnitPrice - rightUnitPrice;
    return left.price - right.price;
  })[0];
}

