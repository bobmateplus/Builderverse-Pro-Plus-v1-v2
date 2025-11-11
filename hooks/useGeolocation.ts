import { useState } from 'react';

interface GeolocationState {
  loading: boolean;
  data: {
    latitude: number;
    longitude: number;
  } | null;
}

interface UseGeolocationProps {
  onError?: (error: GeolocationPositionError | Error) => void;
}

export const useGeolocation = ({ onError }: UseGeolocationProps = {}) => {
  const [state, setState] = useState<GeolocationState>({
    loading: false,
    data: null,
  });

  const getLocation = () => {
    if (!navigator.geolocation) {
       if (onError) {
           const error = new Error('Geolocation is not supported by this browser.');
           onError(error);
       }
      return;
    }
    setState({ ...state, loading: true });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          loading: false,
          data: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        });
      },
      (error) => {
        setState({
          loading: false,
          data: null,
        });
        if (onError) {
            onError(error);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return { ...state, getLocation };
};


// Real implementation using the OpenStreetMap Nominatim API (no key required, but has usage limits).
export const getPostcodeFromCoords = async (lat: number, lon: number): Promise<string | null> => {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`);
        if (!response.ok) {
            throw new Error(`Nominatim API failed with status: ${response.status}`);
        }
        const data = await response.json();
        
        // Nominatim provides postcode in address object. UK postcodes are in `address.postcode`.
        if (data && data.address && data.address.postcode) {
            return data.address.postcode;
        }
        // Fallback for more general location if postcode not found
        if (data && data.address) {
            return data.address.city || data.address.town || data.address.village || 'Location found, no postcode';
        }

        return null;
    } catch (e) {
        console.error("Failed to fetch postcode from Nominatim:", e);
        return null;
    }
};

export const getCoordsFromAddress = async (address: string): Promise<{ lat: number; lng: number; } | null> => {
    if (!address.trim()) return null;
    try {
        // Added countrycodes=gb to focus the search on the UK, which is relevant for this app.
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=gb`);
        if (!response.ok) {
            throw new Error(`Nominatim API failed with status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data && data.length > 0) {
            // Return the first result, which is usually the most relevant.
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }
        return null;
    } catch (e) {
        console.error("Failed to fetch coordinates from Nominatim:", e);
        return null;
    }
};