import { Link } from 'react-router-dom';
import { useApiData } from '../useApiData';

export default function Restaurants() {
  const { data, error, loading } = useApiData('/restaurants');
  if (loading) return <p>Loading restaurants...</p>;
  if (error) return <p className="error">{error}</p>;
  if (data.length === 0) return <p>No restaurants yet.</p>;
  return (
    <>
      <h1>Restaurants</h1>
      <ul className="list">
        {data.map((r) => (
          <li key={r.id}>
            <Link to={`/restaurants/${r.id}`}>{r.restaurant_name}</Link>
            <span>{r.cuisine_type} · {r.address}</span>
          </li>
        ))}
      </ul>
    </>
  );
}