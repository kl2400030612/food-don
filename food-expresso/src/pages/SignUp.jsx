import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUser, getApiErrorMessage } from '../services/api';

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'DONOR',
    ngoDescription: '',
    phone: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.address) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (formData.role === 'NGO' && !String(formData.ngoDescription || '').trim()) {
      setError('Please add NGO description');
      setLoading(false);
      return;
    }

    if (formData.password.length < 4) {
      setError('Password must be at least 4 characters');
      setLoading(false);
      return;
    }

    try {
      await createUser(formData);
      setSuccess('Account created successfully! Redirecting to login...');
      window.setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (err) {
      setError('Error creating account: ' + getApiErrorMessage(err, 'Unable to create account'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formBox}>
        <h2>🍲 Create Account</h2>
        <p>Join the Food Donation System</p>

        <form onSubmit={handleSignUp}>
          <div style={styles.formGroup}>
            <label>Full Name:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Password:</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter password (min 4 chars)"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Role:</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              style={styles.input}
            >
              <option value="DONOR">Donor (Donate Food)</option>
              <option value="NGO">NGO (Request Food)</option>
            </select>
          </div>

          {formData.role === 'NGO' && (
            <div style={styles.formGroup}>
              <label>NGO Description:</label>
              <textarea
                name="ngoDescription"
                value={formData.ngoDescription}
                onChange={handleInputChange}
                placeholder="Describe your NGO and service area"
                style={{ ...styles.input, minHeight: '84px', resize: 'vertical' }}
              />
            </div>
          )}

          <div style={styles.formGroup}>
            <label>Phone:</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter your phone number"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Address:</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter your address"
              style={styles.input}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div style={styles.loginLink}>
          <p>
            Already have an account?{' '}
            <Link to="/login" style={styles.link}>
              Login here
            </Link>
          </p>
        </div>

        <div style={styles.info}>
          <p style={styles.infoTitle}>🎯 Choose Your Role:</p>
          <ul style={styles.list}>
            <li><strong>🎁 Donor</strong> - Donate food items</li>
            <li><strong>🤝 NGO</strong> - Request food donations</li>
          </ul>
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
    padding: '20px',
  },
  formBox: {
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '450px',
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
  success: {
    backgroundColor: '#eafaf1',
    color: '#1e8449',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '15px',
    fontSize: '14px',
    border: '1px solid #c3e6cb',
  },
  loginLink: {
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
  info: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f0f8ff',
    borderRadius: '4px',
    fontSize: '13px',
  },
  infoTitle: {
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
};
