import * as Astronomy from "astronomy-engine";

const planetBodies = [
  { name: "Mercury", body: Astronomy.Body.Mercury, type: "Terrestrial", periodDays: 88, color: "#a7a29b", radius: 0.38 },
  { name: "Venus", body: Astronomy.Body.Venus, type: "Terrestrial", periodDays: 225, color: "#e6c27a", radius: 0.95 },
  { name: "Earth", body: Astronomy.Body.Earth, type: "Terrestrial", periodDays: 365, color: "#38bdf8", radius: 1 },
  { name: "Mars", body: Astronomy.Body.Mars, type: "Terrestrial", periodDays: 687, color: "#ef6b4a", radius: 0.53 },
  { name: "Jupiter", body: Astronomy.Body.Jupiter, type: "Gas giant", periodDays: 4333, color: "#d8b485", radius: 2.2 },
  { name: "Saturn", body: Astronomy.Body.Saturn, type: "Gas giant", periodDays: 10759, color: "#e4cf8f", radius: 1.85 },
  { name: "Uranus", body: Astronomy.Body.Uranus, type: "Ice giant", periodDays: 30687, color: "#8de8ef", radius: 1.45 },
  { name: "Neptune", body: Astronomy.Body.Neptune, type: "Ice giant", periodDays: 60190, color: "#4f7cff", radius: 1.4 },
];

function createObserver(location) {
  return new Astronomy.Observer(location.latitude, location.longitude, location.altitude ?? 0);
}

function safeRiseSet(body, observer, direction, date) {
  try {
    const event = Astronomy.SearchRiseSet(body, observer, direction, date, 2);
    return event?.date ?? null;
  } catch {
    return null;
  }
}

export function getPlanetObservations(location, date = new Date()) {
  const observer = createObserver(location);

  return planetBodies
    .filter((planet) => planet.body !== Astronomy.Body.Earth)
    .map((planet) => {
    const equator = Astronomy.Equator(planet.body, date, observer, true, true);
    const horizon = Astronomy.Horizon(date, observer, equator.ra, equator.dec, "normal");
    const vector = Astronomy.GeoVector(planet.body, date, true);

    return {
      name: planet.name,
      type: planet.type,
      azimuth: horizon.azimuth,
      altitude: horizon.altitude,
      distanceAu: Math.abs(vector.Length()),
      visible: horizon.altitude > 0,
      riseTime: safeRiseSet(planet.body, observer, +1, date),
      setTime: safeRiseSet(planet.body, observer, -1, date),
      x: horizonPoint(horizon.azimuth, horizon.altitude).x,
      y: horizonPoint(horizon.azimuth, horizon.altitude).y,
    };
  });
}

export function getPlanetSystem(date = new Date(), samples = 120) {
  return planetBodies.map((planet) => {
    const position = heliocentricPosition(planet.body, date);
    const orbit = Array.from({ length: samples + 1 }, (_, index) => {
      const offset = (planet.periodDays / samples) * index;
      const sampleDate = new Date(date.getTime() - (planet.periodDays / 2 - offset) * 86400000);
      return heliocentricPosition(planet.body, sampleDate);
    });

    return {
      name: planet.name,
      type: planet.type,
      color: planet.color,
      radius: planet.radius,
      periodDays: planet.periodDays,
      position,
      orbit,
      distanceAu: Math.hypot(position.x, position.y, position.z),
    };
  });
}

function heliocentricPosition(body, date) {
  if (body === Astronomy.Body.Earth) {
    const earth = Astronomy.HelioVector(Astronomy.Body.Earth, date);
    return { x: earth.x, y: earth.y, z: earth.z };
  }

  const vector = Astronomy.HelioVector(body, date);
  return { x: vector.x, y: vector.y, z: vector.z };
}

export function getSkyObservations(objects, location, date = new Date()) {
  const observer = createObserver(location);

  return objects
    .map((object) => {
      const horizon = Astronomy.Horizon(date, observer, object.ra / 15, object.dec, "normal");
      const point = horizonPoint(horizon.azimuth, horizon.altitude);

      return {
        ...object,
        azimuth: horizon.azimuth,
        altitude: horizon.altitude,
        visible: horizon.altitude > 0,
        x: point.x,
        y: point.y,
      };
    })
    .sort((a, b) => a.magnitude - b.magnitude);
}

export function getEclipticMap(date = new Date()) {
  const bodies = [
    { name: "Sun", body: Astronomy.Body.Sun, type: "Star", color: "#fde68a" },
    { name: "Moon", body: Astronomy.Body.Moon, type: "Moon", color: "#e5e7eb" },
    ...planetBodies
      .filter((planet) => planet.body !== Astronomy.Body.Earth)
      .map((planet) => ({ name: planet.name, body: planet.body, type: planet.type, color: planet.color })),
  ];

  return bodies.map((body) => {
    const ecliptic = body.body === Astronomy.Body.Moon
      ? Astronomy.EclipticGeoMoon(date)
      : Astronomy.Ecliptic(Astronomy.GeoVector(body.body, date, true));
    const longitude = body.body === Astronomy.Body.Moon ? ecliptic.lon : ecliptic.elon;
    const latitude = body.body === Astronomy.Body.Moon ? ecliptic.lat : ecliptic.elat;
    const distanceAu = body.body === Astronomy.Body.Moon ? ecliptic.dist : Astronomy.GeoVector(body.body, date, true).Length();

    return {
      name: body.name,
      type: body.type,
      color: body.color,
      longitude: normalizeDegrees(longitude),
      latitude,
      distanceAu: Math.abs(distanceAu),
      zodiac: zodiacForLongitude(longitude),
      retrograde: isRetrograde(body.body, date),
    };
  });
}

function isRetrograde(body, date) {
  if (body === Astronomy.Body.Sun || body === Astronomy.Body.Moon) return false;
  const previous = Astronomy.Ecliptic(Astronomy.GeoVector(body, new Date(date.getTime() - 86400000), true)).elon;
  const next = Astronomy.Ecliptic(Astronomy.GeoVector(body, new Date(date.getTime() + 86400000), true)).elon;
  const delta = normalizeSignedDegrees(next - previous);
  return delta < 0;
}

function zodiacForLongitude(longitude) {
  const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  const normalized = normalizeDegrees(longitude);
  const index = Math.floor(normalized / 30) % 12;
  return {
    sign: signs[index],
    degree: normalized % 30,
  };
}

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function normalizeSignedDegrees(value) {
  const normalized = normalizeDegrees(value);
  return normalized > 180 ? normalized - 360 : normalized;
}

function horizonPoint(azimuth, altitude) {
  const normalizedAltitude = Math.max(0, Math.min(90, altitude));
  const radius = ((90 - normalizedAltitude) / 90) * 46;
  const angle = (azimuth - 90) * (Math.PI / 180);

  return {
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * radius,
  };
}

export function getCompassLabel(azimuth) {
  const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return labels[Math.round((((azimuth % 360) + 360) % 360) / 45) % 8];
}
