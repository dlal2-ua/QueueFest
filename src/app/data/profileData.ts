export interface UserProfile {
  fullName: string;
  displayName: string;
  email: string;
  phone: string;
  birthDate: string;
  city: string;
  favoriteFestival: string;
  preferredLanguage: string;
  dietaryPreferences: string;
  allergies: string;
  notifications: string;
  marketingConsent: string;
  memberSince: string;
}

export interface RoyaltyRule {
  title: string;
  description: string;
}

export interface RoyaltyMovement {
  id: string;
  title: string;
  description: string;
  date: string;
  amount: number;
  status: 'credited' | 'pending' | 'redeemed';
}

export interface RoyaltyProgram {
  balance: number;
  pending: number;
  lifetimeEarned: number;
  redeemRate: number;
  redeemValue: number;
  benefits: string[];
  earnRules: RoyaltyRule[];
  movements: RoyaltyMovement[];
}

interface RoyaltyTier {
  name: string;
  min: number;
  nextTarget: number | null;
}

const USER_PROFILE_STORAGE_KEY = 'userProfile';
const USER_ROYALTIES_STORAGE_KEY = 'userRoyalties';

const ROYALTY_TIERS: RoyaltyTier[] = [
  { name: 'Fan', min: 0, nextTarget: 250 },
  { name: 'VIP', min: 250, nextTarget: 750 },
  { name: 'Headliner', min: 750, nextTarget: 1500 },
  { name: 'Backstage', min: 1500, nextTarget: null }
];

export const defaultUserProfile: UserProfile = {
  fullName: 'Juan Perez',
  displayName: 'juan.queue',
  email: 'juan.perez@email.com',
  phone: '+34 612 345 678',
  birthDate: '14/08/1999',
  city: 'Alicante',
  favoriteFestival: 'Mediterranea Sound 2026',
  preferredLanguage: 'Espanol',
  dietaryPreferences: 'Vegetariano flexible',
  allergies: 'Sin gluten',
  notifications: 'Avisos push para pedidos, promociones y cambios de cola',
  marketingConsent: 'Solo novedades del festival y ofertas relevantes',
  memberSince: 'Junio 2025'
};

export const defaultRoyaltyProgram: RoyaltyProgram = {
  balance: 480,
  pending: 35,
  lifetimeEarned: 1280,
  redeemRate: 100,
  redeemValue: 5,
  benefits: [
    'Descuentos directos en futuras compras dentro del festival.',
    'Acceso prioritario a promociones flash y menus especiales.',
    'Nivel superior con ventajas exclusivas al seguir comprando.'
  ],
  earnRules: [
    {
      title: 'Compra completada',
      description: 'Gana 1 royalty por cada euro gastado y un bonus fijo de 5 por pedido.'
    },
    {
      title: 'Pedidos recurrentes',
      description: 'El segundo pedido del dia te ayuda a acelerar el acceso al siguiente nivel.'
    },
    {
      title: 'Ofertas especiales',
      description: 'Algunas activaciones del festival multiplicaran temporalmente los royalties obtenidos.'
    }
  ],
  movements: [
    {
      id: 'welcome-bonus',
      title: 'Bonus de bienvenida',
      description: 'Alta inicial en QueueFest Rewards',
      date: '2026-03-30T10:00:00.000Z',
      amount: 150,
      status: 'credited'
    },
    {
      id: 'order-1842',
      title: 'Pedido #1842',
      description: 'Compra completada en Taco Arena',
      date: '2026-04-01T21:35:00.000Z',
      amount: 42,
      status: 'credited'
    },
    {
      id: 'order-1846',
      title: 'Pedido #1846',
      description: 'Compra completada en Sunset Cocktails',
      date: '2026-04-02T18:10:00.000Z',
      amount: 35,
      status: 'pending'
    },
    {
      id: 'redeem-41',
      title: 'Canje de saldo',
      description: 'Descuento aplicado en menu premium',
      date: '2026-04-02T19:20:00.000Z',
      amount: -100,
      status: 'redeemed'
    }
  ]
};

function readStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getStringValue(...values: Array<unknown>): string | undefined {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0) as string | undefined;
}

