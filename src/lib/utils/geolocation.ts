export async function getPreciseLocation(): Promise<{ latitude: number, longitude: number, accuracy: number } | null> {
  const options = {
    enableHighAccuracy: true,
    timeout: 30000, // Increased timeout to 30s so the GPS module has enough time to acquire lock
    maximumAge: 5000, // Allows up to 5s old cached location which is usually very good and quick
  };

  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    const position = await Geolocation.getCurrentPosition(options);
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  } catch (e) {
    console.log('Capacitor Geolocation failed or not available, falling back to web api', e);
  }

  // Fallback to web API
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.geolocation) {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          console.error('Web Geolocation error:', err);
          resolve(null);
        },
        options
      );
    });
  }

  return null;
}
