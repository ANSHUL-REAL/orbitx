import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import * as THREE from "three";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Compass,
  Crosshair,
  Gauge,
  Globe2,
  MapPinned,
  Orbit,
  Radar,
  Rocket,
  Satellite,
  Search,
  Shield,
  Sparkles,
  Target,
  Telescope,
  Zap,
  RotateCcw,
} from "lucide-react";
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip } from "react-leaflet";
import L from "leaflet";
import { SparklesCore } from "./components/SparklesCore";
import { fetchIssPosition } from "./services/iss";
import { fallbackLocation, getObserverLocation } from "./services/location";
import { getCompassLabel, getEclipticMap, getPlanetObservations, getPlanetSystem, getSkyObservations } from "./services/astronomy";
import { constellationLines, skyObjects } from "./data/skyObjects";
import { number, shortTime, timeFromUnix } from "./utils/format";

const views = [
  { id: "dashboard", label: "Dashboard", icon: Activity },
  { id: "satellite", label: "ISS Tracker", icon: Satellite },
  { id: "planets", label: "Planets", icon: Orbit },
  { id: "sky", label: "Sky Map", icon: Telescope },
];

const issIcon = L.divIcon({
  className: "iss-marker",
  html: "<span></span>",
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [iss, setIss] = useState(null);
  const [issError, setIssError] = useState("");
  const [orbitPath, setOrbitPath] = useState([]);
  const [location, setLocation] = useState(fallbackLocation);
  const [now, setNow] = useState(new Date());
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [selectedObject, setSelectedObject] = useState(skyObjects[0]);

  useEffect(() => {
    getObserverLocation().then(setLocation);
  }, []);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refreshIss() {
      try {
        const next = await fetchIssPosition();
        if (cancelled) return;
        setIss(next);
        setIssError("");
        setOrbitPath((path) => {
          const point = [next.latitude, next.longitude];
          const last = path[path.length - 1];
          if (last && Math.abs(last[1] - point[1]) > 180) {
            return [point];
          }
          return [...path.slice(-84), point];
        });
      } catch (error) {
        if (!cancelled) {
          setIssError(error.message || "ISS feed is unavailable");
        }
      }
    }

    refreshIss();
    const timer = window.setInterval(refreshIss, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const planets = useMemo(() => {
    if (!location) return [];
    try {
      return getPlanetObservations(location, now).sort((a, b) => b.altitude - a.altitude);
    } catch (error) {
      console.error("Planet calculation failed", error);
      return [];
    }
  }, [location, now]);

  const visiblePlanets = planets.filter((planet) => planet.visible);
  const planetSystem = useMemo(() => getPlanetSystem(now), [now]);
  const skyObservations = useMemo(() => {
    try {
      return getSkyObservations(skyObjects, location, now);
    } catch (error) {
      console.error("Sky calculation failed", error);
      return skyObjects.map((object) => ({ ...object, visible: false, altitude: 0, azimuth: 0, x: 50, y: 50 }));
    }
  }, [location, now]);
  const eclipticObjects = useMemo(() => getEclipticMap(now), [now]);
  const stale = iss ? Date.now() / 1000 - iss.timestamp > 15 : false;

  return (
    <div className="app-shell">
      <SparklesBackground />
      <Header activeView={activeView} setActiveView={setActiveView} />

      <main>
        {activeView === "dashboard" && (
          <MissionDashboard
            iss={iss}
            planets={planets}
            visiblePlanets={visiblePlanets}
            skyObservations={skyObservations}
            location={location}
            setActiveView={setActiveView}
          />
        )}
        {activeView !== "dashboard" && (
          <>
            <Hero iss={iss} visiblePlanets={visiblePlanets.length} location={location} />
            <StatusStrip issError={issError} stale={stale} location={location} />
            {activeView === "satellite" && (
              <SatelliteTracker iss={iss} orbitPath={orbitPath} issError={issError} active={activeView === "satellite"} />
            )}
            {activeView === "planets" && (
              <PlanetViewer
                planets={planets}
                planetSystem={planetSystem}
                selectedPlanet={selectedPlanet ?? planets[0]}
                setSelectedPlanet={setSelectedPlanet}
                location={location}
              />
            )}
            {activeView === "sky" && (
              <SkyMap
                selectedObject={selectedObject}
                setSelectedObject={setSelectedObject}
                eclipticObjects={eclipticObjects}
                skyObservations={skyObservations}
                location={location}
              />
            )}
          </>
        )}
      </main>

      <OrbitFooter />
    </div>
  );
}

function Header({ activeView, setActiveView }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => setActiveView("dashboard")} aria-label="Open dashboard">
        <span className="brand-mark"><Rocket size={18} /></span>
        <RevealText text="OrbitX" />
      </button>
      <nav aria-label="Primary navigation">
        {views.map((view) => {
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              className={activeView === view.id ? "active" : ""}
              onClick={() => setActiveView(view.id)}
            >
              <Icon size={16} />
              <span>{view.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="top-actions" aria-label="Mission utilities">
        <span><Shield size={14} /> Safe</span>
        <button aria-label="Search"><Search size={16} /></button>
        <button aria-label="Analytics"><BarChart3 size={16} /></button>
      </div>
    </header>
  );
}

function Hero({ iss, visiblePlanets, location }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow"><Sparkles size={15} /> Real-time space telemetry</p>
        <RevealText text="OrbitX" className="hero-title" />
        <TextEffect>
          Track the ISS, scan visible planets, and explore a responsive sky map from your current observing point.
        </TextEffect>
      </div>
      <DotQuote>
        <div className="hero-orbit">
          <span className="planet-core"></span>
          <span className="orbit-ring ring-one"></span>
          <span className="orbit-ring ring-two"></span>
          <span className="satellite-dot"></span>
        </div>
        <div>
          <strong>{iss ? `${number(iss.altitude, 0)} km` : "Acquiring"}</strong>
          <span>ISS altitude</span>
        </div>
        <div>
          <strong>{visiblePlanets}</strong>
          <span>visible planets</span>
        </div>
        <div>
          <strong>{location?.source === "gps" ? "GPS" : "Fallback"}</strong>
          <span>observer source</span>
        </div>
      </DotQuote>
    </section>
  );
}

function StatusStrip({ issError, stale, location }) {
  return (
    <section className="status-strip" aria-label="System status">
      <StatusPill icon={Radar} label="ISS feed" value={issError ? "Degraded" : stale ? "Stale" : "Live"} tone={issError || stale ? "warn" : "ok"} />
      <StatusPill icon={MapPinned} label="Location" value={location ? location.label : "Resolving"} tone={location?.source === "fallback" ? "warn" : "ok"} />
      <StatusPill icon={Gauge} label="Refresh" value="3 sec" tone="ok" />
    </section>
  );
}

function StatusPill({ icon: Icon, label, value, tone }) {
  return (
    <div className={`status-pill ${tone}`}>
      <Icon size={16} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MissionDashboard({ iss, planets, visiblePlanets, skyObservations, location, setActiveView }) {
  const visibleStars = skyObservations.filter((object) => object.visible);
  const bestPlanet = visiblePlanets[0] ?? planets[0];
  const strongestSignal = iss ? Math.min(98, Math.max(42, Math.round((iss.altitude / 430) * 90))) : 38;

  return (
    <section className="mission-screen">
      <div className="mission-backdrop" aria-hidden="true">
        <span className="mission-sun"></span>
        <span className="mission-earth"></span>
        <span className="mission-asteroid"></span>
        <span className="mission-cross cross-one"></span>
        <span className="mission-cross cross-two"></span>
        <span className="mission-cross cross-three"></span>
      </div>

      <div className="mission-topline">
        <span>Global status <strong>Safe</strong></span>
        <span>Automatic defense <strong>Online</strong></span>
        <span>Observer <strong>{location.label}</strong></span>
      </div>

      <div className="mission-layout">
        <aside className="mission-left">
          <p className="eyebrow">AI insights</p>
          <GlassCard title="ISS signal" icon={Target}>
            <ArcGauge value={strongestSignal} />
            <Stat label="ISS altitude" value={iss ? `${number(iss.altitude, 0)} km` : "Acquiring"} />
            <Stat label="Footprint" value={iss ? `${number(iss.footprint, 0)} km` : "N/A"} />
          </GlassCard>
            <GlassCard title="Sky density" icon={Zap}>
              <BarSignal active={visiblePlanets.length + 4} />
              <Stat label="Planets" value={`${visiblePlanets.length}/${planets.length || 7}`} />
              <Stat label="Bright stars" value={visibleStars.length} />
            </GlassCard>
        </aside>

        <section className="mission-center">
          <div className="mission-title glass-title">
            <p className="eyebrow"><Sparkles size={15} /> Orbital defense dashboard</p>
            <RevealText text="OrbitX" className="mission-wordmark" />
            <TextEffect>
              Live ISS telemetry, planet visibility, and local sky data.
            </TextEffect>
          </div>

            <div className="asteroid-annotations">
              <div>
              <strong>ISS subpoint</strong>
              <span>{iss ? `${number(iss.latitude, 1)}, ${number(iss.longitude, 1)}` : "Syncing"}</span>
              </div>
              <div>
              <strong>Altitude</strong>
              <span>{iss ? `${number(iss.altitude, 0)} km` : "Acquiring"}</span>
              </div>
              <div>
              <strong>Velocity</strong>
              <span>{iss ? `${number(iss.velocity, 0)} km/h` : "Syncing"}</span>
              </div>
            </div>
        </section>

        <aside className="mission-right">
          <GlassCard title="Live target" icon={AlertTriangle}>
            <div className="threat-object"></div>
            <Stat label="Object" value={bestPlanet?.name ?? "Resolving"} />
            <Stat label="Type" value={bestPlanet?.type ?? "Planet"} />
            <Stat label="Direction" value={bestPlanet ? `${getCompassLabel(bestPlanet.azimuth)} ${number(bestPlanet.azimuth, 0)} deg` : "N/A"} />
            <button className="primary-glow" onClick={() => setActiveView("planets")}>Open orbit view</button>
          </GlassCard>
          <GlassCard title="Local horizon" icon={Crosshair}>
            <ImpactGauge />
          </GlassCard>
        </aside>
      </div>

      <div className="mission-dock">
        <div className="dock-tabs">
          <button>Defense assets</button>
          <button>Active threats</button>
        </div>
        <ThreatCard name="ISS-25544" label="Live satellite" value={iss ? `${number(iss.velocity, 0)} km/h` : "Syncing"} />
        <ThreatCard name={bestPlanet?.name ?? "PLANET"} label="Best visible body" value={bestPlanet ? `${number(bestPlanet.altitude, 0)} deg alt` : "N/A"} />
        <ThreatCard name="SKY-MAP" label="Visible horizon" value={`${visibleStars.length} stars`} />
        <div className="defense-stack">
          <Stat label="ISS update cadence" value="3 sec" />
          <Stat label="Observer source" value={location.source === "gps" ? "GPS" : "Fallback"} />
          <Stat label="Sky model" value="Live ephemeris" />
        </div>
        <div className="mission-metrics">
          <MiniDial label="ISS footprint" value={iss ? `${number(iss.footprint, 0)} km` : "N/A"} />
          <MiniDial label="Visible planets" value={`${visiblePlanets.length}`} />
          <MiniDial label="Bright stars" value={`${visibleStars.length}`} />
        </div>
      </div>
    </section>
  );
}

function Dashboard({ iss, planets, visiblePlanets, skyObservations, location, setActiveView }) {
  const visibleStars = skyObservations.filter((object) => object.visible);
  const bestPlanet = visiblePlanets[0] ?? planets[0];

  return (
    <section className="dashboard-grid">
      <MetricCard icon={Satellite} label="ISS position" value={iss ? `${number(iss.latitude, 2)}, ${number(iss.longitude, 2)}` : "Loading"} detail={`Last update: ${timeFromUnix(iss?.timestamp)}`} />
      <MetricCard icon={Gauge} label="ISS velocity" value={iss ? `${number(iss.velocity, 0)} km/h` : "Loading"} detail={iss ? `Visibility: ${iss.visibility}` : "Waiting for telemetry"} />
      <MetricCard icon={Globe2} label="Observer" value={location ? location.label : "Resolving"} detail={location ? `${number(location.latitude, 2)}, ${number(location.longitude, 2)}` : "Browser permission requested"} />
      <MetricCard icon={Compass} label="Visible sky" value={`${visiblePlanets.length} planets`} detail={`${visibleStars.length} bright stars above horizon`} />

      <div className="panel wide">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Mission control</p>
            <h2>Live orbital dashboard</h2>
          </div>
          <button className="ghost-button" onClick={() => setActiveView("satellite")}>Open tracker</button>
        </div>
        <div className="dashboard-command">
          <MiniOrbit iss={iss} />
          <div className="pass-summary">
            <p className="eyebrow">Best target</p>
            <h3>{bestPlanet ? bestPlanet.name : "Calculating"}</h3>
            <Stat label="Altitude" value={bestPlanet ? `${number(bestPlanet.altitude, 1)} deg` : "N/A"} />
            <Stat label="Direction" value={bestPlanet ? `${getCompassLabel(bestPlanet.azimuth)} / ${number(bestPlanet.azimuth, 0)} deg` : "N/A"} />
            <Stat label="Next rise" value={bestPlanet ? shortTime(bestPlanet.riseTime) : "N/A"} />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Night sky</p>
            <h2>Planet summary</h2>
          </div>
          <button className="ghost-button" onClick={() => setActiveView("planets")}>Explore</button>
        </div>
        <div className="planet-list compact">
          {planets.slice(0, 5).map((planet) => (
            <PlanetRow key={planet.name} planet={planet} />
          ))}
        </div>
      </div>

      <div className="panel full-row">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Local horizon</p>
            <h2>Real-time sky snapshot</h2>
          </div>
          <button className="ghost-button" onClick={() => setActiveView("sky")}>Open sky map</button>
        </div>
        <SkyDome objects={[...visiblePlanets, ...visibleStars.slice(0, 10)]} selectedObject={visibleStars[0]} onSelect={() => setActiveView("sky")} compact />
      </div>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <DotPanel className="metric-card">
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </DotPanel>
  );
}

function GlassCard({ title, icon: Icon, children }) {
  return (
    <div className="glass-card">
      <div className="glass-card-title">
        <span>{title}</span>
        <Icon size={15} />
      </div>
      {children}
    </div>
  );
}

function ArcGauge({ value }) {
  return (
    <div className="arc-gauge" style={{ "--value": `${value}%` }}>
      <span></span>
      <strong>{value}</strong>
    </div>
  );
}

function BarSignal({ active }) {
  return (
    <div className="bar-signal" aria-hidden="true">
      {Array.from({ length: 28 }).map((_, index) => (
        <span key={index} className={index < active ? "hot" : ""}></span>
      ))}
    </div>
  );
}

function ImpactGauge() {
  return (
    <div className="impact-gauge">
      {Array.from({ length: 36 }).map((_, index) => (
        <span key={index} style={{ transform: `rotate(${index * 10}deg) translateY(-72px)` }}></span>
      ))}
      <strong>+</strong>
    </div>
  );
}

function ThreatCard({ name, label, value }) {
  return (
    <div className="threat-card">
      <div className="threat-thumb"></div>
      <div>
        <strong>{name}</strong>
        <span>{label}</span>
      </div>
      <em>{value}</em>
    </div>
  );
}

function MiniDial({ label, value }) {
  return (
    <div className="mini-dial">
      <span></span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function SatelliteTracker({ iss, orbitPath, issError, active }) {
  const center = iss ? [iss.latitude, iss.longitude] : [0, 0];
  const coverageRadiusMeters = iss ? Math.max(250000, iss.footprint * 500) : 0;

  return (
    <section className="tracker-grid improved-tracker">
      <div className="panel tracker-hero">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Live satellite tracker</p>
            <h2>International Space Station</h2>
          </div>
          <div className="tracker-badges">
            <span className={issError ? "offline" : "online"}>{issError ? "Signal degraded" : "Live telemetry"}</span>
            <span>{orbitPath.length} track points</span>
          </div>
          {issError && <span className="warning"><AlertTriangle size={15} /> {issError}</span>}
        </div>
        {active && (
          <MapContainer center={center} zoom={2} minZoom={2} maxZoom={6} worldCopyJump className="iss-map">
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {orbitPath.length > 1 && <Polyline positions={orbitPath} pathOptions={{ color: "#7dd3fc", weight: 3, opacity: 0.8 }} />}
            {iss && (
              <Circle
                center={[iss.latitude, iss.longitude]}
                radius={coverageRadiusMeters}
                pathOptions={{ color: "#67e8f9", fillColor: "#22d3ee", fillOpacity: 0.08, weight: 1.5, opacity: 0.55 }}
              />
            )}
            {iss && (
              <Marker position={[iss.latitude, iss.longitude]} icon={issIcon}>
                <Tooltip permanent direction="top">ISS</Tooltip>
              </Marker>
          )}
        </MapContainer>
        )}
      </div>

      <div className="tracker-card-grid">
        <MetricCard icon={MapPinned} label="Subpoint" value={iss ? `${number(iss.latitude, 2)}, ${number(iss.longitude, 2)}` : "Loading"} detail="Current ISS ground position" />
        <MetricCard icon={Gauge} label="Velocity" value={iss ? `${number(iss.velocity, 0)} km/h` : "Loading"} detail="API-reported orbital speed" />
        <MetricCard icon={Globe2} label="Altitude" value={iss ? `${number(iss.altitude, 1)} km` : "Loading"} detail="Height above Earth" />
      </div>

      <div className="panel stats-panel tracker-side">
        <h2>Telemetry feed</h2>
        <Stat label="Latitude" value={iss ? `${number(iss.latitude, 3)} deg` : "Loading"} />
        <Stat label="Longitude" value={iss ? `${number(iss.longitude, 3)} deg` : "Loading"} />
        <Stat label="Altitude" value={iss ? `${number(iss.altitude, 1)} km` : "Loading"} />
        <Stat label="Velocity" value={iss ? `${number(iss.velocity, 0)} km/h` : "Loading"} />
        <Stat label="Footprint" value={iss ? `${number(iss.footprint, 0)} km` : "Loading"} />
        <Stat label="Visibility" value={iss ? iss.visibility : "Loading"} />
        <Stat label="Path samples" value={orbitPath.length} />
        <Stat label="Last update" value={timeFromUnix(iss?.timestamp)} />
      </div>
    </section>
  );
}

function PlanetViewer({ planets, selectedPlanet, setSelectedPlanet, location }) {
  const [simulationDate, setSimulationDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const planetSystem = useMemo(() => getPlanetSystem(simulationDate), [simulationDate]);
  const filteredSystem = planetSystem.filter((planet) => planet.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const selectedSystemPlanet = planetSystem.find((planet) => planet.name === selectedPlanet?.name);
  const selectedHorizonPlanet = planets.find((planet) => planet.name === selectedPlanet?.name);
  const systemSelection = {
    ...(selectedSystemPlanet ?? planetSystem[2] ?? {}),
    ...(selectedHorizonPlanet ?? selectedPlanet ?? {}),
  };

  return (
    <section className="orrery-layout">
      <aside className="orrery-sidebar panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">List of objects</p>
            <h2>Solar System</h2>
          </div>
        </div>
        <label className="object-search">
          <Search size={15} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search planets"
          />
        </label>
        <div className="object-list">
          {filteredSystem.map((planet) => (
            <button
              key={planet.name}
              className={systemSelection.name === planet.name ? "object-item active" : "object-item"}
              onClick={() => setSelectedPlanet(planet)}
            >
              <span style={{ background: planet.color }}></span>
              <strong>{planet.name}</strong>
              <em>{number(planet.distanceAu, 2)} AU</em>
            </button>
          ))}
        </div>
      </aside>

      <section className="orrery-main panel">
        <div className="orrery-toolbar">
          <div>
            <p className="eyebrow">3D Solar System Viewer</p>
            <h2>Accurate orbit visualization</h2>
          </div>
          <div className="time-controls">
            <button onClick={() => setSimulationDate(new Date(simulationDate.getTime() - 86400000))}>-1 day</button>
            <label>
              <CalendarDays size={15} />
              <input
                type="date"
                value={simulationDate.toISOString().slice(0, 10)}
                onChange={(event) => {
                  const next = new Date(`${event.target.value}T12:00:00`);
                  if (!Number.isNaN(next.getTime())) setSimulationDate(next);
                }}
              />
            </label>
            <button onClick={() => setSimulationDate(new Date(simulationDate.getTime() + 86400000))}>+1 day</button>
            <button onClick={() => setSimulationDate(new Date())}><RotateCcw size={14} /> Now</button>
          </div>
        </div>
        <SolarSystemScene planets={planetSystem} selectedPlanet={systemSelection} onSelect={setSelectedPlanet} />
        <div className="ephemeris-note">
          <span>Real ephemeris</span>
          <strong>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(simulationDate)}</strong>
          <em>Orbit geometry uses real AU coordinates. Planet sizes are enlarged only so they remain clickable.</em>
        </div>
      </section>

      <aside className="orrery-sidebar panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Camera locked to</p>
            <h2>{systemSelection.name}</h2>
          </div>
        </div>
        <DotPanel className="planet-detail in-sidebar">
          <p className="eyebrow">{systemSelection.type}</p>
          <h2>{systemSelection.name}</h2>
          <Stat label="Sun distance" value={`${number(systemSelection.distanceAu, 3)} AU`} />
          <Stat label="Orbital period" value={`${number(systemSelection.periodDays, 0)} days`} />
          <Stat label="Heliocentric X" value={`${number(systemSelection.position?.x, 3)} AU`} />
          <Stat label="Heliocentric Y" value={`${number(systemSelection.position?.y, 3)} AU`} />
          <Stat label="Heliocentric Z" value={`${number(systemSelection.position?.z, 3)} AU`} />
          {Number.isFinite(systemSelection.altitude) && (
            <>
              <Stat label={`From ${location.label}`} value={`${number(systemSelection.altitude, 1)} deg alt`} />
              <Stat label="Direction" value={`${getCompassLabel(systemSelection.azimuth)} / ${number(systemSelection.azimuth, 1)} deg`} />
            </>
          )}
        </DotPanel>
      </aside>

      <section className="planet-grid immersive secondary-planet-grid">
      <div className="panel full-row solar-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Observer sky</p>
            <h2>Altitude / azimuth from {location?.label ?? "your sky"}</h2>
          </div>
        </div>
        <SkyDome objects={planets} selectedObject={systemSelection} onSelect={setSelectedPlanet} />
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Observer sky</p>
            <h2>Visible from {location?.label ?? "your sky"}</h2>
          </div>
        </div>
        <div className="planet-list">
          {planets.map((planet) => (
            <button
              key={planet.name}
              className={selectedPlanet?.name === planet.name ? "planet-row active" : "planet-row"}
              onClick={() => setSelectedPlanet(planet)}
            >
              <PlanetRow planet={planet} />
            </button>
          ))}
        </div>
      </div>
    </section>
    </section>
  );
}

function SkyMap({ selectedObject, setSelectedObject, eclipticObjects, skyObservations, location }) {
  const visibleObjects = skyObservations.filter((object) => object.visible);
  const selectedSkyObject = skyObservations.find((object) => object.id === selectedObject?.id) ?? visibleObjects[0] ?? skyObservations[0];
  const [selectedEcliptic, setSelectedEcliptic] = useState(eclipticObjects[0]);
  const activeEcliptic = eclipticObjects.find((object) => object.name === selectedEcliptic?.name) ?? eclipticObjects[0];

  return (
    <section className="planet-today-layout">
      <div className="panel planet-today-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">The planets today</p>
            <h2>Live ecliptic sky map</h2>
          </div>
          <span className="orbit-help">Earth-centered · zodiac-aligned</span>
        </div>
        <EclipticWheel objects={eclipticObjects} selectedObject={activeEcliptic} onSelect={setSelectedEcliptic} />
      </div>

      <aside className="panel sky-side">
        <p className="eyebrow">Selected body</p>
        <h2>{activeEcliptic.name}</h2>
        <Stat label="Zodiac" value={`${activeEcliptic.zodiac.sign} ${number(activeEcliptic.zodiac.degree, 1)} deg`} />
        <Stat label="Ecliptic longitude" value={`${number(activeEcliptic.longitude, 2)} deg`} />
        <Stat label="Ecliptic latitude" value={`${number(activeEcliptic.latitude, 2)} deg`} />
        <Stat label="Distance from Earth" value={activeEcliptic.name === "Moon" ? `${number(activeEcliptic.distanceAu * 149597870, 0)} km` : `${number(activeEcliptic.distanceAu, 3)} AU`} />
        <Stat label="Motion" value={activeEcliptic.retrograde ? "Retrograde" : "Direct"} />
        <div className="object-list compact-list">
          {eclipticObjects.map((object) => (
            <button
              key={object.name}
              className={activeEcliptic.name === object.name ? "object-item active" : "object-item"}
              onClick={() => setSelectedEcliptic(object)}
            >
              <span style={{ background: object.color }}></span>
              <strong>{object.name}</strong>
              <em>{object.zodiac.sign}</em>
            </button>
          ))}
        </div>
      </aside>

      <div className="panel full-row">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Local horizon</p>
            <h2>Visible stars from {location.label}</h2>
          </div>
        </div>
        <ThreeSkyScene objects={visibleObjects.length ? visibleObjects : skyObservations} selectedObject={selectedSkyObject} onSelect={setSelectedObject} />
      </div>

      <DotPanel className="object-detail full-row">
        <p className="eyebrow">{selectedSkyObject.kind}</p>
        <h2>{selectedSkyObject.name}</h2>
        <Stat label="Constellation" value={selectedSkyObject.constellation} />
        <Stat label="Altitude" value={`${number(selectedSkyObject.altitude, 1)} deg`} />
        <Stat label="Azimuth" value={`${getCompassLabel(selectedSkyObject.azimuth)} / ${number(selectedSkyObject.azimuth, 1)} deg`} />
      </DotPanel>
    </section>
  );
}

function EclipticWheel({ objects, selectedObject, onSelect }) {
  const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  const glyphs = ["Ar", "Ta", "Ge", "Ca", "Le", "Vi", "Li", "Sc", "Sg", "Cp", "Aq", "Pi"];

  return (
    <div className="ecliptic-wheel">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="43" className="zodiac-outer" />
        <circle cx="50" cy="50" r="31" className="zodiac-inner" />
        <circle cx="50" cy="50" r="17" className="zodiac-earth-ring" />
        {Array.from({ length: 36 }).map((_, index) => {
          const angle = (index * 10 - 90) * (Math.PI / 180);
          const inner = index % 3 === 0 ? 31 : 36.5;
          return (
            <line
              key={index}
              x1={50 + Math.cos(angle) * inner}
              y1={50 + Math.sin(angle) * inner}
              x2={50 + Math.cos(angle) * 43}
              y2={50 + Math.sin(angle) * 43}
              className={index % 3 === 0 ? "zodiac-major" : "zodiac-minor"}
            />
          );
        })}
        {signs.map((sign, index) => {
          const angle = ((index * 30 + 15) - 90) * (Math.PI / 180);
          return (
            <text key={sign} x={50 + Math.cos(angle) * 47} y={50 + Math.sin(angle) * 47} className="zodiac-label">
              {glyphs[index]}
            </text>
          );
        })}
      </svg>
      <div className="earth-center">
        <Globe2 size={22} />
        <span>Earth</span>
      </div>
      {objects.map((object) => {
        const angle = (object.longitude - 90) * (Math.PI / 180);
        const radius = object.name === "Moon" ? 22 : object.name === "Sun" ? 28 : 36;
        const x = 50 + Math.cos(angle) * radius;
        const y = 50 + Math.sin(angle) * radius;
        return (
          <button
            key={object.name}
            className={selectedObject?.name === object.name ? "ecliptic-body active" : "ecliptic-body"}
            style={{ left: `${x}%`, top: `${y}%`, "--body-color": object.color }}
            onClick={() => onSelect(object)}
          >
            <span></span>
            <strong>{object.name}</strong>
            {object.retrograde && <em>R</em>}
          </button>
        );
      })}
    </div>
  );
}

function SolarSystemScene({ planets, selectedPlanet, onSelect }) {
  const mountRef = useRef(null);
  const selectedRef = useRef(selectedPlanet?.name);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    selectedRef.current = selectedPlanet?.name;
    onSelectRef.current = onSelect;
  }, [selectedPlanet, onSelect]);

  useEffect(() => {
    if (!mountRef.current || planets.length === 0) return undefined;

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(0, 26, 54);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x9fb8c8, 1.6));
    const sunLight = new THREE.PointLight(0xffffff, 3.8, 120);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    const system = new THREE.Group();
    scene.add(system);

    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    sun.userData = { name: "Sun" };
    system.add(sun);

    const sprites = [];
    const labels = [];
    const orbitLines = [];
    const raycastMeshes = [];
    const auScale = 1.32;

    planets.forEach((planet) => {
      const orbitGeometry = new THREE.BufferGeometry().setFromPoints(
        planet.orbit.map((point) => new THREE.Vector3(point.x * auScale, point.z * auScale, point.y * auScale)),
      );
      const orbitLine = new THREE.Line(
        orbitGeometry,
        new THREE.LineBasicMaterial({ color: new THREE.Color(planet.color), transparent: true, opacity: planet.name === selectedRef.current ? 0.95 : 0.2 }),
      );
      orbitLine.userData = { name: planet.name };
      system.add(orbitLine);
      orbitLines.push(orbitLine);

      const planetPosition = new THREE.Vector3(
        planet.position.x * auScale,
        planet.position.z * auScale,
        planet.position.y * auScale,
      );
      const size = Math.max(0.16, Math.min(0.78, planet.radius * 0.2));
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(size, 32, 32),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(planet.color),
          roughness: 0.62,
          metalness: 0.02,
          emissive: new THREE.Color(planet.color).multiplyScalar(planet.name === selectedRef.current ? 0.22 : 0.04),
        }),
      );
      mesh.position.copy(planetPosition);
      mesh.userData = { planet };
      system.add(mesh);
      sprites.push(mesh);
      raycastMeshes.push(mesh);

      const label = createTextSprite(planet.name, planet.color);
      label.position.copy(planetPosition.clone().add(new THREE.Vector3(0, size + 0.32, 0)));
      label.userData = { name: planet.name };
      system.add(label);
      labels.push(label);
    });

    const starGeometry = new THREE.BufferGeometry();
    const starPositions = Array.from({ length: 900 }, () => {
      const radius = 85;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      return [
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
      ];
    }).flat();
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.75 })));

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const handleClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(raycastMeshes)[0];
      if (hit?.object?.userData?.planet) {
        onSelectRef.current(hit.object.userData.planet);
      }
    };
    renderer.domElement.addEventListener("click", handleClick);

    const handleResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", handleResize);
    const handleWheel = (event) => {
      event.preventDefault();
      const direction = event.deltaY > 0 ? 1 : -1;
      const next = camera.position.length() + direction * 3;
      camera.position.setLength(Math.max(5, Math.min(95, next)));
      camera.lookAt(0, 0, 0);
      render();
    };
    renderer.domElement.addEventListener("wheel", handleWheel, { passive: false });

    let frameId = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const render = () => {
      sprites.forEach((mesh) => {
        const isSelected = mesh.userData.planet.name === selectedRef.current;
        mesh.scale.setScalar(isSelected ? 1.55 : 1);
        mesh.material.emissive = new THREE.Color(mesh.userData.planet.color).multiplyScalar(isSelected ? 0.35 : 0.04);
      });
      orbitLines.forEach((line) => {
        line.material.opacity = line.userData.name === selectedRef.current ? 0.95 : 0.18;
      });
      labels.forEach((label) => {
        label.material.opacity = label.userData.name === selectedRef.current ? 1 : 0.68;
      });
      renderer.render(scene, camera);
    };
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      render();
    };
    const handlePointerDown = (event) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture?.(event.pointerId);
    };
    const handlePointerMove = (event) => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      system.rotation.y += dx * 0.006;
      system.rotation.x = Math.max(-0.7, Math.min(0.7, system.rotation.x + dy * 0.004));
      render();
    };
    const handlePointerUp = (event) => {
      dragging = false;
      renderer.domElement.releasePointerCapture?.(event.pointerId);
    };
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointerleave", handlePointerUp);
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointerleave", handlePointerUp);
      renderer.domElement.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleResize);
      mount.removeChild(renderer.domElement);
      scene.traverse((object) => {
        object.geometry?.dispose?.();
        object.material?.dispose?.();
      });
      renderer.dispose();
    };
  }, [planets]);

  return (
    <div className="three-stage solar-stage" ref={mountRef}>
      <div className="stage-labels">
        <span>Sun-centered live positions</span>
        <strong>{selectedPlanet?.name ?? "Select planet"}</strong>
      </div>
    </div>
  );
}

