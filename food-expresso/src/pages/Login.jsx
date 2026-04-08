import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getApiErrorMessage } from '../services/api';
import { getSessionPolicy, getStoredUser, isAuthenticated, login, setSession } from '../services/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const sessionPolicy = getSessionPolicy();
  const sessionHint = "Session: " + Math.round(sessionPolicy.idleTimeoutMs / 60000) + " min idle / " + Math.round(sessionPolicy.absoluteTimeoutMs / 3600000) + " hr max";


  useEffect(() => {
    const userData = getStoredUser();
    if (isAuthenticated() && userData) {
      if (userData.role === 'ADMIN') navigate('/admin');
      else if (userData.role === 'DONOR') navigate('/donor');
      else if (userData.role === 'NGO') navigate('/ngo');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const inputEmail = String(email).trim().toLowerCase();
      const inputPassword = String(password).trim();

      const response = await login({ email: inputEmail, password: inputPassword });
      const token = response?.data?.token;
      const user = response?.data?.user;

      if (token && user) {
        setSession(token, user);

        if (user.role === 'ADMIN') navigate('/admin');
        else if (user.role === 'DONOR') navigate('/donor');
        else if (user.role === 'NGO') navigate('/ngo');
      } else {
        setError('Login succeeded but session data was incomplete.');
      }
    } catch (err) {
      setError('Error connecting to backend: ' + getApiErrorMessage(err, 'Unable to connect to backend'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formBox}>
        <h2>🍲 Food Donation System</h2>
        <p>Login to your account</p>
        <p style={styles.sessionHint}>{sessionHint}</p>

        <form onSubmit={handleLogin}>
          <div style={styles.formGroup}>
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="Enter your email"
            />
          </div>

          <div style={styles.formGroup}>
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="Enter your password"
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={styles.submitBtn}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={styles.signupLink}>
          <p>
            Don't have an account?{' '}
            <Link to="/signup" style={styles.link}>
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#ecf0f1',
  },
  formBox: {
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  input: {
    width: '100%',
    padding: '10px',
    marginTop: '5px',
    border: '1px solid #bdc3c7',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  error: {
    backgroundColor: '#ffe6e6',
    color: '#c0392b',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '15px',
    fontSize: '14px',
  },
  testUsers: {
    marginTop: '30px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    fontSize: '13px',
  },
  testTitle: {
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  signupLink: {
    marginTop: '20px',
    textAlign: 'center',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
  },
  link: {
    color: '#3498db',
    textDecoration: 'none',
    fontWeight: 'bold',
  },
  sessionHint: {
    fontSize: '12px',
    color: '#607d8b',
    marginBottom: '16px',
  },
};

