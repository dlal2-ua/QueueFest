export function formatPrice(price: number | string | null | undefined): string {
  const numericPrice = Number(price);
  const safePrice = Number.isFinite(numericPrice) ? numericPrice : 0;
  return `${safePrice.toFixed(2).replace('.', ',')} €`;
}