export function getUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  const stored = readStorage<Partial<UserProfile> & { name?: string }>(USER_PROFILE_STORAGE_KEY) ?? {};
  const fullName = getStringValue(overrides.fullName, stored.fullName, stored.name, defaultUserProfile.fullName) ?? defaultUserProfile.fullName;
  const displayName =
    getStringValue(overrides.displayName, stored.displayName, fullName.split(' ')[0], defaultUserProfile.displayName) ??
    defaultUserProfile.displayName;

  return {
    ...defaultUserProfile,
    ...stored,
    ...overrides,
    fullName,
    displayName,
    email: getStringValue(overrides.email, stored.email, defaultUserProfile.email) ?? defaultUserProfile.email,
    phone: getStringValue(overrides.phone, stored.phone, defaultUserProfile.phone) ?? defaultUserProfile.phone,
    birthDate: getStringValue(overrides.birthDate, stored.birthDate, defaultUserProfile.birthDate) ?? defaultUserProfile.birthDate,
    city: getStringValue(overrides.city, stored.city, defaultUserProfile.city) ?? defaultUserProfile.city,
    favoriteFestival:
      getStringValue(overrides.favoriteFestival, stored.favoriteFestival, defaultUserProfile.favoriteFestival) ??
      defaultUserProfile.favoriteFestival,
    preferredLanguage:
      getStringValue(overrides.preferredLanguage, stored.preferredLanguage, defaultUserProfile.preferredLanguage) ??
      defaultUserProfile.preferredLanguage,
    dietaryPreferences:
      getStringValue(overrides.dietaryPreferences, stored.dietaryPreferences, defaultUserProfile.dietaryPreferences) ??
      defaultUserProfile.dietaryPreferences,
    allergies: getStringValue(overrides.allergies, stored.allergies, defaultUserProfile.allergies) ?? defaultUserProfile.allergies,
    notifications:
      getStringValue(overrides.notifications, stored.notifications, defaultUserProfile.notifications) ??
      defaultUserProfile.notifications,
    marketingConsent:
      getStringValue(overrides.marketingConsent, stored.marketingConsent, defaultUserProfile.marketingConsent) ??
      defaultUserProfile.marketingConsent,
    memberSince: getStringValue(overrides.memberSince, stored.memberSince, defaultUserProfile.memberSince) ?? defaultUserProfile.memberSince
  };
}

export function getRoyaltyProgram(): RoyaltyProgram {
  const stored = readStorage<Partial<RoyaltyProgram>>(USER_ROYALTIES_STORAGE_KEY) ?? {};

  return {
    ...defaultRoyaltyProgram,
    ...stored,
    benefits: Array.isArray(stored.benefits) ? stored.benefits : defaultRoyaltyProgram.benefits,
    earnRules: Array.isArray(stored.earnRules) ? stored.earnRules : defaultRoyaltyProgram.earnRules,
    movements: Array.isArray(stored.movements) ? stored.movements : defaultRoyaltyProgram.movements
  };
}

export function saveRoyaltyProgram(program: RoyaltyProgram) {
  writeStorage(USER_ROYALTIES_STORAGE_KEY, program);
}

export function calculateRoyaltiesForPurchase(total: number): number {
  if (total <= 0) return 0;
  return Math.floor(total) + 5;
}

export function getRoyaltyTierStatus(balance: number) {
  const tier = [...ROYALTY_TIERS].reverse().find((item) => balance >= item.min) ?? ROYALTY_TIERS[0];
  const nextTarget = tier.nextTarget ?? tier.min;
  const nextTier = ROYALTY_TIERS.find((item) => item.min === tier.nextTarget)?.name ?? tier.name;

  return {
    currentTier: tier.name,
    nextTier,
    currentTierMin: tier.min,
    nextTierTarget: nextTarget
  };
}

export function getRoyaltyProgress(balance: number): number {
  const tierStatus = getRoyaltyTierStatus(balance);

  if (tierStatus.nextTierTarget === tierStatus.currentTierMin) {
    return 100;
  }

  return Math.min(
    100,
    Math.round(((balance - tierStatus.currentTierMin) / (tierStatus.nextTierTarget - tierStatus.currentTierMin)) * 100)
  );
}

export function getRoyaltiesToNextTier(balance: number): number {
  const tierStatus = getRoyaltyTierStatus(balance);
  return Math.max(0, tierStatus.nextTierTarget - balance);
}

export function applyRoyaltyReward(params: { orderNumber: string; total: number; vendorName?: string }) {
  const reward = calculateRoyaltiesForPurchase(params.total);
  if (!params.orderNumber || reward <= 0) {
    return getRoyaltyProgram();
  }

  const program = getRoyaltyProgram();
  const movementId = `order-${params.orderNumber}`;

  if (program.movements.some((movement) => movement.id === movementId)) {
    return program;
  }

  const updatedProgram: RoyaltyProgram = {
    ...program,
    balance: program.balance + reward,
    lifetimeEarned: program.lifetimeEarned + reward,
    movements: [
      {
        id: movementId,
        title: `Pedido #${params.orderNumber}`,
        description: params.vendorName ? `Compra completada en ${params.vendorName}` : 'Compra completada en QueueFest',
        date: new Date().toISOString(),
        amount: reward,
        status: 'credited'
      },
      ...program.movements
    ].slice(0, 10)
  };

  saveRoyaltyProgram(updatedProgram);
  return updatedProgram;
}
