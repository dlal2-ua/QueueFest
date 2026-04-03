export interface FavoriteProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  image: string;
  vendorId: string;
  vendorName: string;
  vendorType: 'food-truck' | 'bar';
}

const FAVORITE_PRODUCTS_STORAGE_KEY = 'favoriteProducts';

const PRODUCT_IMAGE_LIBRARY = {
  beer: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80',
  cocktail: 'https://images.unsplash.com/photo-1514362545857-3bc36c4c7d1b?auto=format&fit=crop&w=1200&q=80',
  burrito: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=1200&q=80',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
  fries: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=1200&q=80',
  genericFood: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
  genericDrink: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=80'
};

export function getProductImage(productName: string, vendorType: 'food-truck' | 'bar'): string {
  const normalizedName = productName.toLowerCase();

  if (normalizedName.includes('cerveza') || normalizedName.includes('beer')) {
    return PRODUCT_IMAGE_LIBRARY.beer;
  }
  if (
    normalizedName.includes('cocktail') ||
    normalizedName.includes('mojito') ||
    normalizedName.includes('cubata') ||
    normalizedName.includes('gin')
  ) {
    return PRODUCT_IMAGE_LIBRARY.cocktail;
  }
  if (normalizedName.includes('burrito') || normalizedName.includes('taco') || normalizedName.includes('wrap')) {
    return PRODUCT_IMAGE_LIBRARY.burrito;
  }
  if (normalizedName.includes('burger') || normalizedName.includes('hamburg')) {
    return PRODUCT_IMAGE_LIBRARY.burger;
  }
  if (normalizedName.includes('pizza')) {
    return PRODUCT_IMAGE_LIBRARY.pizza;
  }
  if (normalizedName.includes('patata') || normalizedName.includes('fries')) {
    return PRODUCT_IMAGE_LIBRARY.fries;
  }

  return vendorType === 'bar' ? PRODUCT_IMAGE_LIBRARY.genericDrink : PRODUCT_IMAGE_LIBRARY.genericFood;
}

export function getFavoriteProducts(): FavoriteProduct[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(FAVORITE_PRODUCTS_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as FavoriteProduct[]) : [];
  } catch {
    return [];
  }
}

export function isProductFavorite(productId: string): boolean {
  return getFavoriteProducts().some((product) => product.id === productId);
}

export function toggleFavoriteProduct(product: FavoriteProduct): boolean {
  const currentFavorites = getFavoriteProducts();
  const isFavorite = currentFavorites.some((item) => item.id === product.id);

  const updatedFavorites = isFavorite
    ? currentFavorites.filter((item) => item.id !== product.id)
    : [product, ...currentFavorites];

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(FAVORITE_PRODUCTS_STORAGE_KEY, JSON.stringify(updatedFavorites));
  }

  return !isFavorite;
}
