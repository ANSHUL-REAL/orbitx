const ISS_URL = "https://api.wheretheiss.at/v1/satellites/25544";
const MIN_FETCH_INTERVAL = 2000;

let lastFetchTime = 0;
let lastPosition = null;

export async function fetchIssPosition() {
  const now = Date.now();

  if (lastPosition && now - lastFetchTime < MIN_FETCH_INTERVAL) {
    return lastPosition;
  }

  const response = await fetch(`${ISS_URL}?units=kilometers`);

  if (!response.ok) {
    throw new Error(`ISS API returned ${response.status}`);
  }

  const data = await response.json();
  lastFetchTime = now;
  lastPosition = {
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    altitude: Number(data.altitude),
    velocity: Number(data.velocity),
    visibility: data.visibility,
    footprint: Number(data.footprint),
    timestamp: Number(data.timestamp),
    units: data.units ?? "kilometers",
  };

  return lastPosition;
}
