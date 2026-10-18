import { createContext, useContext, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [restaurant, setRestaurant] = useState(null);   // { id, name }
  const [lines, setLines] = useState([]);               // [{ id, name, price, quantity }]

  function add(rest, item) {
    const otherRestaurant = restaurant && restaurant.id !== rest.id && lines.length > 0;
    if (otherRestaurant && !window.confirm('Your cart has items from another restaurant. Start a new cart?')) return;
    const base = otherRestaurant ? [] : lines;
    const found = base.find((l) => l.id === item.id);
    setRestaurant(rest);
    setLines(
      found
        ? base.map((l) => (l.id === item.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...base, { id: item.id, name: item.name, price: Number(item.price), quantity: 1 }]
    );
  }

  function changeQty(id, delta) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, quantity: l.quantity + delta } : l)).filter((l) => l.quantity > 0)
    );
  }

  function clear() { setLines([]); setRestaurant(null); }

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  return (
    <CartContext.Provider value={{ restaurant, lines, add, changeQty, clear, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);