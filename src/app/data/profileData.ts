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

export interface RoyaltyThresholds {
  vip: number;
  headliner: number;
  backstage: number;
}

interface RoyaltyTier {
  name: string;
  min: number;
  nextTarget: number | null;
}

const USER_PROFILE_STORAGE_KEY = 'userProfile';
export const ROYALTY_REDEEM_RATE = 100; // 100 puntos = 1€
export const ROYALTY_REDEEM_VALUE = 1;
export const ROYALTY_POINTS_PER_EURO = 100;
export const ROYALTY_WELCOME_BONUS = 1000;
export const DEFAULT_ROYALTY_THRESHOLDS: RoyaltyThresholds = {
  vip: 10000,
  headliner: 25000,
  backstage: 50000
};

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

export function normalizeRoyaltyThresholds(thresholds?: Partial<RoyaltyThresholds>): RoyaltyThresholds {
  const vip = Math.max(1000, Number(thresholds?.vip ?? DEFAULT_ROYALTY_THRESHOLDS.vip));
  const headliner = Math.max(vip + 1000, Number(thresholds?.headliner ?? DEFAULT_ROYALTY_THRESHOLDS.headliner));
  const backstage = Math.max(headliner + 1000, Number(thresholds?.backstage ?? DEFAULT_ROYALTY_THRESHOLDS.backstage));
  return { vip, headliner, backstage };
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

export function calculateRoyaltiesForPurchase(total: number): number {
  if (total <= 0) return 0;
  return Math.round(total * ROYALTY_POINTS_PER_EURO);
}

export function getRoyaltyTierStatus(balance: number, thresholds?: Partial<RoyaltyThresholds>) {
  const resolved = normalizeRoyaltyThresholds(thresholds);
  const royaltyTiers: RoyaltyTier[] = [
    { name: 'Fan', min: 0, nextTarget: resolved.vip },
    { name: 'VIP', min: resolved.vip, nextTarget: resolved.headliner },
    { name: 'Headliner', min: resolved.headliner, nextTarget: resolved.backstage },
    { name: 'Backstage', min: resolved.backstage, nextTarget: null }
  ];
  const tier = [...royaltyTiers].reverse().find((item) => balance >= item.min) ?? royaltyTiers[0];
  const nextTarget = tier.nextTarget ?? tier.min;
  const nextTier = royaltyTiers.find((item) => item.min === tier.nextTarget)?.name ?? tier.name;

  return {
    currentTier: tier.name,
    nextTier,
    currentTierMin: tier.min,
    nextTierTarget: nextTarget
  };
}

export function getRoyaltyProgress(balance: number, thresholds?: Partial<RoyaltyThresholds>): number {
  const tierStatus = getRoyaltyTierStatus(balance, thresholds);

  if (tierStatus.nextTierTarget === tierStatus.currentTierMin) {
    return 100;
  }

  return Math.min(
    100,
    Math.round(((balance - tierStatus.currentTierMin) / (tierStatus.nextTierTarget - tierStatus.currentTierMin)) * 100)
  );
}

export function getRoyaltiesToNextTier(balance: number, thresholds?: Partial<RoyaltyThresholds>): number {
  const tierStatus = getRoyaltyTierStatus(balance, thresholds);
  return Math.max(0, tierStatus.nextTierTarget - balance);
}
