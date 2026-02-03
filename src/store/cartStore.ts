import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartItem = {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
};

export type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  getTotalCount: () => number;
  getTotalPrice: () => number;
  getItemCount: (id: string) => number;
};

function slugId(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/giu, '-')
    .replace(/^-+|-+$/g, '');
}

function readLegacyCart(): CartItem[] | null {
  try {
    const raw = localStorage.getItem('userCart');
    if (!raw) return null;

    const data = JSON.parse(raw);
    // legacy формат: Array<[productName, {name, price, quantity}]>
    if (!Array.isArray(data)) return null;

    const items: CartItem[] = [];
    for (const entry of data) {
      if (!Array.isArray(entry) || entry.length < 2) continue;
      const key = String(entry[0]);
      const val = entry[1] as any;

      const title = String(val?.name ?? key);
      const price = Number(val?.price ?? 0);
      const quantity = Number(val?.quantity ?? 1);

      if (!title || !Number.isFinite(price) || !Number.isFinite(quantity)) continue;

      items.push({
        id: slugId(title),
        title,
        price,
        quantity: Math.max(1, Math.floor(quantity))
      });
    }

    return items.length ? items : null;
  } catch {
    return null;
  }
}

type Persisted = {
  state: CartState;
  version: number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((x) => x.id === item.id);
          if (existing) {
            return {
              items: state.items.map((x) => (x.id === item.id ? { ...x, quantity: x.quantity + quantity } : x))
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        });
      },

      removeItem: (id) => {
        set((state) => ({ items: state.items.filter((x) => x.id !== id) }));
      },

      setQuantity: (id, quantity) => {
        const q = Math.max(0, Math.floor(quantity));
        set((state) => {
          if (q === 0) return { items: state.items.filter((x) => x.id !== id) };
          return { items: state.items.map((x) => (x.id === id ? { ...x, quantity: q } : x)) };
        });
      },

      clear: () => set({ items: [] }),

      getTotalCount: () => get().items.reduce((sum, x) => sum + x.quantity, 0),
      getTotalPrice: () => get().items.reduce((sum, x) => sum + x.price * x.quantity, 0),
      getItemCount: (id) => {
        const item = get().items.find((x) => x.id === id);
        return item ? item.quantity : 0;
      }
    }),
    {
      name: 'cart',
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        const ps = persistedState as Persisted | undefined;

        // Если стора нет/битый — пробуем legacy
        const currentItems = ps?.state?.items;
        const hasCurrent = Array.isArray(currentItems) && currentItems.length > 0;

        if (!hasCurrent) {
          const legacy = readLegacyCart();
          if (legacy && legacy.length > 0) {
            // cleanup legacy
            try {
              localStorage.removeItem('userCart');
            } catch {
              // ignore
            }

            return {
              ...(ps?.state ?? {}),
              items: legacy
            } as any;
          }
        }

        // по умолчанию — отдаём как есть
        return (ps?.state ?? persistedState) as any;
      }
    }
  )
);
