import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isProfileRoute = location.pathname === '/profile';

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.container}>
        <h1 style={styles.logo}>Food Donation Network</h1>
        {user.id && (
          <div style={styles.userInfo}>
            {!isProfileRoute && (
              <button
                type="button"
                style={styles.userBadge}
                onClick={() => navigate('/profile')}
              >
                Profile
              </button>
            )}

            {isProfileRoute && (
              <button onClick={handleLogout} style={styles.logoutBtn}>
                Logout
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

const styles = {
  navbar: {
    background: 'linear-gradient(110deg, #0f3d5e 0%, #1f6f8b 55%, #3aa8a3 100%)',
    color: '#fff',
    padding: '14px 0',
    boxShadow: '0 8px 24px rgba(12, 53, 79, 0.26)',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },
  container: {
    maxWidth: '1240px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: '22px',
    paddingRight: '22px',
  },
  logo: {
    fontSize: '22px',
    fontWeight: 800,
    letterSpacing: '0.3px',
    margin: 0,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userBadge: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    border: '1px solid rgba(255,255,255,0.28)',
    padding: '8px 12px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
  },
  logoutBtn: {
    backgroundColor: '#e14d2a',
    color: '#fff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '999px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 700,
  },
};
