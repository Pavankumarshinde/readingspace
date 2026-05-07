/**
 * permissions.ts
 * Centralized utility for requesting native Capacitor permissions.
 * Safe to call on web — all Capacitor imports are dynamic and caught gracefully.
 */

/** Request camera permission (for QR scanner). */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const { Camera } = await import("@capacitor/camera");
    const status = await Camera.checkPermissions();
    if (status.camera === "granted") return true;
    const result = await Camera.requestPermissions({ permissions: ["camera"] });
    return result.camera === "granted";
  } catch {
    // Not on Capacitor (web) — browser will handle via getUserMedia
    return true;
  }
}

/** Request fine location permission (for geo check-in). */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const status = await Geolocation.checkPermissions();
    if (status.location === "granted") return true;
    const result = await Geolocation.requestPermissions();
    return result.location === "granted";
  } catch {
    return false;
  }
}

/** Request push notification permission (once per session). */
export async function requestNotificationPermission(): Promise<boolean> {
  // Guard: only ask once per app session
  if (typeof window !== "undefined" && (window as any).__notifPermAsked) {
    return false;
  }
  if (typeof window !== "undefined") {
    (window as any).__notifPermAsked = true;
  }

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const status = await LocalNotifications.checkPermissions();
    if (status.display === "granted") return true;
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted";
  } catch {
    // Fallback: browser Notification API
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      const result = await Notification.requestPermission();
      return result === "granted";
    }
    return false;
  }
}
