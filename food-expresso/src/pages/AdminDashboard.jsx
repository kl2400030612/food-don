import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRequests, approveRequest, getWarehouseFoods, getUsers, createAdminUser, getApiErrorMessage } from '../services/api';
import Navbar from '../components/Navbar';
import FoodLocationMap from '../components/FoodLocationMap';
import { getStoredUser } from '../services/auth';

export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [warehouseFoods, setWarehouseFoods] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [approvingId, setApprovingId] = useState(null);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
  });
  const [tab, setTab] = useState('requests');
  const navigate = useNavigate();

  useEffect(() => {
    const user = getStoredUser() || {};
    if (!user.id || user.role !== 'ADMIN') {
      navigate('/login');
      return;
    }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      await Promise.all([loadRequests(), loadWarehouseFoods(), loadUsers()]);
    } catch (err) {
      setError('Error loading admin data: ' + getApiErrorMessage(err, 'Unable to load admin data'));
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      const response = await getRequests();
      const sortedRequests = [...(response.data || [])].sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });
      setRequests(sortedRequests);
    } catch (err) {
      setError('Error loading requests: ' + getApiErrorMessage(err, 'Unable to load requests'));
    }
  };

  const loadWarehouseFoods = async () => {
    try {
      const response = await getWarehouseFoods();
      setWarehouseFoods(response.data || []);
    } catch (err) {
      setError('Error loading warehouse foods: ' + getApiErrorMessage(err, 'Unable to load warehouse foods'));
    }
  };

  const loadUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.data || []);
    } catch (err) {
      setError('Error loading users: ' + getApiErrorMessage(err, 'Unable to load users'));
    }
  };

  const showNotice = (type, message) => {
    setNotice({ type, message });
    window.setTimeout(() => {
      setNotice({ type: '', message: '' });
    }, 3000);
  };

  const handleApprove = async (requestId) => {
    try {
      setApprovingId(requestId);
      await approveRequest(requestId);
      showNotice('success', 'Request approved successfully');
      await loadData();
    } catch (err) {
      showNotice('error', 'Error approving request: ' + getApiErrorMessage(err, 'Unable to approve request'));
    } finally {
      setApprovingId(null);
    }
  };

  const handleAdminInput = (e) => {
    const { name, value } = e.target;
    setAdminForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!adminForm.name || !adminForm.email || !adminForm.password || !adminForm.phone || !adminForm.address) {
      showNotice('error', 'All admin fields are required');
      return;
    }

    if (adminForm.password.length < 4) {
      showNotice('error', 'Admin password must be at least 4 characters');
      return;
    }

    try {
      setCreatingAdmin(true);
      await createAdminUser({
        ...adminForm,
        role: 'ADMIN',
      });
      setAdminForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        address: '',
      });
      await loadUsers();
      showNotice('success', 'New admin created successfully');
    } catch (err) {
      showNotice('error', 'Unable to create admin: ' + getApiErrorMessage(err, 'Admin creation failed'));
    } finally {
      setCreatingAdmin(false);
    }
  };

  const getUserById = (id) => users.find((u) => Number(u.id) === Number(id));

  const getNgoDisplayName = (ngo, ngoId) => {
    const rawName = String(ngo?.name || '').trim();
    if (rawName) return rawName;
    return `NGO #${ngoId}`;
  };

  const formatValue = (value, fallback = 'Not available') => {
    if (value === null || value === undefined || value === '') return fallback;
    return value;
  };

  const formatDateTime = (value) => {
    if (!value) return 'Not available';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
  };

  const pendingCount = requests.filter((req) => req.status === 'PENDING').length;
  const approvedCount = requests.filter((req) => req.status === 'APPROVED').length;

  return (
    <>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>Admin Control Center</h1>
          <p style={styles.heroSubtitle}>Track request lifecycle, verify NGO details, and coordinate warehouse-ready allocations.</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {notice.message && (
          <div style={notice.type === 'success' ? styles.noticeSuccess : styles.noticeError}>
            {notice.message}
          </div>
        )}

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Total Requests</p>
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
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Warehouse</p>
            <p style={styles.statValue}>{warehouseFoods.length}</p>
          </div>
        </div>

        <div style={styles.tabs}>
          <button
            onClick={() => setTab('requests')}
            style={{ ...styles.tabBtn, ...(tab === 'requests' ? styles.tabBtnActive : {}) }}
          >
            📋 Requests ({requests.length})
          </button>
          <button
            onClick={() => setTab('warehouse')}
            style={{ ...styles.tabBtn, ...(tab === 'warehouse' ? styles.tabBtnActive : {}) }}
          >
            🏢 Warehouse ({warehouseFoods.length})
          </button>
          <button
            onClick={() => setTab('settings')}
            style={{ ...styles.tabBtn, ...(tab === 'settings' ? styles.tabBtnActive : {}) }}
          >
            ⚙️ Settings
          </button>
        </div>

        {loading ? (
          <p>Loading requests...</p>
        ) : (
          <>
            {tab === 'requests' && (
              <>
                <p style={styles.count}>Total Requests: {requests.length}</p>
                {requests.length === 0 ? (
                  <p>No requests found.</p>
                ) : (
                  <div style={styles.requestList}>
                    {requests.map((req) => {
                      const ngo = getUserById(req.ngoId);
                      return (
                        <div key={req.id} style={styles.requestRow}>
                          <div style={styles.requestRowHeader}>
                            <div style={styles.requestHeaderCopy}>
                              <h3 style={styles.requestTitle}>Request #{req.id}</h3>
                              <p style={styles.requestSummaryText}>
                                {getNgoDisplayName(ngo, req.ngoId)} · ID {formatValue(req.ngoId)} · {formatDateTime(req.createdAt)}
                              </p>
                            </div>
                            <div style={styles.requestHeaderActions}>
                              <span style={{ ...styles.statusBadge, ...getBadgeStyle(req.status) }}>
                                {formatValue(req.status)}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedRequest({ req, ngo })}
                                style={styles.infoIconBtn}
                                aria-label={`View details for request ${req.id}`}
                                title="View full request details"
                              >
                                i
                              </button>
                            </div>
                          </div>

                          <div style={styles.requestActionsRow}>
                            {req.status === 'PENDING' ? (
                              <button
                                onClick={() => handleApprove(req.id)}
                                disabled={approvingId === req.id}
                                style={styles.approveBtn}
                              >
                                {approvingId === req.id ? 'Approving...' : 'Approve Request'}
                              </button>
                            ) : (
                              <span style={styles.approvedLabel}>Request already processed</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {tab === 'warehouse' && (
              <>
                <p style={styles.count}>Warehouse Food Items: {warehouseFoods.length}</p>
                {warehouseFoods.length === 0 ? (
                  <p>No warehouse food found.</p>
                ) : (
                  <div style={styles.warehouseGrid}>
                    {warehouseFoods.map((food) => (
                      <div key={food.id} style={styles.warehouseCard}>
                        <h3>{food.title}</h3>
                        <p><strong>Status:</strong> {food.status}</p>
                        <p><strong>Quantity:</strong> {food.quantity} kg</p>
                        <p><strong>Pickup:</strong> {food.location}</p>
                        <FoodLocationMap latitude={food.latitude} longitude={food.longitude} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === 'settings' && (
              <div style={styles.settingsGrid}>
                <div style={styles.adminCreateCard}>
                  <h3 style={styles.adminCreateTitle}>Create Official Admin User</h3>
                  <p style={styles.adminCreateSub}>Only logged-in admins can create additional admin accounts with full admin policies.</p>
                  <form style={styles.adminCreateForm} onSubmit={handleCreateAdmin}>
                    <input name="name" value={adminForm.name} onChange={handleAdminInput} placeholder="Full Name" style={styles.adminInput} />
                    <input name="email" type="email" value={adminForm.email} onChange={handleAdminInput} placeholder="Email" style={styles.adminInput} />
                    <input name="password" type="password" value={adminForm.password} onChange={handleAdminInput} placeholder="Password" style={styles.adminInput} />
                    <input name="phone" value={adminForm.phone} onChange={handleAdminInput} placeholder="Phone" style={styles.adminInput} />
                    <input name="address" value={adminForm.address} onChange={handleAdminInput} placeholder="Address" style={styles.adminInput} />
                    <button type="submit" disabled={creatingAdmin} style={styles.createAdminBtn}>
                      {creatingAdmin ? 'Creating...' : 'Create Admin'}
                    </button>
                  </form>
                </div>

                <div style={styles.adminCreateCard}>
                  <h3 style={styles.adminCreateTitle}>Audit Logs</h3>
                  <p style={styles.adminCreateSub}>Open the complete activity log for all admin-visible actions in the system.</p>
                  <button
                    style={styles.auditBtn}
                    onClick={() => navigate('/admin/logs')}
                  >
                    Open Audit Logs
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {selectedRequest && (
          <div style={styles.detailsOverlay} onClick={() => setSelectedRequest(null)}>
            <div style={styles.detailsModal} onClick={(event) => event.stopPropagation()}>
              <div style={styles.detailsHeader}>
                <div>
                  <h3 style={styles.detailsTitle}>Request #{selectedRequest.req.id}</h3>
                  <p style={styles.detailsSubtitle}>
                    {getNgoDisplayName(selectedRequest.ngo, selectedRequest.req.ngoId)} · ID {formatValue(selectedRequest.req.ngoId)}
                  </p>
                </div>
                <button type="button" onClick={() => setSelectedRequest(null)} style={styles.detailsCloseBtn} aria-label="Close details">
                  ×
                </button>
              </div>

              <div style={styles.requestInfoGrid}>
                <div style={styles.requestInfoItem}>
                  <p style={styles.requestInfoLabel}>NGO Name</p>
                  <p style={styles.requestInfoValue}>{getNgoDisplayName(selectedRequest.ngo, selectedRequest.req.ngoId)}</p>
                </div>
                <div style={styles.requestInfoItem}>
                  <p style={styles.requestInfoLabel}>NGO Email</p>
                  <p style={styles.requestInfoValue}>{formatValue(selectedRequest.ngo?.email)}</p>
                </div>
                <div style={styles.requestInfoItem}>
                  <p style={styles.requestInfoLabel}>NGO Phone</p>
                  <p style={styles.requestInfoValue}>{formatValue(selectedRequest.ngo?.phone)}</p>
                </div>
                <div style={styles.requestInfoItem}>
                  <p style={styles.requestInfoLabel}>NGO Address</p>
                  <p style={styles.requestInfoValue}>{formatValue(selectedRequest.ngo?.address)}</p>
                </div>
                <div style={styles.requestInfoItem}>
                  <p style={styles.requestInfoLabel}>NGO ID</p>
                  <p style={styles.requestInfoValue}>{formatValue(selectedRequest.req.ngoId)}</p>
                </div>
                <div style={styles.requestInfoItem}>
                  <p style={styles.requestInfoLabel}>Food ID</p>
                  <p style={styles.requestInfoValue}>{formatValue(selectedRequest.req.foodId)}</p>
                </div>
                <div style={styles.requestInfoItem}>
                  <p style={styles.requestInfoLabel}>Food Title</p>
                  <p style={styles.requestInfoValue}>{formatValue(selectedRequest.req.foodTitle || selectedRequest.req.title)}</p>
                </div>
                <div style={styles.requestInfoItem}>
                  <p style={styles.requestInfoLabel}>Quantity</p>
                  <p style={styles.requestInfoValue}>{formatValue(selectedRequest.req.quantity)}</p>
                </div>
                <div style={{ ...styles.requestInfoItem, gridColumn: '1 / -1' }}>
                  <p style={styles.requestInfoLabel}>Pickup Location</p>
                  <p style={styles.requestInfoValue}>{formatValue(selectedRequest.req.location)}</p>
                </div>
                <div style={styles.requestInfoItem}>
                  <p style={styles.requestInfoLabel}>Requested At</p>
                  <p style={styles.requestInfoValue}>{formatDateTime(selectedRequest.req.createdAt)}</p>
                </div>
                <div style={styles.requestInfoItem}>
                  <p style={styles.requestInfoLabel}>Approved At</p>
                  <p style={styles.requestInfoValue}>{formatDateTime(selectedRequest.req.updatedAt)}</p>
                </div>
                <div style={styles.requestInfoItem}>
                  <p style={styles.requestInfoLabel}>Status</p>
                  <p style={styles.requestInfoValue}>{formatValue(selectedRequest.req.status)}</p>
                </div>
              </div>

              <div style={styles.detailsFooter}>
                {selectedRequest.req.status === 'PENDING' ? (
                  <button
                    onClick={async () => {
                      await handleApprove(selectedRequest.req.id);
                      setSelectedRequest(null);
                    }}
                    disabled={approvingId === selectedRequest.req.id}
                    style={styles.approveBtn}
                  >
                    {approvingId === selectedRequest.req.id ? 'Approving...' : 'Approve Request'}
                  </button>
                ) : (
                  <span style={styles.approvedLabel}>Request already processed</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div style={styles.info}>
          <p>📌 Admin can approve requests from NGOs to claim food from donors.</p>
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
    background: 'linear-gradient(120deg, #0d4f6c 0%, #1f7a8c 52%, #4ecdc4 100%)',
    borderRadius: '16px',
    padding: '20px 22px',
    color: '#fff',
    boxShadow: '0 12px 30px rgba(15, 74, 97, 0.24)',
    marginBottom: '16px',
  },
  heroTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 800,
    letterSpacing: '0.2px',
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
  adminCreateCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #d8e8f1',
    borderRadius: '12px',
    padding: '14px',
    marginBottom: '16px',
    boxShadow: '0 6px 16px rgba(16, 39, 56, 0.08)',
  },
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '14px',
  },
  adminCreateTitle: {
    margin: '0 0 6px 0',
    color: '#18364d',
    fontSize: '18px',
  },
  adminCreateSub: {
    margin: '0 0 12px 0',
    color: '#52697b',
    fontSize: '13px',
  },
  adminCreateForm: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: '10px',
    alignItems: 'center',
  },
  adminInput: {
    width: '100%',
    padding: '10px',
    border: '1px solid #bfd4e3',
    borderRadius: '8px',
    backgroundColor: '#fff',
  },
  createAdminBtn: {
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#1e7f5d',
    color: '#fff',
    padding: '10px 12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  auditBtn: {
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#0f3d5e',
    color: '#fff',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
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
  count: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '20px',
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
  requestList: {
    display: 'grid',
    gap: '12px',
  },
  requestRow: {
    backgroundColor: '#fff',
    border: '1px solid #d9e7f2',
    borderRadius: '12px',
    padding: '12px',
    boxShadow: '0 4px 10px rgba(15, 40, 59, 0.06)',
  },
  requestRowHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '10px',
  },
  requestHeaderCopy: {
    minWidth: 0,
  },
  requestTitle: {
    margin: 0,
    fontSize: '18px',
    color: '#17364d',
  },
  requestSummaryText: {
    margin: '5px 0 0 0',
    color: '#5f7488',
    fontSize: '13px',
    lineHeight: 1.4,
    overflowWrap: 'anywhere',
  },
  requestHeaderActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  statusBadge: {
    fontSize: '12px',
    fontWeight: 800,
    borderRadius: '999px',
    padding: '6px 10px',
    textTransform: 'uppercase',
  },
  infoIconBtn: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: '1px solid #bfd4e4',
    backgroundColor: '#f5fbff',
    color: '#1f6f8b',
    fontWeight: 800,
    fontSize: '16px',
    cursor: 'pointer',
    lineHeight: 1,
  },
  requestInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '8px',
  },
  requestInfoItem: {
    backgroundColor: '#f7fbff',
    border: '1px solid #e3edf5',
    borderRadius: '8px',
    padding: '8px 10px',
  },
  requestInfoLabel: {
    margin: 0,
    fontSize: '11px',
    fontWeight: 800,
    color: '#6b8297',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  requestInfoValue: {
    margin: '2px 0 0 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#17364d',
    overflowWrap: 'anywhere',
  },
  requestActionsRow: {
    marginTop: '8px',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
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
    padding: '10px 15px',
    cursor: 'pointer',
    fontSize: '14px',
    borderRadius: '10px 10px 0 0',
    fontWeight: 700,
    color: '#20435d',
  },
  tabBtnActive: {
    backgroundColor: '#1f6f8b',
    color: '#fff',
    borderColor: '#1f6f8b',
  },
  approveBtn: {
    backgroundColor: '#1f8a70',
    color: '#fff',
    border: 'none',
    padding: '9px 13px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
  },
  approvedLabel: {
    color: '#27ae60',
    fontWeight: 'bold',
  },
  detailsOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(11, 30, 44, 0.58)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 50,
  },
  detailsModal: {
    width: 'min(940px, 100%)',
    maxHeight: '88vh',
    overflowY: 'auto',
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '18px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.26)',
  },
  detailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '14px',
  },
  detailsTitle: {
    margin: 0,
    fontSize: '22px',
    color: '#17364d',
  },
  detailsSubtitle: {
    margin: '4px 0 0 0',
    color: '#5f7488',
  },
  detailsCloseBtn: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    border: '1px solid #d7e5f1',
    backgroundColor: '#f5fbff',
    color: '#17364d',
    fontSize: '22px',
    lineHeight: '30px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  detailsFooter: {
    marginTop: '16px',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  info: {
    marginTop: '26px',
    padding: '14px 15px',
    backgroundColor: '#eef7fb',
    borderRadius: '10px',
    border: '1px solid #d9ebf5',
  },
  warehouseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  warehouseCard: {
    backgroundColor: '#fff',
    border: '1px solid #dfeaf2',
    borderRadius: '12px',
    padding: '14px',
    boxShadow: '0 8px 18px rgba(16, 40, 58, 0.08)',
  },
};



