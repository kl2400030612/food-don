import React, { useMemo } from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const isValidCoordinatePair = (lat, lng) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  // Treat 0,0 as unset in this app context.
  if (Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001) return false;
  return true;
};

const customMarkerIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function FoodLocationMap({ latitude, longitude, ngoLatitude, ngoLongitude, height = 180 }) {
  const hasCoordinates = isValidCoordinatePair(latitude, longitude);
  const hasNgoCoordinates = isValidCoordinatePair(ngoLatitude, ngoLongitude);

  const center = useMemo(() => {
    if (hasCoordinates) {
      return [latitude, longitude];
    }
    return [17.385, 78.4867];
  }, [hasCoordinates, latitude, longitude]);

  if (!hasCoordinates) {
    return (
      <div style={{ marginTop: '8px', border: '1px dashed #c8d6e2', borderRadius: '10px', padding: '12px', backgroundColor: '#f8fbff' }}>
        <p style={{ color: '#6c8194', margin: 0, fontSize: '13px' }}>No map coordinates available for this food item.</p>
      </div>
    );
  }

  const destinationUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  const routeUrl = hasNgoCoordinates
    ? `https://www.google.com/maps/dir/?api=1&origin=${ngoLatitude},${ngoLongitude}&destination=${latitude},${longitude}&travelmode=driving`
    : destinationUrl;

  return (
    <div>
      <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #d4e2ec', marginTop: '8px' }}>
        <MapContainer center={center} zoom={13} style={{ height: `${height}px`, width: '100%' }} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />
          <Marker position={[latitude, longitude]} icon={customMarkerIcon} />
        </MapContainer>
      </div>
      <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <a
          href={routeUrl}
          target='_blank'
          rel='noreferrer'
          style={{
            background: 'linear-gradient(120deg, #1b6ca8 0%, #2e8fd4 100%)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '8px',
            padding: '8px 11px',
            fontSize: '12px',
            fontWeight: 700,
            boxShadow: '0 8px 16px rgba(27, 108, 168, 0.24)',
          }}
        >
          {hasNgoCoordinates ? 'Route from My NGO' : 'Open Route'}
        </a>
        {!hasNgoCoordinates && (
          <span style={{ fontSize: '12px', color: '#7f8c8d' }}>Set NGO fixed location to get turn-by-turn route.</span>
        )}
      </div>
    </div>
  );
}