function ThreeSkyScene({ objects, selectedObject, onSelect }) {
  const mountRef = useRef(null);
  const selectedRef = useRef(selectedObject?.name);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    selectedRef.current = selectedObject?.name;
    onSelectRef.current = onSelect;
  }, [selectedObject, onSelect]);

  useEffect(() => {
    if (!mountRef.current || objects.length === 0) return undefined;
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(56, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.2, 13);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xdbeafe, 1.2));
    const dome = new THREE.Group();
    scene.add(dome);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(7, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x0b1220, wireframe: true, transparent: true, opacity: 0.16 }),
    );
    sphere.rotation.x = Math.PI;
    dome.add(sphere);

    const starMeshes = objects.map((object) => {
      const az = ((object.azimuth ?? 0) - 90) * (Math.PI / 180);
      const alt = Math.max(0, object.altitude ?? 0) * (Math.PI / 180);
      const radius = 6.3;
      const position = new THREE.Vector3(
        Math.cos(alt) * Math.cos(az) * radius,
        Math.sin(alt) * radius,
        Math.cos(alt) * Math.sin(az) * radius,
      );
      const size = Math.max(0.06, 0.18 - (object.magnitude ?? 1) * 0.018);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(size, 16, 16),
        new THREE.MeshBasicMaterial({ color: object.name === selectedRef.current ? 0x67e8f9 : 0xffffff }),
      );
      mesh.position.copy(position);
      mesh.userData = { object };
      dome.add(mesh);
      return mesh;
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const handleClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(starMeshes)[0];
      if (hit?.object?.userData?.object) {
        onSelectRef.current(hit.object.userData.object);
      }
    };
    renderer.domElement.addEventListener("click", handleClick);

    const handleResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    let frameId = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const render = () => {
      starMeshes.forEach((mesh) => {
        const isSelected = mesh.userData.object.name === selectedRef.current;
        mesh.scale.setScalar(isSelected ? 2.4 : 1);
        mesh.material.color.set(isSelected ? 0x67e8f9 : 0xffffff);
      });
      renderer.render(scene, camera);
    };
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      render();
    };
    const handlePointerDown = (event) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture?.(event.pointerId);
    };
    const handlePointerMove = (event) => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      dome.rotation.y += dx * 0.006;
      dome.rotation.x = Math.max(-0.5, Math.min(0.5, dome.rotation.x + dy * 0.003));
      render();
    };
    const handlePointerUp = (event) => {
      dragging = false;
      renderer.domElement.releasePointerCapture?.(event.pointerId);
    };
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointerleave", handlePointerUp);
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointerleave", handlePointerUp);
      window.removeEventListener("resize", handleResize);
      mount.removeChild(renderer.domElement);
      scene.traverse((object) => {
        object.geometry?.dispose?.();
        object.material?.dispose?.();
      });
      renderer.dispose();
    };
  }, [objects]);

  return (
    <div className="three-stage sky-stage" ref={mountRef}>
      <div className="stage-labels">
        <span>3D local horizon dome</span>
        <strong>{selectedObject?.name ?? "Select star"}</strong>
      </div>
    </div>
  );
}

