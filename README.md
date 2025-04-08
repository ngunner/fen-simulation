# FEN Simulator

A Vue.js application for visualizing chess positions using Forsyth–Edwards Notation, featuring a grid overlay for the Finger Lakes region of New York.

## Project Structure

```
fen-simulation/
├── data/                           # Data files
│   └── finger_lakes_grid_points_1km_with_risk.geojson  # Processed grid points with risk values
├── src/                            # Source code
│   ├── app.js                      # Vue application logic
│   └── styles.css                  # CSS styles
└── index.html                      # Main HTML file
```

## Features

- Interactive map centered on the Finger Lakes region
- 3D terrain visualization
- Grid points with risk values (1.0 for high risk, 0.0 for low risk)
- Color-coded visualization (red for high risk, yellow for low risk)
- Download GeoJSON functionality

## Usage

1. Open `index.html` in a web browser
2. The map will load with the grid points displayed
3. Use the download button to save the GeoJSON data

## Dependencies

- Vue.js 3
- Mapbox GL JS 