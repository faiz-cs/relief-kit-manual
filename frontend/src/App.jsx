import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import AdminRoutes from './admin/AdminRoutes';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import Scan from './pages/Scan';
import TokenView from './pages/TokenView';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLoginPage = location.pathname === '/login' || location.pathname === '/admin-login';

  const navigationLinks = [
    { path: '/admin', label: 'Home', icon: '🏠' },
    { path: '/admin/tokens', label: 'Tokens', icon: '🎫' },
    { path: '/admin/events', label: 'Events', icon: '📅' },
    { path: '/admin/reports', label: 'Reports', icon: '📊' },
    { path: '/admin/upload-houses', label: 'CSV Upload', icon: '📤' }
  ];

  // Get current page name
  const getCurrentPageName = () => {
    const current = navigationLinks.find(link => link.path === location.pathname);
    return current ? current.label : 'Dashboard';
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setDropdownOpen(false);
    navigate('/admin-login');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      
      {/* ============ PROFESSIONAL HEADER ============ */}
      {!isLoginPage && (
        <header style={{
          background: '#ffffff',
          color: '#1f2937',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            
            {/* Left: Logo & Page Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                  background: 'transparent',
                  border: '1px solid #e5e7eb',
                  color: '#6b7280',
                  padding: '8px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 18,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={e => {
                  e.target.style.background = '#f3f4f6';
                  e.target.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={e => {
                  e.target.style.background = 'transparent';
                  e.target.style.borderColor = '#e5e7eb';
                }}
              >
                ☰
              </button>

              {/* Logo - Always visible */}
              {sidebarOpen && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'white'
                  }}>
                    R
                  </div>
                  <div>
                    <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Relief</h1>
                    <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#9ca3af' }}>Admin Panel</p>
                  </div>
                </div>
              )}

              {/* Page Title when sidebar is closed */}
              {!sidebarOpen && isAdminRoute && (
                <div style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#111827',
                  paddingLeft: 12,
                  borderLeft: '1px solid #e5e7eb'
                }}>
                  {getCurrentPageName()}
                </div>
              )}
            </div>

            {/* Right: User Dropdown */}
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  color: '#111827',
                  padding: '8px 14px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#e5e7eb';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'white'
                }}>
                  👤
                </div>
                <span>Admin</span>
                <span style={{ fontSize: 11, opacity: 0.6 }}>▼</span>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 8,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  overflow: 'hidden',
                  minWidth: 220,
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000
                }}>
                  <div style={{ padding: '12px 0' }}>
                    {/* User Info */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Admin User</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>admin@relief.local</div>
                    </div>
                    
                    {/* Menu Items */}
                    <button
                      onClick={() => {
                        navigate('/admin');
                        setDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'transparent',
                        border: 'none',
                        color: '#374151',
                        textAlign: 'left',
                        fontSize: 14,
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.target.style.background = '#f9fafb'}
                      onMouseLeave={e => e.target.style.background = 'transparent'}
                    >
                      Dashboard
                    </button>

                    <button
                      onClick={() => {
                        navigate('/admin');
                        setDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'transparent',
                        border: 'none',
                        color: '#374151',
                        textAlign: 'left',
                        fontSize: 14,
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.target.style.background = '#f9fafb'}
                      onMouseLeave={e => e.target.style.background = 'transparent'}
                    >
                      Settings
                    </button>

                    {/* Logout */}
                    <div style={{ borderTop: '1px solid #e5e7eb' }}>
                      <button
                        onClick={handleLogout}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'transparent',
                          border: 'none',
                          color: '#dc2626',
                          textAlign: 'left',
                          fontSize: 14,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.target.style.background = '#fef2f2'}
                        onMouseLeave={e => e.target.style.background = 'transparent'}
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* ============ MAIN CONTAINER ============ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* ============ SIDEBAR ============ */}
        {isAdminRoute && !isLoginPage && (
          <aside style={{
            width: sidebarOpen ? 260 : 0,
            background: '#ffffff',
            borderRight: '1px solid #e5e7eb',
            boxShadow: sidebarOpen ? '2px 0 4px rgba(0,0,0,0.05)' : 'none',
            overflow: 'hidden',
            transition: 'width 0.3s ease',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Navigation */}
            <nav style={{
              padding: '24px 0',
              flex: 1,
              overflowY: 'auto'
            }}>
              {navigationLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      margin: '4px 12px',
                      color: isActive ? '#3b82f6' : '#6b7280',
                      textDecoration: 'none',
                      fontSize: 14,
                      fontWeight: isActive ? 600 : 500,
                      transition: 'all 0.2s',
                      borderRadius: 8,
                      background: isActive ? '#eff6ff' : 'transparent',
                      borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                      paddingLeft: isActive ? '13px' : '16px'
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = '#f3f4f6';
                        e.currentTarget.style.color = '#374151';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#6b7280';
                      }
                    }}
                  >
                    <span style={{ fontSize: 18, minWidth: 24 }}>{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Sidebar Footer */}
            <div style={{
              padding: '16px',
              borderTop: '1px solid #e5e7eb',
              background: '#f9fafb'
            }}>
              <div style={{
                padding: '12px',
                background: '#eff6ff',
                borderRadius: 8,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', marginBottom: 6 }}>Need Help?</div>
                <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4 }}>
                  Contact support for assistance
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* ============ CONTENT AREA ============ */}
        <main style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            flex: 1,
            width: '100%'
          }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/scan" element={<Scan />} />
              <Route path="/token/:code" element={<TokenView />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admindashboard" element={<AdminDashboard />} />
              <Route path="/admin/*" element={<AdminRoutes />} />
              <Route path="/admin-login" element={<AdminLogin />} />
            </Routes>
          </div>

          {/* Footer */}
          {!isLoginPage && (
            <footer style={{
              borderTop: '1px solid #e5e7eb',
              background: '#ffffff',
              padding: '16px 24px',
              fontSize: 12,
              color: '#9ca3af',
              textAlign: 'center'
            }}>
              <div>Relief Distribution System © 2025 — All rights reserved</div>
            </footer>
          )}
        </main>
      </div>
    </div>
  );
}