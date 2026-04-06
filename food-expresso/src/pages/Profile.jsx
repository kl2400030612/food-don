import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapPicker from '../components/MapPicker';
import { getApiErrorMessage, getUser, updateUser } from '../services/api';

const isValidCoordinatePair = (lat, lng) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001) return false;
  return true;
};

const parseStoredLocation = (value) => {
  try {
    const parsed = JSON.parse(value || '{}');
    const lat = Number(parsed.latitude);
    const lng = Number(parsed.longitude);
    if (isValidCoordinatePair(lat, lng)) {
      return { latitude: lat, longitude: lng };
    }
  } catch (err) {
    return null;
  }
  return null;
};

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    location: user.address || '',
    ngoDescription: user.ngoDescription || user.description || user.ngoDesc || user.about || '',
  });
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);
  const locationStorageKey = `ngo-fixed-location-${user.id || 'unknown'}`;
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [ngoFixedLocation, setNgoFixedLocation] = useState(() => {
    const stored = parseStoredLocation(localStorage.getItem(locationStorageKey));
    if (stored) return stored;
    const lat = Number(user.latitude);
    const lng = Number(user.longitude);
    if (isValidCoordinatePair(lat, lng)) {
      return { latitude: lat, longitude: lng };
    }
    return { latitude: null, longitude: null };
  });
  const [draftFixedLocation, setDraftFixedLocation] = useState(() => ({ ...ngoFixedLocation }));

  const isLocationEditable = useMemo(() => user.role === 'DONOR' || user.role === 'NGO', [user.role]);

  useEffect(() => {
    if (!user.id) {
      navigate('/login');
    }
  }, [navigate, user.id]);

  useEffect(() => {
    const loadLatestUser = async () => {
      if (!user.id) return;

      try {
        const response = await getUser(user.id);
        const latestUser = response?.data;
        if (latestUser && typeof latestUser === 'object') {
          localStorage.setItem('user', JSON.stringify(latestUser));
          setUser(latestUser);
          setFormData({
            name: latestUser.name || '',
            email: latestUser.email || '',
            phone: latestUser.phone || '',
            location: latestUser.address || '',
            ngoDescription: latestUser.ngoDescription || latestUser.description || latestUser.ngoDesc || latestUser.about || '',
          });
        }
      } catch (err) {
        // Keep page functional with local session data if backend fetch fails.
      }
    };

    loadLatestUser();
  }, [user.id]);

  if (!user.id) {
    return null;
  }

  const showNotice = (type, message) => {
    setNotice({ type, message });
    window.setTimeout(() => setNotice({ type: '', message: '' }), 3000);
  };

  const goBackByRole = () => {
    if (user.role === 'ADMIN') navigate('/admin');
    else if (user.role === 'DONOR') navigate('/donor');
    else if (user.role === 'NGO') navigate('/ngo');
    else navigate('/login');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const profileInitial = (user.name || 'U').trim().charAt(0).toUpperCase();
  const ngoDescription =
    user.ngoDescription || user.description || user.ngoDesc || user.about || '';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const startEdit = () => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      location: user.address || '',
      ngoDescription,
    });
    setDraftFixedLocation({ ...ngoFixedLocation });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      location: user.address || '',
      ngoDescription,
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    const nextName = String(formData.name || '').trim();
    const nextEmail = String(formData.email || '').trim();
    const nextPhone = String(formData.phone || '').trim();
    const nextLocation = String(formData.location || '').trim();
    const nextNgoDescription = String(formData.ngoDescription || '').trim();

    if (!nextName || !nextEmail || !nextPhone || !nextLocation) {
      showNotice('error', 'Name, email, phone, and location are required.');
      return;
    }

    if (user.role === 'NGO' && !nextNgoDescription) {
      showNotice('error', 'NGO description cannot be empty.');
      return;
    }

    if (!nextEmail.includes('@')) {
      showNotice('error', 'Please enter a valid email.');
      return;
    }

    if (!nextLocation) {
      showNotice('error', 'Location cannot be empty.');
      return;
    }

    const updatedUser = {
      ...user,
      name: nextName,
      email: nextEmail,
      phone: nextPhone,
      address: nextLocation,
      ngoDescription: user.role === 'NGO' ? nextNgoDescription : user.ngoDescription,
    };

    try {
      setSaving(true);

      try {
        await updateUser(user.id, updatedUser);
      } catch (err) {
        showNotice('error', `Saved locally only: ${getApiErrorMessage(err, 'Unable to sync with backend')}`);
      }

      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setFormData({
        name: updatedUser.name || '',
        email: updatedUser.email || '',
        phone: updatedUser.phone || '',
        location: updatedUser.address || '',
        ngoDescription: updatedUser.ngoDescription || '',
      });

      if (user.role === 'NGO') {
        // keep NGO fixed route location as-is; it is managed separately in this profile page
      }

      setIsEditing(false);
      showNotice('success', 'Profile updated successfully.');
    } finally {
      setSaving(false);
    }
  };

  const saveNgoFixedLocation = () => {
    if (user.role !== 'NGO') return;

    if (!isValidCoordinatePair(draftFixedLocation.latitude, draftFixedLocation.longitude)) {
      showNotice('error', 'Please pick your NGO fixed location on the map first.');
      return;
    }

    const saved = {
      latitude: Number(draftFixedLocation.latitude.toFixed(6)),
      longitude: Number(draftFixedLocation.longitude.toFixed(6)),
    };

    localStorage.setItem(locationStorageKey, JSON.stringify(saved));
    setNgoFixedLocation(saved);
    setShowLocationPicker(false);
    showNotice('success', 'NGO fixed location saved.');
  };

  const clearNgoFixedLocation = () => {
    if (user.role !== 'NGO') return;
    localStorage.removeItem(locationStorageKey);
    const cleared = { latitude: null, longitude: null };
    setNgoFixedLocation(cleared);
    setDraftFixedLocation(cleared);
    setShowLocationPicker(false);
    showNotice('success', 'NGO fixed location cleared.');
  };

  return (
    <>
      <Navbar />
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.topBar}>
            <div style={styles.identityWrap}>
              <div style={styles.avatar}>{profileInitial}</div>
              <div>
                <h2 style={styles.title}>My Profile</h2>
                <p style={styles.subtitle}>Account details and location settings</p>
              </div>
            </div>
            <div style={styles.topActions}>
              {!isEditing && (
                <button onClick={startEdit} style={styles.editBtn}>Edit Profile</button>
              )}
              {isEditing && (
                <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
              {isEditing && (
                <button onClick={cancelEdit} disabled={saving} style={styles.cancelBtn}>Cancel</button>
              )}
              <button onClick={goBackByRole} style={styles.backBtn}>Back</button>
              <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
            </div>
          </div>

          {notice.message && (
            <div style={notice.type === 'success' ? styles.noticeSuccess : styles.noticeError}>
              {notice.message}
            </div>
          )}

          <div style={styles.detailsPanel}>
            <div style={styles.detailRow}>
              <p style={styles.detailKey}>Name</p>
              {isEditing ? (
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  style={styles.inlineInput}
                />
              ) : (
                <p style={styles.detailValue}>{user.name || '-'}</p>
              )}
            </div>
            <div style={styles.detailRow}>
              <p style={styles.detailKey}>Email</p>
              {isEditing ? (
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={styles.inlineInput}
                />
              ) : (
                <p style={styles.detailValue}>{user.email || '-'}</p>
              )}
            </div>
            <div style={styles.detailRow}>
              <p style={styles.detailKey}>Phone</p>
              {isEditing ? (
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  style={styles.inlineInput}
                />
              ) : (
                <p style={styles.detailValue}>{user.phone || '-'}</p>
              )}
            </div>
          </div>

          {user.role === 'NGO' && (
            <div style={styles.detailsPanel}>
              <div style={styles.detailRow}>
                <p style={styles.detailKey}>NGO Description</p>
                {isEditing ? (
                  <textarea
                    name="ngoDescription"
                    value={formData.ngoDescription}
                    onChange={handleInputChange}
                    style={styles.inlineTextarea}
                    placeholder="Describe your NGO and service area"
                  />
                ) : (
                  <p style={styles.detailValue}>
                    {String(ngoDescription).trim() || 'No NGO description found in database.'}
                  </p>
                )}
              </div>
            </div>
          )}

          <div style={styles.detailsPanel}>
            <div style={styles.detailRow}>
              <p style={styles.detailKey}>Location</p>
              {isEditing ? (
                <input
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  style={styles.inlineInput}
                />
              ) : (
                <p style={styles.detailValue}>{user.address || 'Location not set yet.'}</p>
              )}
            </div>
          </div>

          {user.role === 'NGO' && (
            <div style={styles.detailsPanel}>
              <div style={styles.locationPanelHeader}>
                <div>
                  <p style={styles.panelTitle}>NGO Fixed Location</p>
                  <p style={styles.panelSubtitle}>Set once and use route guidance for every donor pickup point.</p>
                </div>
                <div style={styles.panelActions}>
                  <button
                    onClick={() => setShowLocationPicker((prev) => !prev)}
                    style={styles.mapBtn}
                  >
                    {showLocationPicker ? 'Close' : 'Set / Change Location'}
                  </button>
                  <button onClick={clearNgoFixedLocation} style={styles.clearBtn}>Clear</button>
                </div>
              </div>

              <p style={styles.locationMeta}>Current: {ngoFixedLocation.latitude ?? '--'}, {ngoFixedLocation.longitude ?? '--'}</p>

              {showLocationPicker && (
                <div style={{ marginTop: '10px' }}>
                  <MapPicker
                    latitude={draftFixedLocation.latitude}
                    longitude={draftFixedLocation.longitude}
                    onLocationChange={(lat, lng) => setDraftFixedLocation({ latitude: lat, longitude: lng })}
                  />
                  <p style={styles.locationMeta}>Selected: {draftFixedLocation.latitude ?? '--'}, {draftFixedLocation.longitude ?? '--'}</p>
                  <button onClick={saveNgoFixedLocation} style={styles.saveLocationBtn}>Save NGO Location</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const styles = {
  page: {
    maxWidth: '980px',
    margin: '0 auto',
    padding: '28px 18px 40px',
  },
  card: {
    background: 'linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)',
    border: '1px solid #d6e4ef',
    borderRadius: '18px',
    padding: '24px',
    boxShadow: '0 14px 30px rgba(16, 39, 56, 0.09)',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '14px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
  identityWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(140deg, #115b8d 0%, #28a197 100%)',
    color: '#fff',
    fontWeight: 800,
    fontSize: '20px',
  },
  title: {
    margin: 0,
    color: '#123a58',
    fontSize: '34px',
    lineHeight: 1.05,
  },
  subtitle: {
    margin: '6px 0 0 0',
    color: '#5c7387',
    fontSize: '15px',
  },
  rolePill: {
    display: 'none',
  },
  topActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  backBtn: {
    border: '1px solid #c7d8e8',
    backgroundColor: '#fff',
    color: '#17405c',
    borderRadius: '10px',
    padding: '9px 13px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  logoutBtn: {
    border: 'none',
    backgroundColor: '#e14d2a',
    color: '#fff',
    borderRadius: '10px',
    padding: '9px 13px',
    cursor: 'pointer',
    fontWeight: 700,
  },
  detailsPanel: {
    backgroundColor: '#f8fcff',
    border: '1px solid #d6e6f2',
    borderRadius: '12px',
    padding: '6px 14px',
    marginBottom: '18px',
  },
  detailRow: {
    display: 'grid',
    gridTemplateColumns: '130px 1fr',
    gap: '12px',
    alignItems: 'start',
    padding: '12px 0',
    borderBottom: '1px solid #e1edf6',
  },
  detailKey: {
    margin: 0,
    color: '#6b8296',
    fontSize: '13px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.35px',
  },
  detailValue: {
    margin: 0,
    color: '#17364d',
    fontSize: '15px',
    fontWeight: 600,
    overflowWrap: 'anywhere',
  },
  inlineInput: {
    width: '100%',
    border: '1px solid #bfd5e7',
    borderRadius: '10px',
    padding: '10px 11px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#17364d',
    backgroundColor: '#fff',
  },
  inlineTextarea: {
    width: '100%',
    minHeight: '90px',
    resize: 'vertical',
    border: '1px solid #bfd5e7',
    borderRadius: '10px',
    padding: '10px 11px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#17364d',
    backgroundColor: '#fff',
    fontFamily: 'inherit',
    lineHeight: 1.5,
  },
  locationCard: {
    backgroundColor: '#f6fbff',
    border: '1px solid #d8e8f4',
    borderRadius: '14px',
    padding: '16px',
    marginBottom: '14px',
  },
  locationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  locationTitle: {
    margin: 0,
    color: '#17405c',
    fontSize: '22px',
  },
  locationValue: {
    margin: 0,
    fontSize: '15px',
    color: '#2a4b63',
    lineHeight: 1.5,
  },
  editBtn: {
    border: 'none',
    backgroundColor: '#1b6ca8',
    color: '#fff',
    borderRadius: '10px',
    padding: '9px 14px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '13px',
  },
  mutedText: {
    margin: 0,
    color: '#5c7387',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    color: '#27475f',
    fontWeight: 600,
  },
  input: {
    width: '100%',
    border: '1px solid #bfd5e7',
    borderRadius: '10px',
    padding: '11px 12px',
    fontSize: '15px',
    color: '#163047',
    backgroundColor: '#fff',
  },
  textarea: {
    width: '100%',
    minHeight: '96px',
    resize: 'vertical',
    border: '1px solid #bfd5e7',
    borderRadius: '10px',
    padding: '11px 12px',
    fontSize: '15px',
    color: '#163047',
    backgroundColor: '#fff',
    fontFamily: 'inherit',
  },
  editActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
  },
  saveBtn: {
    border: 'none',
    backgroundColor: '#1f8a70',
    color: '#fff',
    borderRadius: '10px',
    padding: '10px 15px',
    cursor: 'pointer',
    fontWeight: 700,
  },
  cancelBtn: {
    border: '1px solid #c7d8e8',
    backgroundColor: '#fff',
    color: '#17405c',
    borderRadius: '10px',
    padding: '10px 15px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  noticeSuccess: {
    backgroundColor: '#eafaf1',
    color: '#1e8449',
    border: '1px solid #c3e6cb',
    padding: '11px 12px',
    borderRadius: '10px',
    marginBottom: '12px',
    fontSize: '14px',
  },
  noticeError: {
    backgroundColor: '#ffecec',
    color: '#a53434',
    border: '1px solid #ffd2d2',
    padding: '11px 12px',
    borderRadius: '10px',
    marginBottom: '12px',
    fontSize: '14px',
  },
  locationPanelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  panelTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 800,
    color: '#17405c',
  },
  panelSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#5c7387',
  },
  panelActions: {
    display: 'flex',
    gap: '8px',
  },
  mapBtn: {
    border: 'none',
    backgroundColor: '#1b6ca8',
    color: '#fff',
    borderRadius: '10px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 700,
  },
  clearBtn: {
    border: 'none',
    backgroundColor: '#8396a5',
    color: '#fff',
    borderRadius: '10px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 700,
  },
  saveLocationBtn: {
    marginTop: '8px',
    border: 'none',
    backgroundColor: '#1f8a70',
    color: '#fff',
    borderRadius: '10px',
    padding: '9px 13px',
    cursor: 'pointer',
    fontWeight: 700,
  },
  locationMeta: {
    marginTop: '8px',
    marginBottom: 0,
    fontSize: '13px',
    color: '#31495d',
  },
};
