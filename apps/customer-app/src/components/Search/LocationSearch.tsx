import React, { useState, useCallback } from 'react';

import { Button } from '../common/Button';
import { Input } from '../common/Input';

export interface LocationSearchProps {
  onLocationSearch: (lat: number, lon: number, radius: number) => void;
  'data-testid'?: string;
}

/**
 * Location-based search component.
 * Supports manual coordinate entry and browser geolocation API.
 */
export const LocationSearch: React.FC<LocationSearchProps> = React.memo(({
  onLocationSearch,
  'data-testid': testId,
}) => {
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [radius, setRadius] = useState('5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLat(latitude.toFixed(6));
        setLon(longitude.toFixed(6));
        setLoading(false);
        onLocationSearch(latitude, longitude, parseFloat(radius) || 5);
      },
      (geoError) => {
        setLoading(false);
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            setError('Location permission denied. Please enable location access.');
            break;
          case geoError.POSITION_UNAVAILABLE:
            setError('Location information is unavailable.');
            break;
          case geoError.TIMEOUT:
            setError('Location request timed out.');
            break;
          default:
            setError('An unknown error occurred.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, [radius, onLocationSearch]);

  const handleManualSearch = useCallback(() => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const radiusNum = parseFloat(radius) || 5;

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setError('Please enter a valid latitude (-90 to 90)');
      return;
    }

    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      setError('Please enter a valid longitude (-180 to 180)');
      return;
    }

    setError(null);
    onLocationSearch(latNum, lonNum, radiusNum);
  }, [lat, lon, radius, onLocationSearch]);

  return (
    <div className="location-search" data-testid={testId || 'location-search'}>
      <div className="location-search__header">
        <h4 className="location-search__title">Search by Location</h4>
        <Button
          variant="primary"
          size="small"
          onClick={handleUseCurrentLocation}
          disabled={loading}
          data-testid="use-current-location"
        >
          {loading ? 'Getting location...' : 'Use Current Location'}
        </Button>
      </div>

      <div className="location-search__fields">
        <Input
          type="number"
          label="Latitude"
          placeholder="-90 to 90"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          data-testid="location-lat"
        />
        <Input
          type="number"
          label="Longitude"
          placeholder="-180 to 180"
          value={lon}
          onChange={(e) => setLon(e.target.value)}
          data-testid="location-lon"
        />
        <Input
          type="number"
          label="Radius (km)"
          placeholder="1-100"
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
          data-testid="location-radius"
        />
      </div>

      <Button
        variant="secondary"
        onClick={handleManualSearch}
        disabled={!lat || !lon}
        data-testid="location-search-submit"
      >
        Search Nearby
      </Button>

      {error && (
        <p
          className="location-search__error"
          data-testid="location-search-error"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
});

LocationSearch.displayName = 'LocationSearch';
