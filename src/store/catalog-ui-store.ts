import { create } from 'zustand';
import { getCurrentCustomer } from '@/lib/customer-auth';
import {
  clearCustomerCart,
  removeCustomerCartItem,
  upsertCustomerCartItem,
} from '@/lib/customer-account-service';

export type CartItem = {
  productId: string;
  quantity: number;
};

type CatalogUIState = {
  favorites: string[];
  compare: string[];
  cart: CartItem[];

  toggleFavorite: (id: string) => void;
  toggleCompare: (id: string) => void;

  addToCart: (id: string, quantity?: number) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  setCartQuantity: (id: string, quantity: number) => Promise<void>;
  replaceCart: (cart: CartItem[]) => void;
  syncCartWithExistingIds: (existingIds: string[]) => void;
  clearCart: () => Promise<void>;

  isFavorite: (id: string) => boolean;
  isInCompare: (id: string) => boolean;
  isInCart: (id: string) => boolean;
  getCartQuantity: (id: string) => number;
  getCartItemsCount: () => number;
  getCartUnitsCount: () => number;

  loadFromStorage: () => void;
  clearCompare: () => void;
};

const LS_FAV = 'catalog_favorites';
const LS_COMPARE = 'catalog_compare';
const LS_CART = 'catalog_cart';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function saveFavorites(favorites: string[]) {
  if (!isBrowser()) return;
  localStorage.setItem(LS_FAV, JSON.stringify(favorites));
}

function saveCompare(compare: string[]) {
  if (!isBrowser()) return;
  localStorage.setItem(LS_COMPARE, JSON.stringify(compare));
}

function saveCart(cart: CartItem[]) {
  if (!isBrowser()) return;
  localStorage.setItem(LS_CART, JSON.stringify(cart));
}

function uniqueIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  );
}

function normalizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  const result: CartItem[] = [];
  const seen = new Map<string, number>();

  for (const rawItem of value) {
    if (!rawItem || typeof rawItem !== 'object') continue;

    const productId =
      typeof (rawItem as { productId?: unknown }).productId === 'string'
        ? (rawItem as { productId: string }).productId.trim()
        : '';

    const quantityRaw =
      typeof (rawItem as { quantity?: unknown }).quantity === 'number'
        ? (rawItem as { quantity: number }).quantity
        : Number((rawItem as { quantity?: unknown }).quantity);

    if (!productId) continue;
    if (!Number.isFinite(quantityRaw)) continue;

    const quantity = Math.max(1, Math.floor(quantityRaw));
    seen.set(productId, (seen.get(productId) || 0) + quantity);
  }

  for (const [productId, quantity] of seen.entries()) {
    result.push({ productId, quantity });
  }

  return result;
}

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const customer = await getCurrentCustomer();
    return customer?.id || null;
  } catch (error) {
    console.error('Failed to resolve current customer in cart store:', error);
    return null;
  }
}

