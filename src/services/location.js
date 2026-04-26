export const fallbackLocation = {
  latitude: 28.6139,
  longitude: 77.209,
  altitude: 0,
  source: "fallback",
  label: "New Delhi fallback",
};

export function getObserverLocation() {
  if (!("geolocation" in navigator)) {
    return Promise.resolve(fallbackLocation);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude ?? 0,
          source: "gps",
          label: "Browser location",
        });
      },
      () => resolve(fallbackLocation),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 },
    );
  });
}