function createTextSprite(text, color = "#ffffff") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = "700 32px Inter, Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = color;
  context.shadowBlur = 12;
  context.fillStyle = "#f8fafc";
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.75, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.4, 1.25, 1);
  return sprite;
}

function SkyDome({ objects, selectedObject, onSelect, compact = false, showConstellations = false }) {
  const objectMap = useMemo(() => new Map(objects.map((object) => [object.id ?? object.name, object])), [objects]);

  return (
    <div className={compact ? "sky-canvas compact" : "sky-canvas"} role="application" aria-label="Interactive local horizon sky map">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <circle cx="50" cy="50" r="46" className="horizon-ring" />
        <circle cx="50" cy="50" r="30" className="alt-ring" />
        <circle cx="50" cy="50" r="15" className="alt-ring" />
        <line x1="50" y1="4" x2="50" y2="96" className="axis-line" />
        <line x1="4" y1="50" x2="96" y2="50" className="axis-line" />
        {showConstellations &&
          constellationLines.map(([from, to]) => {
            const a = objectMap.get(from);
            const b = objectMap.get(to);
            return a && b && a.visible && b.visible ? <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} /> : null;
          })}
      </svg>
      {["N", "E", "S", "W"].map((label, index) => (
        <span key={label} className={`cardinal cardinal-${index}`}>{label}</span>
      ))}
      {objects.map((object) => (
        <button
          key={object.id ?? object.name}
          className={selectedObject?.name === object.name ? "star active" : object.visible ? "star" : "star dimmed"}
          style={{
            left: `${object.x ?? 50}%`,
            top: `${object.y ?? 50}%`,
            "--size": `${Math.max(7, 15 - (object.magnitude ?? 1) * 2)}px`,
          }}
          onClick={() => onSelect(object)}
          aria-label={`Open ${object.name} details`}
        >
          <span></span>
          <small>{object.name}</small>
        </button>
      ))}
    </div>
  );
}

