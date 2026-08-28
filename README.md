# ReRoute

A client-side navigation web application that allows you to calculate optimal driving routes while avoiding custom blacklisted roads and geographic areas. Built to run statically on GitHub Pages with no backend required.

## Demo

[![Watch the demo](https://img.youtube.com/vi/h7j3P__1ub4/0.jpg)](https://www.youtube.com/watch?v=h7j3P__1ub4)

## Key Features

- **Custom Blacklisting**: Blacklist specific road segments or draw custom polygon zones directly on the map.
- **Smart Avoidance Engine**: Calculates detours around blacklisted geometries using Turf.js spatial buffering and OSRM API routing.
- **Alternative Routes**: Visualizes multiple candidate paths with high-contrast, theme-aware styling.
- **Interactive Editing**: Move start/destination markers or adjust polygon vertices in real time.
- **Shareable Route Codes**: Generate lightweight route data strings to copy or import instantly.
- **Dark & Light Modes**: Choose between CartoDB Dark Matter and Positron themes (persisted in `localStorage`).
- **Import / Export & History**: Import/export blacklists as JSON, clear history, and use Undo/Redo (`Ctrl+Z` / `Ctrl+Y`).

## Tech Stack

- **Core Framework**: React 18, TypeScript, Vite
- **Mapping**: MapLibre GL JS
- **Tile Provider**: OpenStreetMap
- **Geospatial Computations**: Turf.js
- **Routing Engine**: Open Source Routing Machine (OSRM)
- **Geocoding**: OpenStreetMap Nominatim
- **Styling**: Tailwind CSS & Lucide Icons

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build
```
