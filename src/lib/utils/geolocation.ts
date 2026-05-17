export async function getPreciseLocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
} | null> {
  const options = {
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 0, // Always force a fresh GPS fix — never serve cached location
  };

  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const position = await Geolocation.getCurrentPosition(options);
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  } catch (e) {
    console.log(
      "Capacitor Geolocation failed or not available, falling back to web api",
      e,
    );
  }

  // Fallback to web API
  if (
    typeof window !== "undefined" &&
    "navigator" in window &&
    navigator.geolocation
  ) {
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
          console.error("Web Geolocation error:", err);
          resolve(null);
        },
        options,
      );
    });
  }

  return null;
}
