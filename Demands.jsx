import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import axios from 'axios';

import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Demands from './pages/Demands';
import Schedule from './pages/Schedule';
import Availability from './pages/Availability';
import Emails from './pages/Emails';
import Settings from './pages/Settings';

const api = axios.create({ baseURL: '/api' });

const NAV = [
  { path: '/', label: 'Dashboard', icon: '⬛' },
  { path: '/employees', label: 'Employés', icon: '👤' },
  { path: '/demands', label: 'Demandes', icon: '📋' },
  { path: '/schedule', label: 'Horaires', icon: '🗓' },
  { path: '/availability', label: 'Disponibilités', icon: '✅' },
  { path: '/emails', label: 'Communications', icon: '✉' },
  { path: '/settings', label: 'Paramètres', icon: '⚙' },
];

function Sidebar() {
  const loc = useLocation();
  return (
    <aside style={{
      width: 220, minHeight: '100vh', background: '#0f172a', color: '#cbd5e1',
      display: 'flex', flexDirection: 'column', flexShrink: 0
    }}>
      <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ fontWeight: 600, fontSize: 16, color: '#f1f5f9' }}>Workforce</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Gestion des horaires</div>
      </div>
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {NAV.map(n => (
          <NavLink key={n.path} to={n.path} end={n.path === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 16px', textDecoration: 'none', fontSize: 13,
              color: isActive ? '#f1f5f9' : '#94a3b8',
              background: isActive ? '#1e293b' : 'none',
              borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
            })}>
            <span style={{ fontSize: 14 }}>{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, []);
  const colors = { success: '#16a34a', error: '#dc2626', info: '#2563eb' };
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: colors[type] || colors.info, color: '#fff',
      padding: '10px 18px', borderRadius: 8, fontSize: 13,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)', cursor: 'pointer',
      maxWidth: 380
    }} onClick={onClose}>
      {message}
    </div>
  );
}

export const ToastContext = React.createContext(null);
export const ApiContext = React.createContext(null);

export default function App() {
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
  };

  return (
    <ApiContext.Provider value={api}>
      <ToastContext.Provider value={addToast}>
        <BrowserRouter>
          <div style={{ display: 'flex', fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, overflow: 'auto' }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/demands" element={<Demands />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/availability" element={<Availability />} />
                <Route path="/emails" element={<Emails />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(ts => ts.filter(x => x.id !== t.id))} />
        ))}
      </ToastContext.Provider>
    </ApiContext.Provider>
  );
}
