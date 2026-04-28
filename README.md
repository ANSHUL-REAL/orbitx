# OrbitX

OrbitX is a browser-based space dashboard built with React and Vite.

I made it as a visual exploration project around live orbital data, local sky calculations, and interactive space-themed UI. The app brings together ISS tracking, a planet view, and a sky map in one interface instead of splitting them into separate mini tools.

## What it includes

- live ISS location tracking on an interactive map
- a planet view driven by astronomy calculations
- a local sky map with visible objects and constellation lines
- a dashboard-style landing view with quick telemetry summaries
- animated visuals built with Three.js, Framer Motion, and particle effects

## Main views

### Dashboard

The dashboard acts like a mission-control summary. It surfaces the current ISS state, visible planets, local observing location, and quick links into the deeper views.

### ISS tracker

This view shows:

- current ISS position
- recent orbital path
- map-based visualization with coverage circle
- basic telemetry such as altitude and velocity

### Planet viewer

This section presents planetary observations and a solar-system-style scene based on the current time and observer location.

### Sky map

The sky map focuses on what is visible from the user's horizon and lets the user inspect stars and other sky objects more interactively.

## Tech stack

- React
- Vite
- Framer Motion
- Three.js
- Leaflet / React-Leaflet
- Astronomy Engine
- tsParticles

## Local setup

```bash
git clone https://github.com/ANSHUL-REAL/orbitx.git
cd orbitx
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

Production build:

```bash
npm run build
npm run preview
```

## Project structure

```text
src/
  components/        Reusable UI and visual components
  data/              Static sky object data
  services/          ISS, astronomy, and location services
  utils/             Formatting helpers
  App.jsx            Main app shell and views
  styles.css         Styling
```

## APIs and data sources

- ISS position feed
- astronomy calculations via `astronomy-engine`
- browser geolocation for observer context, with fallback location handling

## Why this repo looked weak before

The older README was too generic, had placeholder text, and did not really describe what the app already does. This version is more accurate to the current codebase and less like a template.

## Limitations

- accuracy depends on the external ISS data source and browser location access
- the app is a visualization project, not a scientific tool
- some views prioritize visual exploration over strict simulation depth

## Next improvements

- cleaner mobile layout for denser data panels
- selectable time offsets for future sky states
- support for more orbital objects beyond the ISS
- hosted demo link

## Author

Anshul Nautiyal

- GitHub: [https://github.com/ANSHUL-REAL](https://github.com/ANSHUL-REAL)
- LinkedIn: [https://www.linkedin.com/in/anshul-nautiyal-42760236b/](https://www.linkedin.com/in/anshul-nautiyal-42760236b/)
