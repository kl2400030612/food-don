import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvailableFoods, getWarehouseFoods, getFoods, createRequest, getRequestsByNgo, getNotificationsByUser, getApiErrorMessage } from '../services/api';
import Navbar from '../components/Navbar';
import FoodLocationMap from '../components/FoodLocationMap';
import { getStoredUser } from '../services/auth';

const isValidCoordinatePair = (lat, lng) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  // Treat 0,0 as unset location for this app.
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

const getFoodImageSrc = (food) => {
  if (!food || typeof food !== 'object') return '';

  const direct =
    food.imageUrl ||
    food.photoUrl ||
    food.foodImageUrl ||
    food.image ||
    '';

  if (typeof direct === 'string' && direct.trim()) {
    return direct;
  }

  const base64 = food.imageBase64 || food.photoBase64 || food.foodImageBase64 || '';
  if (typeof base64 === 'string' && base64.trim()) {
    if (base64.startsWith('data:image/')) return base64;
    return `data:image/jpeg;base64,${base64}`;
  }

  return '';
};

export default function NgoDashboard() {
  const user = getStoredUser() || {};
  const locationStorageKey = `ngo-fixed-location-${user.id || 'unknown'}`;

  const [foods, setFoods] = useState([]);
  const [allFoods, setAllFoods] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [foodDetailsWarning, setFoodDetailsWarning] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [requestingFoodId, setRequestingFoodId] = useState(null);
  const [tab, setTab] = useState('available'); // 'available' or 'requests'
  const [ngoLocation, setNgoLocation] = useState(() => {
    const stored = parseStoredLocation(localStorage.getItem(locationStorageKey));
    if (stored) return stored;
    const lat = Number(user.latitude);
    const lng = Number(user.longitude);
    if (isValidCoordinatePair(lat, lng)) {
      return { latitude: lat, longitude: lng };
    }
    return { latitude: null, longitude: null };
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!user.id || user.role !== 'NGO') {
      navigate('/login');
      return;
    }
    loadData();
  }, [navigate, user.id, user.role]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      await Promise.all([loadAvailableFoods(), loadAllFoods(), loadMyRequests(), loadNotifications()]);
    } catch (err) {
      setError('Error loading data: ' + getApiErrorMessage(err, 'Unable to load dashboard data'));
    } finally {
      setLoading(false);
    }
  };

  const showNotice = (type, message) => {
    setNotice({ type, message });
    window.setTimeout(() => {
      setNotice({ type: '', message: '' });
    }, 3000);
  };

  const loadAvailableFoods = async () => {
    try {
      const response = await getAvailableFoods();
      const sortedFoods = (response.data || []).slice().sort((a, b) => {
        const aTime = new Date(a?.createdAt || 0).getTime();
        const bTime = new Date(b?.createdAt || 0).getTime();

        if (aTime !== bTime) {
          return bTime - aTime;
        }

        return Number(b?.id || 0) - Number(a?.id || 0);
      });

      setFoods(sortedFoods);
    } catch (err) {
      setError('Error loading available foods: ' + getApiErrorMessage(err, 'Unable to load available foods'));
    }
  };

  const loadAllFoods = async () => {
    const mergedById = {};
    let hasAnyFoodSource = false;

    const mergeFoods = (items) => {
      if (!Array.isArray(items)) return;
      items.forEach((item) => {
        if (item && item.id !== undefined && item.id !== null) {
          mergedById[item.id] = item;
          hasAnyFoodSource = true;
        }
      });
    };

    try {
      const result = await Promise.allSettled([
        getFoods(),
        getAvailableFoods(),
        getWarehouseFoods(),
      ]);

      result.forEach((entry) => {
        if (entry.status === 'fulfilled') {
          mergeFoods(entry.value?.data);
        }
      });

      const mergedFoods = Object.values(mergedById);
      setAllFoods(mergedFoods);

      if (hasAnyFoodSource) {
        setFoodDetailsWarning('');
      } else {
        setFoodDetailsWarning('Food details are partially unavailable right now.');
      }
    } catch (err) {
      setAllFoods([]);
      setFoodDetailsWarning('Food details are partially unavailable right now.');
    }
  };

  const loadMyRequests = async () => {
    try {
      const response = await getRequestsByNgo(user.id);
      setRequests(response.data);
    } catch (err) {
      setError('Error loading requests: ' + getApiErrorMessage(err, 'Unable to load requests'));
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await getNotificationsByUser(user.id);
      setNotifications(response.data || []);
    } catch (err) {
      setError('Error loading notifications: ' + getApiErrorMessage(err, 'Unable to load notifications'));
    }
  };

  const handleRequestFood = async (foodId) => {
    try {
      setRequestingFoodId(foodId);
      const requestData = {
        foodId: foodId,
        ngoId: user.id,
        status: 'PENDING',
      };

      await createRequest(requestData);
      showNotice('success', 'Request submitted. Waiting for admin approval.');
      await loadData();
    } catch (err) {
      showNotice('error', 'Error creating request: ' + getApiErrorMessage(err, 'Unable to submit request'));
    } finally {
      setRequestingFoodId(null);
    }
  };

  const isAlreadyRequested = (foodId) => {
    return requests.some((req) => req.foodId === foodId);
  };

  const pendingCount = requests.filter((req) => req.status === 'PENDING').length;
  const approvedCount = requests.filter((req) => req.status === 'APPROVED').length;
  const allFoodsById = allFoods.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  return (
    <>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>NGO Coordination Hub</h1>
          <p style={styles.heroSubtitle}>Find nearby donations, trace route to pickup points, and manage your requests in one place.</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {notice.message && (
          <div style={notice.type === 'success' ? styles.noticeSuccess : styles.noticeError}>
            {notice.message}
          </div>
        )}

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Available Foods</p>
            <p style={styles.statValue}>{foods.length}</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>My Requests</p>
            <p style={styles.statValue}>{requests.length}</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Pending</p>
            <p style={styles.statValue}>{pendingCount}</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Approved</p>
            <p style={styles.statValue}>{approvedCount}</p>
          </div>
        </div>

        <div style={styles.tabs}>
          <button
            onClick={() => setTab('available')}
            style={{
              ...styles.tabBtn,
              ...(tab === 'available' ? styles.tabBtnActive : {}),
            }}
          >
            📦 Available Foods ({foods.length})
          </button>
          <button
            onClick={() => setTab('requests')}
            style={{
              ...styles.tabBtn,
              ...(tab === 'requests' ? styles.tabBtnActive : {}),
            }}
          >
            📋 My Requests ({requests.length})
          </button>
          <button
            onClick={() => setTab('notifications')}
            style={{
              ...styles.tabBtn,
              ...(tab === 'notifications' ? styles.tabBtnActive : {}),
            }}
          >
            🔔 Priority Alerts ({notifications.length})
          </button>
        </div>

        {loading ? (
          <p>Loading data...</p>
        ) : (
          <>
            {tab === 'available' && (
              <div>
                <h2>Available Foods to Request</h2>

                {foods.length === 0 ? (
                  <p>No available foods at the moment.</p>
                ) : (
                  <div style={styles.foodsGrid}>
                    {foods.map((food) => (
                      <div key={food.id} style={styles.foodCard}>
                        {getFoodImageSrc(food) && (
                          <img src={getFoodImageSrc(food)} alt={food.title || 'Food'} style={styles.foodImage} />
                        )}
                        <div style={styles.foodCardHeader}>
                          <h3 style={styles.foodTitle}>{food.title}</h3>
                          <span style={styles.availableBadge}>Available</span>
                        </div>

                        <div style={styles.foodMetaGrid}>
                          <div style={styles.metaItem}>
                            <p style={styles.metaLabel}>Quantity</p>
                            <p style={styles.metaValue}>{food.quantity} kg</p>
                          </div>
                          <div style={styles.metaItem}>
                            <p style={styles.metaLabel}>Expiry</p>
                            <p style={styles.metaValue}>{new Date(food.expiryDate).toLocaleDateString()}</p>
                          </div>
                          <div style={styles.metaItemFull}>
                            <p style={styles.metaLabel}>Pickup Location</p>
                            <p style={styles.metaValue}>{food.location}</p>
                          </div>
                          <div style={styles.metaItemFull}>
                            <p style={styles.metaLabel}>Donor</p>
                            <p style={styles.metaValue}>ID: {food.donorId}</p>
                          </div>
                        </div>

                        <FoodLocationMap
                          latitude={food.latitude}
                          longitude={food.longitude}
                          ngoLatitude={ngoLocation.latitude}
                          ngoLongitude={ngoLocation.longitude}
                        />

                        <div style={styles.foodCardFooter}>
                          <p style={styles.timestamp}>
                            Posted: {new Date(food.createdAt).toLocaleString()}
                          </p>
                          {isAlreadyRequested(food.id) ? (
                            <button style={styles.requestedBtn} disabled>
                              Already Requested
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRequestFood(food.id)}
                              disabled={requestingFoodId === food.id}
                              style={styles.requestBtn}
                            >
                              {requestingFoodId === food.id ? 'Requesting...' : 'Request Food'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'requests' && (
              <div>
                <h2>Your Food Requests</h2>
                {foodDetailsWarning && <p style={styles.subtleWarning}>{foodDetailsWarning}</p>}
                {requests.length === 0 ? (
                  <p>You haven't made any requests yet.</p>
                ) : (
                  <div style={styles.requestCardsGrid}>
                    {requests.map((req) => {
                      const food = allFoodsById[req.foodId] || {};
                      return (
                        <div key={req.id} style={styles.requestCard}>
                          {getFoodImageSrc(food) && (
                            <img src={getFoodImageSrc(food)} alt={food.title || 'Food'} style={styles.requestImage} />
                          )}
                          <div style={styles.requestCardHeader}>
                            <h3 style={styles.requestCardTitle}>{food.title || req.foodTitle || req.title || `Food #${req.foodId}`}</h3>
                            <span style={{ ...styles.requestStatusBadge, ...getBadgeStyle(req.status) }}>
                              {req.status}
                            </span>
                          </div>

                          <div style={styles.requestMetaGrid}>
                            <div style={styles.requestMetaItem}>
                              <p style={styles.requestMetaLabel}>Food ID</p>
                              <p style={styles.requestMetaValue}>{req.foodId}</p>
                            </div>
                            <div style={styles.requestMetaItem}>
                              <p style={styles.requestMetaLabel}>Donor ID</p>
                              <p style={styles.requestMetaValue}>{food.donorId ?? req.donorId ?? 'Not available'}</p>
                            </div>
                            <div style={styles.requestMetaItem}>
                              <p style={styles.requestMetaLabel}>Quantity</p>
                              <p style={styles.requestMetaValue}>{food.quantity ? `${food.quantity} kg` : req.quantity ? `${req.quantity} kg` : 'Not available'}</p>
                            </div>
                            <div style={styles.requestMetaItem}>
                              <p style={styles.requestMetaLabel}>Expiry Date</p>
                              <p style={styles.requestMetaValue}>
                                {food.expiryDate ? new Date(food.expiryDate).toLocaleDateString() : req.expiryDate ? new Date(req.expiryDate).toLocaleDateString() : 'Not available'}
                              </p>
                            </div>
                            <div style={styles.requestMetaItemFull}>
                              <p style={styles.requestMetaLabel}>Pickup Location</p>
                              <p style={styles.requestMetaValue}>{food.location || req.location || 'Not available'}</p>
                            </div>
                          </div>

                          <p style={styles.requestCreatedAt}>Requested At: {new Date(req.createdAt).toLocaleString()}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === 'notifications' && (
              <div>
                <h2>Nearest NGO Priority Notifications</h2>
                {notifications.length === 0 ? (
                  <p>No priority notifications yet.</p>
                ) : (
                  <div style={styles.notificationList}>
                    {notifications.map((note) => (
                      <div key={note.id} style={styles.notificationCard}>
                        <p style={styles.notificationMessage}>{note.message}</p>
                        <p style={styles.notificationMeta}>Food ID: {note.foodId}</p>
                        <p style={styles.notificationMeta}>
                          {note.createdAt ? new Date(note.createdAt).toLocaleString() : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div style={styles.info}>
          <p>
            📌 Request available foods from donors. Admin will approve your
            requests.
          </p>
        </div>
      </div>
    </>
  );
}

function getStatusStyle(status) {
  switch (status) {
    case 'PENDING':
      return { color: '#f39c12', fontWeight: 'bold' };
    case 'APPROVED':
      return { color: '#27ae60', fontWeight: 'bold' };
    case 'REJECTED':
      return { color: '#e74c3c', fontWeight: 'bold' };
    default:
      return {};
  }
}

function getBadgeStyle(status) {
  switch (status) {
    case 'PENDING':
      return { backgroundColor: '#fff4db', color: '#a86a00' };
    case 'APPROVED':
      return { backgroundColor: '#eafaf1', color: '#1e8449' };
    case 'REJECTED':
      return { backgroundColor: '#ffe6e6', color: '#c0392b' };
    default:
      return { backgroundColor: '#ecf0f1', color: '#2c3e50' };
  }
}

const styles = {
  container: {
    maxWidth: '1240px',
    margin: '0 auto',
    padding: '24px 20px 36px',
  },
  hero: {
    background: 'linear-gradient(120deg, #114b7a 0%, #1f8a70 52%, #7ddf9d 100%)',
    borderRadius: '16px',
    padding: '20px 22px',
    color: '#fff',
    boxShadow: '0 12px 30px rgba(17, 70, 94, 0.24)',
    marginBottom: '16px',
  },
  heroTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 800,
  },
  heroSubtitle: {
    margin: '8px 0 0 0',
    color: 'rgba(255,255,255,0.92)',
    maxWidth: '760px',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '10px',
    marginBottom: '16px',
  },
  statCard: {
    backgroundColor: '#fff',
    border: '1px solid #d8e8f1',
    borderRadius: '12px',
    padding: '12px 14px',
    boxShadow: '0 6px 16px rgba(16, 39, 56, 0.08)',
  },
  statLabel: {
    margin: 0,
    fontSize: '12px',
    color: '#5f7488',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 700,
  },
  statValue: {
    margin: '4px 0 0 0',
    fontSize: '24px',
    fontWeight: 800,
    color: '#17364d',
  },
  error: {
    backgroundColor: '#fff1f1',
    color: '#a53434',
    padding: '12px 14px',
    borderRadius: '10px',
    marginBottom: '14px',
    border: '1px solid #ffd2d2',
  },
  noticeSuccess: {
    backgroundColor: '#e8fbf2',
    color: '#1f7a49',
    padding: '12px',
    borderRadius: '10px',
    marginBottom: '14px',
    border: '1px solid #c3e6cb',
  },
  noticeError: {
    backgroundColor: '#fff3f3',
    color: '#a53434',
    padding: '12px',
    borderRadius: '10px',
    marginBottom: '14px',
    border: '1px solid #f5c6cb',
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '16px',
    borderBottom: '2px solid #dfeaf2',
  },
  tabBtn: {
    backgroundColor: '#f0f6fb',
    border: '1px solid #d7e5f1',
    padding: '10px 14px',
    cursor: 'pointer',
    fontSize: '14px',
    borderRadius: '10px 10px 0 0',
    fontWeight: 700,
    color: '#20435d',
  },
  tabBtnActive: {
    backgroundColor: '#1b6ca8',
    color: '#fff',
    borderColor: '#1b6ca8',
  },
  foodsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '18px',
    marginTop: '20px',
  },
  foodCard: {
    backgroundColor: '#fff',
    padding: '16px',
    borderRadius: '14px',
    boxShadow: '0 10px 22px rgba(15, 40, 59, 0.09)',
    border: '1px solid #dfeaf2',
    borderLeft: '5px solid #1f8a70',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  foodImage: {
    width: '100%',
    height: '180px',
    objectFit: 'cover',
    borderRadius: '10px',
    border: '1px solid #dbe8f2',
  },
  foodCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
  },
  foodTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 800,
    color: '#14324a',
    textTransform: 'capitalize',
  },
  availableBadge: {
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    borderRadius: '999px',
    backgroundColor: '#e6f8f2',
    color: '#1f8a70',
    border: '1px solid #bde9da',
    padding: '6px 10px',
  },
  foodMetaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  metaItem: {
    backgroundColor: '#f7fbff',
    border: '1px solid #e2edf5',
    borderRadius: '8px',
    padding: '8px 10px',
  },
  metaItemFull: {
    gridColumn: '1 / -1',
    backgroundColor: '#f7fbff',
    border: '1px solid #e2edf5',
    borderRadius: '8px',
    padding: '8px 10px',
  },
  metaLabel: {
    margin: 0,
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    fontWeight: 700,
    color: '#6b8297',
  },
  metaValue: {
    margin: '2px 0 0 0',
    fontSize: '15px',
    color: '#17364d',
    fontWeight: 600,
  },
  foodCardFooter: {
    marginTop: 'auto',
  },
  requestBtn: {
    backgroundColor: '#1f8a70',
    color: '#fff',
    border: 'none',
    padding: '10px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '8px',
    fontSize: '14px',
    fontWeight: 700,
    width: '100%',
    boxShadow: '0 8px 18px rgba(31, 138, 112, 0.28)',
  },
  requestedBtn: {
    backgroundColor: '#8396a5',
    color: '#fff',
    border: 'none',
    padding: '10px 14px',
    borderRadius: '8px',
    cursor: 'not-allowed',
    marginTop: '8px',
    fontSize: '14px',
    fontWeight: 700,
    width: '100%',
  },
  timestamp: {
    fontSize: '12px',
    color: '#7f8c8d',
    marginTop: '10px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    boxShadow: '0 8px 18px rgba(16, 40, 58, 0.08)',
    backgroundColor: '#fff',
    borderRadius: '10px',
    overflow: 'hidden',
    marginTop: '20px',
  },
  requestCardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '14px',
    marginTop: '12px',
  },
  requestCard: {
    backgroundColor: '#fff',
    border: '1px solid #dceaf4',
    borderRadius: '12px',
    padding: '14px',
    boxShadow: '0 8px 18px rgba(16, 40, 58, 0.08)',
  },
  requestImage: {
    width: '100%',
    height: '150px',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '1px solid #dbe8f2',
    marginBottom: '10px',
  },
  requestCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  requestCardTitle: {
    margin: 0,
    color: '#163047',
    fontSize: '20px',
    fontWeight: 800,
    textTransform: 'capitalize',
  },
  requestStatusBadge: {
    padding: '5px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
  },
  requestMetaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  requestMetaItem: {
    backgroundColor: '#f7fbff',
    border: '1px solid #e2edf5',
    borderRadius: '8px',
    padding: '8px 10px',
  },
  requestMetaItemFull: {
    gridColumn: '1 / -1',
    backgroundColor: '#f7fbff',
    border: '1px solid #e2edf5',
    borderRadius: '8px',
    padding: '8px 10px',
  },
  requestMetaLabel: {
    margin: 0,
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    fontWeight: 700,
    color: '#6b8297',
  },
  requestMetaValue: {
    margin: '2px 0 0 0',
    fontSize: '14px',
    color: '#17364d',
    fontWeight: 600,
    overflowWrap: 'anywhere',
  },
  requestCreatedAt: {
    margin: '10px 0 0 0',
    fontSize: '12px',
    color: '#5d6d7e',
    fontWeight: 600,
  },
  subtleWarning: {
    margin: '6px 0 12px 0',
    fontSize: '13px',
    color: '#8b5e0a',
    backgroundColor: '#fff7df',
    border: '1px solid #f1dfaa',
    borderRadius: '8px',
    padding: '8px 10px',
  },
  info: {
    marginTop: '26px',
    padding: '14px 15px',
    backgroundColor: '#eef7fb',
    borderRadius: '10px',
    border: '1px solid #d9ebf5',
  },
  notificationList: {
    display: 'grid',
    gap: '12px',
    marginTop: '12px',
  },
  notificationCard: {
    backgroundColor: '#fff',
    border: '1px solid #dceaf4',
    borderRadius: '10px',
    padding: '12px',
    boxShadow: '0 6px 14px rgba(16, 40, 58, 0.06)',
  },
  notificationMessage: {
    color: '#1f2d3d',
    fontWeight: 'bold',
    marginBottom: '6px',
  },
  notificationMeta: {
    color: '#5d6d7e',
    fontSize: '12px',
    marginBottom: '4px',
  },
};