function MiniOrbit({ iss }) {
  return (
    <div className="mini-orbit">
      <div className="earth"></div>
      <motion.div className="mini-sat" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 9, ease: "linear" }}>
        <Satellite size={18} />
      </motion.div>
      <div className="orbit-meta">
        <strong>{iss ? `${number(iss.latitude, 2)} / ${number(iss.longitude, 2)}` : "Waiting for first fix"}</strong>
        <span>Latitude / longitude</span>
      </div>
    </div>
  );
}

function PlanetRow({ planet }) {
  return (
    <div className="planet-row-inner">
      <span className={planet.visible ? "planet-dot visible" : "planet-dot"}></span>
      <div>
        <strong>{planet.name}</strong>
        <small>{planet.type} · {getCompassLabel(planet.azimuth)} {number(planet.azimuth, 0)} deg</small>
      </div>
      <em>{planet.visible ? `${number(planet.altitude, 0)} deg` : "Below"}</em>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SparklesBackground() {
  return (
    <div className="sparkles-bg" aria-hidden="true">
      <SparklesCore
        background="transparent"
        particleColor="#e0f2fe"
        particleDensity={85}
        minSize={0.35}
        maxSize={1.7}
        speed={0.6}
      />
    </div>
  );
}

function RevealText({ text, className = "" }) {
  return (
    <span className={`reveal-text ${className}`} aria-label={text}>
      {text.split("").map((letter, index) => (
        <span
          key={`${letter}-${index}`}
          style={{ "--delay": `${index * 0.045}s` }}
          aria-hidden="true"
        >
          {letter}
        </span>
      ))}
    </span>
  );
}

function TextEffect({ children }) {
  return (
    <p className="text-effect">
      {children}
    </p>
  );
}

function DotPanel({ children, className = "" }) {
  return <div className={`dot-panel ${className}`}>{children}</div>;
}

function DotQuote({ children }) {
  return <aside className="dot-panel dot-quote">{children}</aside>;
}

function OrbitFooter() {
  return (
    <footer className="footer-section">
      <div>
        <RevealText text="OrbitX" />
        <p>Space tracker and sky explorer. Footer profile details can drop in here next.</p>
      </div>
      <div className="footer-links">
        <a href="#top">Dashboard</a>
        <a href="#top">Tracker</a>
        <a href="#top">Planets</a>
        <a href="#top">Sky Map</a>
      </div>
    </footer>
  );
}

export default App;
