import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApiData } from '../useApiData';
import { getRestaurantImage } from '../restaurantImages';

export default function Restaurants() {
  const { data, error, loading } = useApiData('/restaurants');
  const [search, setSearch] = useState('');

  if (loading) {
    return (
      <div className="loading-box">
        <div className="spinner" />
        <span>Loading top restaurants...</span>
      </div>
    );
  }

  if (error) {
    return <div className="alert-error"><span>⚠️</span> {error}</div>;
  }

  const restaurants = data || [];
  const filtered = restaurants.filter((r) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      r.restaurant_name?.toLowerCase().includes(query) ||
      r.cuisine_type?.toLowerCase().includes(query) ||
      r.address?.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <div className="hero-banner">
        <div className="hero-badge">⚡ Lightning-fast delivery</div>
        <h1>Craving something delicious?</h1>
        <p>Explore top-rated restaurants near you, crafted with passion and delivered fresh to your door.</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Popular Restaurants</h2>
          <span className="muted">{filtered.length} {filtered.length === 1 ? 'place' : 'places'} available</span>
        </div>
        <div style={{ maxWidth: '320px', width: '100%' }}>
          <input
            type="search"
            placeholder="Search by name, cuisine, or area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ borderRadius: 'var(--radius-pill)', padding: '10px 18px' }}
          />
        </div>
      </div>

      {restaurants.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🍽️</div>
          <h3>No restaurants yet</h3>
          <p>Check back soon as new culinary partners join Hungry Bird!</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>No matching restaurants</h3>
          <p>We could not find anything matching "{search}". Try searching for another cuisine or dish.</p>
          <button className="btn" onClick={() => setSearch('')}>Clear search</button>
        </div>
      ) : (
        <ul className="restaurant-grid">
          {filtered.map((r) => {
            const hasRatings = r.rating_count > 0;
            const foodImage = getRestaurantImage(r);
            return (
              <li key={r.id} className="restaurant-card">
                <div className="restaurant-card-image-wrap">
                  <img
                    src={foodImage}
                    alt={`${r.restaurant_name} food preview`}
                    className="restaurant-card-img"
                    loading="lazy"
                  />
                  <span className="restaurant-card-cuisine">{r.cuisine_type || 'Specialty'}</span>
                  <div className="restaurant-rating-overlay">
                    <span className={`restaurant-rating-pill ${!hasRatings ? 'empty' : ''}`}>
                      ★ {hasRatings ? `${Number(r.avg_rating).toFixed(1)} (${r.rating_count})` : 'New'}
                    </span>
                  </div>
                </div>
                <div className="restaurant-card-body">
                  <Link to={`/restaurants/${r.id}`} className="restaurant-card-title">
                    {r.restaurant_name}
                  </Link>
                  <div className="restaurant-card-address">
                    <span>📍</span>
                    <span>{r.address}</span>
                  </div>
                  <div className="restaurant-card-footer">
                    <span className="muted">Fresh & Handcrafted</span>
                    <Link to={`/restaurants/${r.id}`} className="view-menu-btn">
                      View Menu &rarr;
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