export const useCatalogUI = create<CatalogUIState>((set, get) => ({
  favorites: [],
  compare: [],
  cart: [],

  toggleFavorite: (id) => {
    const normalizedId = String(id || '').trim();
    if (!normalizedId) return;

    const current = get().favorites;
    const next = current.includes(normalizedId)
      ? current.filter((x) => x !== normalizedId)
      : [...current, normalizedId];

    saveFavorites(next);
    set({ favorites: next });
  },

  toggleCompare: (id) => {
    const normalizedId = String(id || '').trim();
    if (!normalizedId) return;

    const current = get().compare;
    let next: string[];

    if (current.includes(normalizedId)) {
      next = current.filter((x) => x !== normalizedId);
    } else {
      if (current.length >= 4) return;
      next = [...current, normalizedId];
    }

    saveCompare(next);
    set({ compare: next });
  },

  addToCart: async (id, quantity = 1) => {
    const normalizedId = String(id || '').trim();
    if (!normalizedId) return;

    const safeQuantity = Math.max(1, Math.floor(quantity));
    const current = get().cart;
    const existing = current.find((item) => item.productId === normalizedId);

    let next: CartItem[];

    if (existing) {
      next = current.map((item) =>
        item.productId === normalizedId
          ? { ...item, quantity: item.quantity + safeQuantity }
          : item
      );
    } else {
      next = [...current, { productId: normalizedId, quantity: safeQuantity }];
    }

    saveCart(next);
    set({ cart: next });

    try {
      const userId = await getAuthenticatedUserId();
      if (!userId) return;

      const nextItem = next.find((item) => item.productId === normalizedId);
      if (!nextItem) return;

      await upsertCustomerCartItem({
        userId,
        productId: normalizedId,
        quantity: nextItem.quantity,
      });
    } catch (error) {
      console.error('Failed to sync addToCart with backend:', error);
    }
  },

  removeFromCart: async (id) => {
    const normalizedId = String(id || '').trim();
    if (!normalizedId) return;

    const next = get().cart.filter((item) => item.productId !== normalizedId);
    saveCart(next);
    set({ cart: next });

    try {
      const userId = await getAuthenticatedUserId();
      if (!userId) return;

      await removeCustomerCartItem(userId, normalizedId);
    } catch (error) {
      console.error('Failed to sync removeFromCart with backend:', error);
    }
  },

  setCartQuantity: async (id, quantity) => {
    const normalizedId = String(id || '').trim();
    if (!normalizedId) return;

    const safeQuantity = Math.max(0, Math.floor(quantity));
    const current = get().cart;

    let next: CartItem[];

    if (safeQuantity === 0) {
      next = current.filter((item) => item.productId !== normalizedId);
    } else {
      const exists = current.some((item) => item.productId === normalizedId);

      next = exists
        ? current.map((item) =>
            item.productId === normalizedId
              ? { ...item, quantity: safeQuantity }
              : item
          )
        : [...current, { productId: normalizedId, quantity: safeQuantity }];
    }

    saveCart(next);
    set({ cart: next });

    try {
      const userId = await getAuthenticatedUserId();
      if (!userId) return;

      if (safeQuantity === 0) {
        await removeCustomerCartItem(userId, normalizedId);
        return;
      }

      await upsertCustomerCartItem({
        userId,
        productId: normalizedId,
        quantity: safeQuantity,
      });
    } catch (error) {
      console.error('Failed to sync setCartQuantity with backend:', error);
    }
  },

  replaceCart: (cart) => {
    const normalized = normalizeCartItems(cart);
    saveCart(normalized);
    set({ cart: normalized });
  },

  syncCartWithExistingIds: (existingIds) => {
    const allowedIds = new Set(
      (Array.isArray(existingIds) ? existingIds : [])
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    );

    const current = get().cart;
    const next = current.filter((item) => allowedIds.has(item.productId));

    const changed =
      next.length !== current.length ||
      next.some((item, index) => {
        const currentItem = current[index];
        return (
          !currentItem ||
          currentItem.productId !== item.productId ||
          currentItem.quantity !== item.quantity
        );
      });

    if (!changed) return;

    saveCart(next);
    set({ cart: next });
  },

  clearCart: async () => {
    if (isBrowser()) {
      localStorage.removeItem(LS_CART);
    }
    set({ cart: [] });

    try {
      const userId = await getAuthenticatedUserId();
      if (!userId) return;

      await clearCustomerCart(userId);
    } catch (error) {
      console.error('Failed to sync clearCart with backend:', error);
    }
  },

  isFavorite: (id) => get().favorites.includes(String(id || '').trim()),

  isInCompare: (id) => get().compare.includes(String(id || '').trim()),

  isInCart: (id) =>
    get().cart.some((item) => item.productId === String(id || '').trim()),

  getCartQuantity: (id) => {
    const normalizedId = String(id || '').trim();
    const found = get().cart.find((item) => item.productId === normalizedId);
    return found?.quantity ?? 0;
  },

  getCartItemsCount: () => get().cart.length,

  getCartUnitsCount: () =>
    get().cart.reduce((sum, item) => sum + item.quantity, 0),

  loadFromStorage: () => {
    if (!isBrowser()) {
      set({
        favorites: [],
        compare: [],
        cart: [],
      });
      return;
    }

    try {
      const fav = localStorage.getItem(LS_FAV);
      const cmp = localStorage.getItem(LS_COMPARE);
      const cart = localStorage.getItem(LS_CART);

      const parsedFav = fav ? JSON.parse(fav) : [];
      const parsedCmp = cmp ? JSON.parse(cmp) : [];
      const parsedCart = cart ? JSON.parse(cart) : [];

      set({
        favorites: uniqueIds(parsedFav),
        compare: uniqueIds(parsedCmp).slice(0, 4),
        cart: normalizeCartItems(parsedCart),
      });
    } catch {
      set({
        favorites: [],
        compare: [],
        cart: [],
      });
    }
  },

  clearCompare: () => {
    if (isBrowser()) {
      localStorage.removeItem(LS_COMPARE);
    }
    set({ compare: [] });
  },
}));