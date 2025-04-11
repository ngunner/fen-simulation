# FEN Simulator

A Vue.js application for visualizing chess positions using Forsyth–Edwards Notation, featuring a grid overlay for the Finger Lakes region of New York with spotted lanternfly outbreak simulation.

## Project Structure

```
fen-simulation/
├── data/                           # Data files
│   └── finger_lakes_grid_points_1km_with_risk.geojson  # Processed grid points with suitability values
├── src/                            # Source code
│   ├── app.js                      # Vue application logic
│   └── styles.css                  # CSS styles
└── index.html                      # Main HTML file
```

## Features

- Interactive map centered on the Finger Lakes region
- 3D terrain visualization
- Grid points with suitability values (1.0 for high suitability, 0.0 for low suitability)
- Color-coded visualization (red for high suitability, yellow for low suitability)
- Spotted lanternfly outbreak simulation
- Download GeoJSON functionality

## Usage

1. Open `index.html` in a web browser
2. The map will load with the grid points displayed
3. Use the simulation controls to:
   - Start a simulation of spotted lanternfly outbreaks
   - Stop the simulation at any time
   - Reset the simulation to its initial state
4. Use the download button to save the GeoJSON data

## Simulation Model

The simulation models how spotted lanternfly outbreaks might spread across the region:

- Initial outbreaks occur randomly with probability based on suitability
- Each step, infected locations can spread to nearby points
- Higher suitability points are more likely to become infected, but even low suitability points can be infected
- The simulation continues until no new points are infected

## Dependencies

- Vue.js 3
- Mapbox GL JS 