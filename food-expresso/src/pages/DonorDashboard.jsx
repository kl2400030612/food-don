import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createFood, getFoodsByDonor, deleteFood, getApiErrorMessage } from '../services/api';
import Navbar from '../components/Navbar';
import MapPicker from '../components/MapPicker';
import { getStoredUser } from '../services/auth';

const FOOD_IMAGE_STORAGE_KEY = 'donor-food-image-map';

const loadStoredFoodImages = () => {
  try {
    const raw = localStorage.getItem(FOOD_IMAGE_STORAGE_KEY);
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    return {};
  }
};

export default function DonorDashboard() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [showForm, setShowForm] = useState(false);
  const [submittingFood, setSubmittingFood] = useState(false);
  const [deletingFoodId, setDeletingFoodId] = useState(null);
  const [foodImageMap, setFoodImageMap] = useState(() => loadStoredFoodImages());
  const [selectedImageData, setSelectedImageData] = useState('');
  const [selectedImageName, setSelectedImageName] = useState('');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    quantity: '',
    location: '',
    expiryDate: '',
    latitude: null,
    longitude: null,
  });

  const user = getStoredUser() || {};

  useEffect(() => {
    if (!user.id || user.role !== 'DONOR') {
      navigate('/login');
      return;
    }
    loadDonorFoods();
  }, [navigate, user.id, user.role]);

  const loadDonorFoods = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getFoodsByDonor(user.id);
      setFoods(response.data);
    } catch (err) {
      setError('Error loading foods: ' + getApiErrorMessage(err, 'Unable to load foods'));
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedImageData('');
      setSelectedImageName('');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      showNotice('error', 'Please select JPG or PNG image only.');
      e.target.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showNotice('error', 'Image size should be under 5MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImageData(String(reader.result || ''));
      setSelectedImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const persistFoodImageMap = (nextMap) => {
    setFoodImageMap(nextMap);
    localStorage.setItem(FOOD_IMAGE_STORAGE_KEY, JSON.stringify(nextMap));
  };

  const handleToggleForm = () => {
    setShowForm((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedImageData('');
        setSelectedImageName('');
      }
      return next;
    });
  };

  const handleLocationPick = (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
    }));
  };

  const formatDateToIso = (dateValue) => {
    if (!dateValue) return '';

    // Accept already-correct date input values (yyyy-MM-dd)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }

    // Also support dd-MM-yyyy values to avoid backend conversion issues
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateValue)) {
      const [day, month, year] = dateValue.split('-');
      return `${year}-${month}-${day}`;
    }

    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().split('T')[0];
  };

  const handleAddFood = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.quantity || !formData.location || !formData.expiryDate) {
      showNotice('error', 'Please fill in all fields');
      return;
    }

    if (typeof formData.latitude !== 'number' || typeof formData.longitude !== 'number') {
      showNotice('error', 'Please select pickup location on map');
      return;
    }

    const quantityNumber = Number(formData.quantity);
    const formattedDate = formatDateToIso(formData.expiryDate);
    const today = new Date().toISOString().split('T')[0];

    if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
      showNotice('error', 'Quantity must be greater than 0');
      return;
    }

    if (!formattedDate) {
      showNotice('error', 'Please enter a valid expiry date');
      return;
    }

    if (formattedDate < today) {
      showNotice('error', 'Expiry date cannot be in the past');
      return;
    }

    if (!user.id) {
      showNotice('error', 'User session is invalid. Please login again.');
      navigate('/login');
      return;
    }

    try {
      setSubmittingFood(true);
      const foodData = {
        title: formData.title.trim(),
        quantity: quantityNumber,
        location: formData.location.trim(),
        expiryDate: formattedDate,
        latitude: formData.latitude,
        longitude: formData.longitude,
        donorId: user.id,
      };

      const created = await createFood(foodData);

      if (selectedImageData && created?.data?.id) {
        const nextMap = {
          ...foodImageMap,
          [created.data.id]: selectedImageData,
        };
        persistFoodImageMap(nextMap);
      }

      showNotice('success', 'Food added successfully');
      setFormData({ title: '', quantity: '', location: '', expiryDate: '', latitude: null, longitude: null });
      setSelectedImageData('');
      setSelectedImageName('');
      setShowForm(false);
      await loadDonorFoods();
    } catch (err) {
      showNotice('error', 'Error adding food: ' + getApiErrorMessage(err, 'Unable to add food'));
    } finally {
      setSubmittingFood(false);
    }
  };

  const handleDeleteFood = async (foodId) => {
    if (confirm('Are you sure you want to delete this food?')) {
      try {
        setDeletingFoodId(foodId);
        await deleteFood(foodId);
        if (foodImageMap[foodId]) {
          const nextMap = { ...foodImageMap };
          delete nextMap[foodId];
          persistFoodImageMap(nextMap);
        }
        showNotice('success', 'Food deleted successfully');
        await loadDonorFoods();
      } catch (err) {
        showNotice('error', 'Error deleting food: ' + getApiErrorMessage(err, 'Unable to delete food'));
      } finally {
        setDeletingFoodId(null);
      }
    }
  };

  return (
    <>
      <Navbar />
      <div style={styles.container}>
        <h1>🎁 Donor Dashboard</h1>

        {error && <div style={styles.error}>{error}</div>}
        {notice.message && (
          <div style={notice.type === 'success' ? styles.noticeSuccess : styles.noticeError}>
            {notice.message}
          </div>
        )}

        <button
          onClick={handleToggleForm}
          style={styles.toggleBtn}
        >
          {showForm ? '✕ Cancel' : '+ Add Food'}
        </button>

        {showForm && (
          <div style={styles.formContainer}>
            <h2>Add New Food Item</h2>
            <form onSubmit={handleAddFood}>
              <div style={styles.formGroup}>
                <label>Food Title:</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Rice, Vegetables"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Quantity (kg):</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="e.g., 10"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Location:</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., 123 Main St"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Expiry Date:</label>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Pickup Location on Map:</label>
                <MapPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onLocationChange={handleLocationPick}
                />
                <p style={styles.coordinatesText}>
                  Selected: {formData.latitude ?? '--'}, {formData.longitude ?? '--'}
                </p>
              </div>

              <div style={styles.formGroup}>
                <label>Food Image (JPG/PNG):</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={handleImageChange}
                  style={styles.fileInput}
                />
                {selectedImageName && <p style={styles.fileName}>Selected: {selectedImageName}</p>}
                {selectedImageData && (
                  <img src={selectedImageData} alt="Food preview" style={styles.imagePreview} />
                )}
              </div>

              <button type="submit" style={styles.submitBtn} disabled={submittingFood}>
                {submittingFood ? 'Adding...' : 'Add Food'}
              </button>
            </form>
          </div>
        )}

        <h2 style={styles.title}>Your Food Items</h2>

        {loading ? (
          <p>Loading foods...</p>
        ) : (
          <>
            <p style={styles.count}>Total Foods: {foods.length}</p>
            {foods.length === 0 ? (
              <p>You haven't added any food items yet.</p>
            ) : (
              <div style={styles.foodsGrid}>
                {foods.map((food) => (
                  <div key={food.id} style={styles.foodCard}>
                    {foodImageMap[food.id] && (
                      <img src={foodImageMap[food.id]} alt={food.title} style={styles.foodCardImage} />
                    )}
                    <h3>{food.title}</h3>
                    <p>
                      <strong>Quantity:</strong> {food.quantity} kg
                    </p>
                    <p>
                      <strong>Location:</strong> {food.location}
                    </p>
                    <p>
                      <strong>Coordinates:</strong> {food.latitude ?? '--'}, {food.longitude ?? '--'}
                    </p>
                    <p>
                      <strong>Expiry Date:</strong>{' '}
                      {new Date(food.expiryDate).toLocaleDateString()}
                    </p>
                    <p style={getStatusStyle(food.status)}>
                      <strong>Status:</strong> {food.status}
                    </p>
                    <p style={styles.timestamp}>
                      Added: {new Date(food.createdAt).toLocaleString()}
                    </p>
                    {food.status === 'AVAILABLE' && (
                      <button
                        onClick={() => handleDeleteFood(food.id)}
                        disabled={deletingFoodId === food.id}
                        style={styles.deleteBtn}
                      >
                        {deletingFoodId === food.id ? 'Deleting...' : '🗑️ Delete'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div style={styles.info}>
          <p>📌 Add food items to donate. NGOs can then request these items.</p>
        </div>
      </div>
    </>
  );
}

function getStatusStyle(status) {
  if (status === 'AVAILABLE') {
    return { color: '#27ae60', fontWeight: 'bold' };
  }
  return { color: '#e74c3c', fontWeight: 'bold' };
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
  error: {
    backgroundColor: '#ffe6e6',
    color: '#c0392b',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  noticeSuccess: {
    backgroundColor: '#eafaf1',
    color: '#1e8449',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '20px',
    border: '1px solid #c3e6cb',
  },
  noticeError: {
    backgroundColor: '#fff5f5',
    color: '#c0392b',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '20px',
    border: '1px solid #f5c6cb',
  },
  toggleBtn: {
    backgroundColor: '#3498db',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    marginBottom: '20px',
    fontWeight: 'bold',
  },
  formContainer: {
    backgroundColor: '#ecf0f1',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px',
  },
  formGroup: {
    marginBottom: '15px',
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
  fileInput: {
    width: '100%',
    marginTop: '5px',
    fontSize: '14px',
  },
  fileName: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#2d4f67',
    fontWeight: 600,
  },
  imagePreview: {
    marginTop: '8px',
    width: '100%',
    maxHeight: '200px',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '1px solid #d7e4ef',
  },
  coordinatesText: {
    fontSize: '12px',
    color: '#566573',
    marginTop: '8px',
  },
  submitBtn: {
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  title: {
    marginTop: '30px',
    marginBottom: '20px',
  },
  count: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  foodsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  foodCard: {
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderLeft: '4px solid #3498db',
  },
  foodCardImage: {
    width: '100%',
    height: '170px',
    objectFit: 'cover',
    borderRadius: '8px',
    marginBottom: '10px',
    border: '1px solid #dbe8f2',
  },
  deleteBtn: {
    backgroundColor: '#e74c3c',
    color: '#fff',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '10px',
    fontSize: '14px',
  },
  timestamp: {
    fontSize: '12px',
    color: '#7f8c8d',
    marginTop: '10px',
  },
  info: {
    marginTop: '30px',
    padding: '15px',
    backgroundColor: '#ecf0f1',
    borderRadius: '4px',
  },
};

