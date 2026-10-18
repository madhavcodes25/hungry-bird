import { Link, useParams } from 'react-router-dom';
import { useApiData } from '../useApiData';
import { useAuth } from '../auth';
import { useCart } from '../cart';

export default function Menu() {
  const { id } = useParams();
  const { user } = useAuth();
  const { add } = useCart();
  const { data, error, loading } = useApiData(`/restaurants/${id}/menu`);
  if (loading) return <p>Loading menu...</p>;
  if (error) return <p className="error">{error}</p>;

  const { restaurant, menu } = data;
  const canOrder = user?.role === 'customer';
  return (
    <>
      <h1>{restaurant.restaurant_name}</h1>
      <p>{restaurant.cuisine_type} · {restaurant.address}</p>
      {!user && <p><Link to="/login">Log in</Link> as a customer to order.</p>}
      {menu.length === 0 && <p>No items available right now.</p>}
      <ul className="list">
        {menu.map((item) => (
          <li key={item.id}>
            <span>{item.name}</span>
            <span>₹{Number(item.price).toFixed(2)}</span>
            {canOrder && (
              <button onClick={() => add({ id: restaurant.id, name: restaurant.restaurant_name }, item)}>Add</button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}