import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { CartProvider, useCart } from './cart';
import { ROLE_LABELS } from './orderFlow';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Restaurants from './pages/Restaurants';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Requests from './pages/Requests';
import MenuManager from './pages/MenuManager';
import Deliveries from './pages/Deliveries';
import Earnings from './pages/Earnings';
import AdminUsers from './pages/AdminUsers';
import AdminCoupons from './pages/AdminCoupons';
import './App.css';

// What each role sees in the top bar
function navLinks(role, cartCount) {
  switch (role) {
    case 'customer':
      return [['/', 'Restaurants'], ['/cart', `Cart (${cartCount})`], ['/orders', 'My orders'], ['/requests', 'My requests']];
    case 'restaurant':
      return [['/orders', 'Orders'], ['/menu-manager', 'My menu']];
    case 'delivery_partner':
      return [['/deliveries', 'Available deliveries'], ['/orders', 'My deliveries'], ['/earnings', 'Earnings']];
    case 'admin':
      return [['/orders', 'All orders'], ['/admin/users', 'Users'], ['/admin/coupons', 'Coupons'], ['/requests', 'Requests']];
    default:
      return [['/', 'Restaurants']];
  }
}

function Nav() {
  const { user, logout } = useAuth();
  const { lines } = useCart();
  const cartCount = lines.reduce((n, l) => n + l.quantity, 0);
  const links = navLinks(user?.role, cartCount);
  return (
    <nav>
      <Link to="/" className="brand">Hungry Bird</Link>
      {links.map(([to, label]) => <Link key={to + label} to={to}>{label}</Link>)}
      <span className="spacer" />
      {user ? (
        <>
          <span className="muted">{user.name} ({ROLE_LABELS[user.role]})</span>
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

// Only lets the listed roles in. Logged-out visitors are sent to the login page.
function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    return <p className="error">This page is for: {roles.map((r) => ROLE_LABELS[r]).join(', ')}. You are logged in as a {ROLE_LABELS[user.role]}.</p>;
  }
  return children;
}

// Guests and customers browse restaurants. Everyone else goes straight to their own dashboard.
function Home() {
  const { user } = useAuth();
  if (user && user.role !== 'customer') {
    return <Navigate to={user.role === 'delivery_partner' ? '/deliveries' : '/orders'} replace />;
  }
  return <Restaurants />;
}

const ALL = ['customer', 'restaurant', 'delivery_partner', 'admin'];

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Nav />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/restaurants/:id" element={<Menu />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              <Route path="/cart" element={<RoleRoute roles={['customer']}><Cart /></RoleRoute>} />
              <Route path="/orders" element={<RoleRoute roles={ALL}><Orders /></RoleRoute>} />
              <Route path="/orders/:id" element={<RoleRoute roles={ALL}><OrderDetail /></RoleRoute>} />
              <Route path="/requests" element={<RoleRoute roles={['customer', 'admin']}><Requests /></RoleRoute>} />

              <Route path="/menu-manager" element={<RoleRoute roles={['restaurant']}><MenuManager /></RoleRoute>} />

              <Route path="/deliveries" element={<RoleRoute roles={['delivery_partner']}><Deliveries /></RoleRoute>} />
              <Route path="/earnings" element={<RoleRoute roles={['delivery_partner']}><Earnings /></RoleRoute>} />

              <Route path="/admin/users" element={<RoleRoute roles={['admin']}><AdminUsers /></RoleRoute>} />
              <Route path="/admin/coupons" element={<RoleRoute roles={['admin']}><AdminCoupons /></RoleRoute>} />

              <Route path="*" element={<p>Page not found.</p>} />
            </Routes>
          </main>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
