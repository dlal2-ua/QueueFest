const PROMOTION_TYPES = {
  FIXED_PRICE: 'precio_fijo',
  TWO_FOR_ONE: 'dos_por_uno',
  THREE_FOR_TWO: 'tres_por_dos',
  PERCENT_DISCOUNT: 'descuento_porcentaje',
  VALUE_DISCOUNT: 'descuento_valor'
};

function roundCurrency(value) {
  return Math.round(Number(value) * 100) / 100;
}

function normalizePromotionType(type) {
  const normalized = String(type || '').trim().toLowerCase();

  switch (normalized) {
    case '2x1':
    case PROMOTION_TYPES.TWO_FOR_ONE:
      return PROMOTION_TYPES.TWO_FOR_ONE;
    case '3x2':
    case PROMOTION_TYPES.THREE_FOR_TWO:
      return PROMOTION_TYPES.THREE_FOR_TWO;
    case PROMOTION_TYPES.PERCENT_DISCOUNT:
      return PROMOTION_TYPES.PERCENT_DISCOUNT;
    case PROMOTION_TYPES.VALUE_DISCOUNT:
      return PROMOTION_TYPES.VALUE_DISCOUNT;
    case PROMOTION_TYPES.FIXED_PRICE:
    default:
      return PROMOTION_TYPES.FIXED_PRICE;
  }
}

function getPromotionBundle(type) {
  const normalizedType = normalizePromotionType(type);

  switch (normalizedType) {
    case PROMOTION_TYPES.TWO_FOR_ONE:
      return { unitsPerApplication: 2, paidUnitsPerApplication: 1 };
    case PROMOTION_TYPES.THREE_FOR_TWO:
      return { unitsPerApplication: 3, paidUnitsPerApplication: 2 };
    default:
      return { unitsPerApplication: 1, paidUnitsPerApplication: 1 };
  }
}

function getReferencePrice(product) {
  if (!product) return 0;

  const dynamicPrice = Number(product.precio_dinamico);
  const basePrice = Number(product.precio);
  const reference = Number.isFinite(dynamicPrice) && dynamicPrice > 0 ? dynamicPrice : basePrice;

  return Number.isFinite(reference) ? roundCurrency(reference) : 0;
}

function resolvePromotionPricing({
  type,
  referencePrice,
  fixedPrice,
  discountValue
}) {
  const normalizedType = normalizePromotionType(type);
  const numericReferencePrice = roundCurrency(referencePrice);
  const numericFixedPrice = Number(fixedPrice);
  const numericDiscountValue = Number(discountValue);
  const bundle = getPromotionBundle(normalizedType);

  if (!Number.isFinite(numericReferencePrice) || numericReferencePrice <= 0) {
    throw new Error('El producto debe tener un precio de referencia valido');
  }

  if (normalizedType === PROMOTION_TYPES.FIXED_PRICE) {
    if (!Number.isFinite(numericFixedPrice) || numericFixedPrice <= 0) {
      throw new Error('precio_promo invalido');
    }

    if (numericFixedPrice > numericReferencePrice) {
      throw new Error(`El precio promocional no puede superar ${numericReferencePrice.toFixed(2)} EUR`);
    }

    return {
      tipo: normalizedType,
      valor_descuento: null,
      precio_promo: roundCurrency(numericFixedPrice),
      precio_total_promocion: roundCurrency(numericFixedPrice),
      ...bundle
    };
  }

  if (normalizedType === PROMOTION_TYPES.PERCENT_DISCOUNT) {
    if (!Number.isFinite(numericDiscountValue) || numericDiscountValue <= 0 || numericDiscountValue >= 100) {
      throw new Error('El descuento porcentual debe estar entre 0 y 100');
    }

    const promoPrice = roundCurrency(numericReferencePrice * (1 - (numericDiscountValue / 100)));
    if (promoPrice <= 0) {
      throw new Error('El descuento porcentual deja la promocion sin precio valido');
    }

    return {
      tipo: normalizedType,
      valor_descuento: roundCurrency(numericDiscountValue),
      precio_promo: promoPrice,
      precio_total_promocion: promoPrice,
      ...bundle
    };
  }

  if (normalizedType === PROMOTION_TYPES.VALUE_DISCOUNT) {
    if (!Number.isFinite(numericDiscountValue) || numericDiscountValue <= 0) {
      throw new Error('El descuento en valor debe ser mayor que 0');
    }

    if (numericDiscountValue >= numericReferencePrice) {
      throw new Error(`El descuento en valor debe ser menor que ${numericReferencePrice.toFixed(2)} EUR`);
    }

    return {
      tipo: normalizedType,
      valor_descuento: roundCurrency(numericDiscountValue),
      precio_promo: roundCurrency(numericReferencePrice - numericDiscountValue),
      precio_total_promocion: roundCurrency(numericReferencePrice - numericDiscountValue),
      ...bundle
    };
  }

  return {
    tipo: normalizedType,
    valor_descuento: null,
    precio_promo: roundCurrency((numericReferencePrice * bundle.paidUnitsPerApplication) / bundle.unitsPerApplication),
    precio_total_promocion: roundCurrency(numericReferencePrice * bundle.paidUnitsPerApplication),
    ...bundle
  };
}

module.exports = {
  PROMOTION_TYPES,
  normalizePromotionType,
  getPromotionBundle,
  getReferencePrice,
  resolvePromotionPricing,
  roundCurrency
};
