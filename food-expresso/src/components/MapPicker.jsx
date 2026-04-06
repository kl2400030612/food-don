import React, { useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultCenter = [17.385, 78.4867];

const customMarkerIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function LocationPicker({ onPick }) {
  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng;
      onPick(lat, lng);
    },
  });

  return null;
}

export default function MapPicker({ latitude, longitude, onLocationChange }) {
  const center = useMemo(() => {
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      return [latitude, longitude];
    }
    return defaultCenter;
  }, [latitude, longitude]);

  return (
    <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #d0d7de' }}>
      <MapContainer center={center} zoom={12} style={{ height: '280px', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <LocationPicker onPick={onLocationChange} />
        {typeof latitude === 'number' && typeof longitude === 'number' ? (
          <Marker position={[latitude, longitude]} icon={customMarkerIcon} />
        ) : null}
      </MapContainer>
    </div>
  );
}
