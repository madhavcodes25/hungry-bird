import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { CartProvider, useCart } from './cart';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Restaurants from './pages/Restaurants';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import './App.css';

function Nav() {
  const { user, logout } = useAuth();
  const { lines } = useCart();
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  return (
    <nav>
      <Link to="/">Hungry Bird</Link>
      {user ? (
        <>
          <Link to="/cart">Cart ({count})</Link>
          <Link to="/orders">My orders</Link>
          <span>{user.name}</span>
          <button onClick={logout}>Log out</button>
        </>
      ) : (
        <>
          <Link to="/login">Log in</Link>
          <Link to="/signup">Sign up</Link>
        </>
      )}
    </nav>
  );
}

function CustomerOnly({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'customer') return <p>This screen is for customers. Log in with a customer account.</p>;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Nav />
          <main>
            <Routes>
              <Route path="/" element={<Restaurants />} />
              <Route path="/restaurants/:id" element={<Menu />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/cart" element={<CustomerOnly><Cart /></CustomerOnly>} />
              <Route path="/orders" element={<CustomerOnly><Orders /></CustomerOnly>} />
              <Route path="/orders/:id" element={<CustomerOnly><OrderDetail /></CustomerOnly>} />
              <Route path="*" element={<p>Page not found.</p>} />
            </Routes>
          </main>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}