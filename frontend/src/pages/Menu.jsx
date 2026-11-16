import { Link, useParams } from 'react-router-dom';
import { useApiData } from '../useApiData';
import { useAuth } from '../auth';
import { useCart } from '../cart';
import { money } from '../orderFlow';
import { getRestaurantImage } from '../restaurantImages';

export default function Menu() {
  const { id } = useParams();
  const { user } = useAuth();
  const { add } = useCart();
  const menuState = useApiData(`/restaurants/${id}/menu`);
  const reviewState = useApiData(`/restaurants/${id}/ratings`);

  if (menuState.loading) {
    return (
      <div className="loading-box">
        <div className="spinner" />
        <span>Loading restaurant menu...</span>
      </div>
    );
  }

  if (menuState.error) {
    return (
      <div className="alert-error">
        <span>⚠️</span> {menuState.error}
        <Link to="/" style={{ marginLeft: '12px', textDecoration: 'underline' }}>Back to restaurants</Link>
      </div>
    );
  }

  const { restaurant, menu } = menuState.data;
  const canOrder = user?.role === 'customer';
  const reviews = reviewState.data;
  const restaurantImage = getRestaurantImage(restaurant);

  return (
    <>
      <div className="restaurant-header-hero">
        <div className="restaurant-hero-cover">
          <img
            src={restaurantImage}
            alt={`${restaurant.restaurant_name} cuisine banner`}
            className="restaurant-hero-cover-img"
          />
          <div className="restaurant-hero-cover-gradient" />
        </div>
        <div className="restaurant-hero-content">
          <Link to="/" className="back-link">&larr; Back to all restaurants</Link>
          <div className="restaurant-header-info">
            <div>
              <h1>{restaurant.restaurant_name}</h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', color: 'var(--gray-600)' }}>
                <span className="badge" style={{ backgroundColor: 'var(--primary-subtle)', color: 'var(--primary)', borderColor: 'var(--primary-border)' }}>
                  {restaurant.cuisine_type || 'Specialty'}
                </span>
                <span>📍 {restaurant.address}</span>
              </div>
            </div>
            {reviews && reviews.count > 0 && (
              <div className="restaurant-rating-pill">
                ★ {Number(reviews.average).toFixed(1)} ({reviews.count})
              </div>
            )}
          </div>

          {!user && (
            <div className="box" style={{ marginTop: '20px', background: 'var(--info-subtle)', borderColor: 'var(--info-border)' }}>
              💡 <Link to="/login" style={{ fontWeight: 700 }}>Log in</Link> as a customer to place an order from this menu.
            </div>
          )}
          {user && !canOrder && (
            <div className="box" style={{ marginTop: '20px', background: 'var(--gray-100)' }}>
              <span className="muted">You are logged in as a <strong>{user.role}</strong>. Switch to a customer account to place orders.</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Available Menu ({menu.length})</h2>
        <span className="muted">Cooked to order</span>
      </div>

      {menu.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🍲</div>
          <h3>No items available right now</h3>
          <p>This restaurant does not have any active menu items at the moment. Please check back later!</p>
        </div>
      ) : (
        <ul className="menu-grid">
          {menu.map((item) => (
            <li key={item.id} className="menu-card">
              <div className="menu-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '1.25rem' }}>🍴</span>
                  <span className="menu-card-title">{item.name}</span>
                </div>
                <span className="muted">Prepared fresh daily</span>
              </div>
              <div className="menu-card-footer">
                <span className="menu-card-price">{money(item.price)}</span>
                {canOrder && (
                  <button
                    className="btn-add-item"
                    onClick={() => add({ id: restaurant.id, name: restaurant.restaurant_name }, item)}
                  >
                    + Add to Cart
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="reviews-section">
        <h2>Customer Reviews & Ratings</h2>
        {reviewState.loading && (
          <div className="loading-box">
            <div className="spinner" />
            <span>Loading verified reviews...</span>
          </div>
        )}
        {reviewState.error && <div className="alert-error"><span>⚠️</span> {reviewState.error}</div>}
        {reviews && reviews.count === 0 && (
          <div className="box" style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⭐</div>
            <p className="muted">No reviews yet. Be the first to place an order and leave a review!</p>
          </div>
        )}
        {reviews && reviews.count > 0 && (
          <>
            <div className="reviews-summary-card">
              <div className="reviews-score">★ {Number(reviews.average).toFixed(1)}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--gray-900)' }}>Overall Rating</div>
                <span className="muted">Based on {reviews.count} verified customer review{reviews.count === 1 ? '' : 's'}</span>
              </div>
            </div>
            <ul className="list">
              {reviews.ratings.map((r, i) => (
                <li key={i} className="review-item-card" style={{ display: 'block' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div className="review-stars">
                      {'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}
                    </div>
                    <span className="badge" style={{ backgroundColor: 'var(--gray-100)', color: 'var(--gray-600)' }}>
                      Verified Diner
                    </span>
                  </div>
                  {r.comment && <p style={{ margin: '8px 0', fontSize: '0.95rem', color: 'var(--gray-800)' }}>"{r.comment}"</p>}
                  <div className="muted" style={{ fontSize: '0.825rem' }}>Reviewed by {r.reviewer}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
