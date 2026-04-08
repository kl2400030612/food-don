import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getAdminLogs, getApiErrorMessage } from '../services/api';
import { getStoredUser } from '../services/auth';

const STATUS_OPTIONS = ['', '200', '201', '400', '401', '403', '404', '500'];
const METHOD_OPTIONS = ['', 'GET', 'POST', 'PUT', 'DELETE'];

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

export default function AdminLogs() {
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser() || {}, []);

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [q, setQ] = useState('');
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [size] = useState(30);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    if (!user.id || user.role !== 'ADMIN') {
      navigate('/login');
      return;
    }
    loadLogs(0, q, method, status);
  }, [navigate]);

  const loadLogs = async (targetPage = page, nextQ = q, nextMethod = method, nextStatus = status) => {
    try {
      setLoading(true);
      setError('');
      const response = await getAdminLogs({
        page: targetPage,
        size,
        q: nextQ || undefined,
        method: nextMethod || undefined,
        status: nextStatus ? Number(nextStatus) : undefined,
      });
      const payload = response?.data || {};
      setLogs(payload.content || []);
      setTotalPages(Math.max(payload.totalPages || 1, 1));
      setTotalElements(payload.totalElements || 0);
      setPage(payload.number || 0);
    } catch (err) {
      setError('Error loading audit logs: ' + getApiErrorMessage(err, 'Unable to load audit logs'));
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    loadLogs(0, q, method, status);
  };

  return (
    <>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <div style={styles.headerCopy}>
            <h1 style={styles.title}>Admin Audit Logs</h1>
            <p style={styles.subtitle}>Track every secured action with actor, endpoint, status, and time.</p>
          </div>
          <button style={styles.backBtn} onClick={() => navigate('/admin')}>Back to Admin</button>
        </div>

        <div style={styles.filtersCard}>
          <input
            style={styles.input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search action/path/email/entity"
          />
          <select style={styles.input} value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHOD_OPTIONS.map((item) => (
              <option key={item || 'all'} value={item}>{item || 'All Methods'}</option>
            ))}
          </select>
          <select style={styles.input} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((item) => (
              <option key={item || 'all'} value={item}>{item || 'All Status'}</option>
            ))}
          </select>
          <button style={styles.applyBtn} onClick={applyFilters}>Apply Filters</button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.metaRow}>
          <p style={styles.metaText}>Total Logs: {totalElements}</p>
          <p style={styles.metaText}>Page: {page + 1} / {totalPages}</p>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor Email</th>
                <th>Role</th>
                <th>Action</th>
                <th>Method</th>
                <th>Path</th>
                <th>Status</th>
                <th>Entity</th>
                <th>Entity ID</th>
                <th>IP</th>
                <th>User Agent</th>
              </tr>
            </thead>
            <tbody>
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={11} style={styles.empty}>No logs found.</td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.createdAt)}</td>
                  <td>{log.actorEmail || '-'}</td>
                  <td>{log.actorRole || '-'}</td>
                  <td>{log.action || '-'}</td>
                  <td style={styles.centerCell}>{log.method || '-'}</td>
                  <td>{log.path || '-'}</td>
                  <td style={styles.statusCell}>{log.statusCode ?? '-'}</td>
                  <td>{log.entityType || '-'}</td>
                  <td style={styles.centerCell}>{log.entityId ?? '-'}</td>
                  <td>{log.ipAddress || '-'}</td>
                  <td style={styles.agentCell}>{log.userAgent || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.pagination}>
          <button
            style={styles.pageBtn}
            disabled={loading || page <= 0}
            onClick={() => loadLogs(page - 1)}
          >
            Previous
          </button>
          <button
            style={styles.pageBtn}
            disabled={loading || page + 1 >= totalPages}
            onClick={() => loadLogs(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '1460px',
    margin: '0 auto',
    padding: '24px 20px 34px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '14px',
    flexWrap: 'wrap',
  },
  headerCopy: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: '280px',
  },
  title: {
    margin: 0,
    color: '#12324a',
  },
  subtitle: {
    marginBottom: 0,
    color: '#4f6679',
  },
  backBtn: {
    border: 'none',
    backgroundColor: '#2f7ca8',
    color: '#fff',
    borderRadius: '8px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  filtersCard: {
    display: 'grid',
    gridTemplateColumns: 'minmax(240px, 2fr) minmax(140px, 1fr) minmax(140px, 1fr) auto',
    gap: '10px',
    padding: '12px',
    backgroundColor: '#f6fbff',
    borderRadius: '12px',
    border: '1px solid #d7e7f2',
    marginBottom: '12px',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #bfd4e3',
    backgroundColor: '#fff',
  },
  applyBtn: {
    border: 'none',
    backgroundColor: '#209160',
    color: '#fff',
    borderRadius: '8px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 700,
  },
  error: {
    backgroundColor: '#ffe6e6',
    color: '#c0392b',
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '10px',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  metaText: {
    margin: 0,
    fontSize: '13px',
    color: '#3a5668',
  },
  tableWrap: {
    overflowX: 'auto',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #d5e4ef',
    boxShadow: '0 10px 24px rgba(16, 39, 56, 0.06)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1280px',
  },
  centerCell: {
    textAlign: 'center',
  },
  statusCell: {
    textAlign: 'center',
    fontWeight: 700,
  },
  empty: {
    textAlign: 'center',
    padding: '26px',
    color: '#607d8b',
  },
  agentCell: {
    maxWidth: '260px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  pagination: {
    marginTop: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  pageBtn: {
    border: '1px solid #b9cfde',
    borderRadius: '8px',
    padding: '8px 12px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },
};
