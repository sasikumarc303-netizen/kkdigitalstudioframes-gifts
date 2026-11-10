import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const CART_KEY = 'kk_cart_v1';
const ORDERS_KEY = 'kk_orders_v1';

const read = (key, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) – cart still works for this session */
  }
};

/**
 * Cart items hold only ids + quantity (plus a display snapshot). Real prices are always fetched from the server
 * (POST /cart/price), so a price change in the admin panel is reflected in the cart and at checkout.
 */
export function CartProvider({ children }) {
  const [items, setItems] = useState(() => read(CART_KEY, []).filter((i) => i && i.productId && i.variantId));
  const [orders, setOrders] = useState(() => read(ORDERS_KEY, []));

  useEffect(() => write(CART_KEY, items), [items]);
  useEffect(() => write(ORDERS_KEY, orders), [orders]);

  // keep multiple tabs in sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === CART_KEY) setItems(read(CART_KEY, []));
      if (e.key === ORDERS_KEY) setOrders(read(ORDERS_KEY, []));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((item, quantity = 1) => {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.productId === item.productId && p.variantId === item.variantId);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], ...item, quantity: Math.min(20, next[i].quantity + quantity) };
        return next;
      }
      return [...prev, { ...item, quantity: Math.min(20, quantity) }];
    });
  }, []);

  const setQuantity = useCallback((productId, variantId, quantity) => {
    setItems((prev) =>
      prev.map((p) => (p.productId === productId && p.variantId === variantId ? { ...p, quantity: Math.max(1, Math.min(20, quantity)) } : p))
    );
  }, []);

  const remove = useCallback((productId, variantId) => {
    setItems((prev) => prev.filter((p) => !(p.productId === productId && p.variantId === variantId)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const rememberOrder = useCallback((orderNumber, phone) => {
    setOrders((prev) => [{ orderNumber, phone, at: Date.now() }, ...prev.filter((o) => o.orderNumber !== orderNumber)].slice(0, 20));
  }, []);

  const value = useMemo(
    () => ({ items, count: items.reduce((n, i) => n + i.quantity, 0), add, setQuantity, remove, clear, orders, rememberOrder }),
    [items, add, setQuantity, remove, clear, orders, rememberOrder]
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
