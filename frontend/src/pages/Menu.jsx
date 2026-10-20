import { Link, useParams } from 'react-router-dom';
import { useApiData } from '../useApiData';
import { useAuth } from '../auth';
import { useCart } from '../cart';
import { money } from '../orderFlow';

export default function Menu() {
  const { id } = useParams();
  const { user } = useAuth();
  const { add } = useCart();
  const menuState = useApiData(`/restaurants/${id}/menu`);
  const reviewState = useApiData(`/restaurants/${id}/ratings`);

  if (menuState.loading) return <p>Loading menu...</p>;
  if (menuState.error) return <p className="error">{menuState.error}</p>;

  const { restaurant, menu } = menuState.data;
  const canOrder = user?.role === 'customer';
  const reviews = reviewState.data;

  return (
    <>
      <p><Link to="/">&larr; All restaurants</Link></p>
      <h1>{restaurant.restaurant_name}</h1>
      <p className="muted">{restaurant.cuisine_type} · {restaurant.address}</p>
      {!user && <p><Link to="/login">Log in</Link> as a customer to order.</p>}
      {user && !canOrder && <p className="muted">You are logged in as a {user.role}, so ordering is turned off.</p>}
      {menu.length === 0 && <p>No items available right now.</p>}
      <ul className="list">
        {menu.map((item) => (
          <li key={item.id}>
            <span>{item.name}</span>
            <span>{money(item.price)}</span>
            {canOrder && (
              <button onClick={() => add({ id: restaurant.id, name: restaurant.restaurant_name }, item)}>Add</button>
            )}
          </li>
        ))}
      </ul>

      <h2>Reviews</h2>
      {reviewState.loading && <p>Loading reviews...</p>}
      {reviewState.error && <p className="error">{reviewState.error}</p>}
      {reviews && reviews.count === 0 && <p className="muted">No reviews yet.</p>}
      {reviews && reviews.count > 0 && (
        <>
          <p>★ {Number(reviews.average).toFixed(1)} from {reviews.count} review{reviews.count === 1 ? '' : 's'}</p>
          <ul className="list">
            {reviews.ratings.map((r, i) => (
              <li key={i}>
                <span>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)} {r.comment || ''}</span>
                <span className="muted">{r.reviewer}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
