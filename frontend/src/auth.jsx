import { createContext, useContext, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

function load() {
  try { return JSON.parse(localStorage.getItem('hb_auth')) || null; } catch { return null; }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(load);   // { user, token } or null

  function save(next) {
    setAuth(next);
    try {
      if (next) localStorage.setItem('hb_auth', JSON.stringify(next));
      else localStorage.removeItem('hb_auth');
    } catch { }
  }

  async function login(email, password) {
    save(await api('/auth/login', { method: 'POST', body: { email, password } }));
  }
  async function signup(fields) {
    save(await api('/auth/signup', { method: 'POST', body: { ...fields, role: 'customer' } }));
  }
  const logout = () => save(null);

  return (
    <AuthContext.Provider value={{ user: auth?.user, token: auth?.token, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);