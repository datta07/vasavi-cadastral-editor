# Vasavi Nagar Colony - Cadastral Plot Editor & Calibrator

An interactive GIS cadastral map editor and spatial calibrator built with React, Vite, Leaflet, and Leaflet-Geoman.

Live Demo: [https://datta07.github.io/vasavi-cadastral-editor/](https://datta07.github.io/vasavi-cadastral-editor/)

## Features

- **Offline & Online Satellite Imagery**: Built-in offline satellite tile cache alongside Apple Maps, Google Satellite, and Esri imagery layers.
- **Cadastral Plot Alignment & Nudge Panel**: Calibrate and translate GeoJSON coordinates along North/South and East/West vectors in real-time or bake offsets permanently.
- **Interactive Editing & Drawing**: Add, reshape, edit vertex points, rotate, cut, drag, and delete parcel polygons using Geoman integration.
- **Snap-to-Grid & Reference Guides**: Snapping assistance and reference guide lines for cadastral surveying accuracy.
- **Measurement Tools**: Distance ruler and freehand polyline measurement tools.
- **Quick Search & Filter**: Search plots by Plot Number, Survey Document Number, or Owner Name with instant zoom and detail inspection.
- **Import & Export**: Seamlessly import existing GeoJSON feature collections and export updated cadastral parcels conforming to RFC 7946 specifications.

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

Automated CI/CD via GitHub Actions workflow (`.github/workflows/deploy.yml`) publishes the Vite production build to GitHub Pages upon pushing to the `main` branch.
