const { createApp, onMounted, ref } = Vue

createApp({
  setup() {
    const loading = ref(true)
    const landPoints = ref({
      type: 'FeatureCollection',
      features: []
    })
    const map = ref(null)
    const statusMessage = ref('')
    const simulationRunning = ref(false)
    const simulationStep = ref(0)
    const simulationInterval = ref(null)
    const simulationSpeed = ref(1000) // milliseconds between steps

    function downloadGeoJSON() {
      const dataStr = JSON.stringify(landPoints.value);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = 'finger_lakes_grid_points_1km_with_risk.geojson';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }

    function startSimulation() {
      console.log('Starting simulation');
      if (simulationRunning.value) return;
      
      // Reset simulation state
      simulationStep.value = 0;
      
      // Reset all points to their original risk values
      landPoints.value.features.forEach(feature => {
        feature.properties.infected = false;
        feature.properties.infectionStep = -1;
      });
      
      // Infect points as initial outbreak locations based on risk (suitability)
      // Higher risk points are more likely to be selected as initial outbreak locations
      const initialOutbreaks = 1; // Start with just 1 outbreak
      let outbreaksCreated = 0;
      
      // Try to create outbreaks until we have the desired number
      while (outbreaksCreated < initialOutbreaks) {
        // Randomly select a point
        const randomIndex = Math.floor(Math.random() * landPoints.value.features.length);
        const point = landPoints.value.features[randomIndex];
        
        // Determine if this point becomes an outbreak based on its risk (suitability)
        // Higher risk points have a higher chance of becoming outbreak locations
        // Add a base probability to ensure even low suitability points can be infected
        const baseProbability = 0.05; // 5% base chance for any point
        const suitabilityBonus = point.properties.risk * 0.85; // Up to 85% additional chance
        const outbreakChance = baseProbability + suitabilityBonus;
        
        if (Math.random() < outbreakChance) {
          point.properties.infected = true;
          point.properties.infectionStep = 0;
          outbreaksCreated++;
        }
      }
      
      // Update the map
      map.value.getSource('grid-points').setData(landPoints.value);
      
      // Start the simulation
      simulationRunning.value = true;
      statusMessage.value = 'Simulation started. Step 0: Initial outbreak.';
      document.getElementById('status').textContent = statusMessage.value;
      
      // Run simulation steps
      simulationInterval.value = setInterval(runSimulationStep, simulationSpeed.value);
    }
    
    function stopSimulation() {
      if (!simulationRunning.value) return;
      
      clearInterval(simulationInterval.value);
      simulationRunning.value = false;
      statusMessage.value = `Simulation stopped at step ${simulationStep.value}.`;
      document.getElementById('status').textContent = statusMessage.value;
    }
    
    function resetSimulation() {
      stopSimulation();
      
      // Reset all points to their original state
      landPoints.value.features.forEach(feature => {
        feature.properties.infected = false;
        feature.properties.infectionStep = -1;
      });
      
      // Update the map
      map.value.getSource('grid-points').setData(landPoints.value);
      
      // Update the layer paint properties to show risk colors
      map.value.setPaintProperty('grid-points', 'circle-color', [
        'interpolate',
        ['linear'],
        ['get', 'risk'],
        0.0, '#ffff00',  // Low risk (yellow)
        1.0, '#ff0000'   // High risk (red)
      ]);
      
      simulationStep.value = 0;
      statusMessage.value = 'Simulation reset.';
      document.getElementById('status').textContent = statusMessage.value;
    }
    
    function runSimulationStep() {
      simulationStep.value++;
      
      // Get all infected points from the previous step
      const infectedPoints = landPoints.value.features.filter(
        f => f.properties.infected && f.properties.infectionStep === simulationStep.value - 1
      );
      
      if (infectedPoints.length === 0) {
        // No more points to infect, simulation complete
        stopSimulation();
        statusMessage.value = `Simulation complete at step ${simulationStep.value}.`;
        document.getElementById('status').textContent = statusMessage.value;
        return;
      }
      
      // For each infected point, try to infect nearby points
      infectedPoints.forEach(point => {
        const [lon, lat] = point.geometry.coordinates;
        
        // Find nearby points (within ~2km)
        const nearbyPoints = landPoints.value.features.filter(f => {
          if (f.properties.infected) return false; // Skip already infected points
          
          const [nearLon, nearLat] = f.geometry.coordinates;
          const distance = calculateDistance(lat, lon, nearLat, nearLon);
          return distance <= 0.02; // Approximately 2km
        });
        
        // Infect nearby points based on their risk value (suitability)
        nearbyPoints.forEach(nearPoint => {
          // Risk value represents suitability - higher risk points are more likely to be infected
          // but even low risk points can be infected with lower probability
          // Add a base probability to ensure even low suitability points can be infected
          const baseProbability = 0.05; // 5% base chance for any point (reduced from 15%)
          const suitabilityBonus = nearPoint.properties.risk * 0.75; // Up to 75% additional chance (increased from 45%)
          const infectionChance = baseProbability + suitabilityBonus;
          
          if (Math.random() < infectionChance) {
            nearPoint.properties.infected = true;
            nearPoint.properties.infectionStep = simulationStep.value;
          }
        });
      });
      
      // Update the map with new infection status
      map.value.getSource('grid-points').setData(landPoints.value);
      
      // Update the layer paint properties to show infection status
      map.value.setPaintProperty('grid-points', 'circle-color', [
        'case',
        ['get', 'infected'],
        '#0000ff', // Infected points are blue
        [
          'interpolate',
          ['linear'],
          ['get', 'risk'],
          0.0, '#ffff00',  // Low risk (yellow)
          1.0, '#ff0000'   // High risk (red)
        ]
      ]);
      
      // Count infected and uninfected points
      const infectedCount = landPoints.value.features.filter(f => f.properties.infected).length;
      const uninfectedCount = landPoints.value.features.length - infectedCount;
      
      // Update status
      statusMessage.value = `Step ${simulationStep.value}: ${infectedCount} infected, ${uninfectedCount} uninfected.`;
      document.getElementById('status').textContent = statusMessage.value;
    }
    
    // Helper function to calculate distance between two points (in degrees)
    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371; // Radius of the earth in km
      const dLat = deg2rad(lat2 - lat1);
      const dLon = deg2rad(lon2 - lon1);
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      const d = R * c; // Distance in km
      return d / 111.32; // Convert to degrees (approximately)
    }
    
    function deg2rad(deg) {
      return deg * (Math.PI/180);
    }

    onMounted(() => {
      // Initialize map
      mapboxgl.accessToken = 'pk.eyJ1IjoibnJnNDIiLCJhIjoiY205OHJmYWNjMDY0ajJrb2JqazQ5cWw4NiJ9.GDAeRs3uwE8Y-WaqLyFomw';
      map.value = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-76.8, 42.7], // Centered on Finger Lakes region
        zoom: 9
      });

      // Add points when map loads
      map.value.on('load', () => {
        // Add terrain source
        map.value.addSource('mapbox-dem', {
          'type': 'raster-dem',
          'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
          'tileSize': 512,
          'maxzoom': 14
        });
        
        // Add terrain layer
        map.value.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
        
        // Load the processed grid points GeoJSON file with risk values
        fetch('/data/finger_lakes_grid_points_1km_with_risk.geojson')
          .then(response => response.json())
          .then(data => {
            landPoints.value = data;
            
            // Add the source
            map.value.addSource('grid-points', {
              type: 'geojson',
              data: data
            });

            // Add the layer with risk-based coloring
            map.value.addLayer({
              id: 'grid-points',
              type: 'circle',
              source: 'grid-points',
              paint: {
                'circle-radius': 4,
                'circle-color': [
                  'interpolate',
                  ['linear'],
                  ['get', 'risk'],
                  0.0, '#ffff00',  // Low risk (yellow)
                  1.0, '#ff0000'   // High risk (red)
                ],
                'circle-opacity': 1,
              }
            });
            
            // Load and add vineyards centroids layer
            console.log('Attempting to load vineyards data...');
            fetch('/data/finger_lakes_vineyards_centroids.geojson')
              .then(response => {
                console.log('Fetch response received:', response.status);
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
              })
              .then(data => {
                console.log('Vineyards data loaded successfully:', data.features.length, 'features');
                
                if (!map.value.getSource('vineyards')) {
                  // Add the source
                  map.value.addSource('vineyards', {
                    type: 'geojson',
                    data: data
                  });

                  // Add the layer
                  map.value.addLayer({
                    id: 'vineyards',
                    type: 'circle',
                    source: 'vineyards',
                    paint: {
                      'circle-radius': 8,  // Increased size
                      'circle-color': '#800080',  // Purple color for vineyards
                      'circle-opacity': 0.9,  // Increased opacity
                      'circle-stroke-width': 2,  // Increased stroke width
                      'circle-stroke-color': '#ffffff'
                    }
                  });
                  
                  // Add a legend for the vineyards
                  const legend = document.getElementById('legend');
                  const vineyardsLegend = document.createElement('div');
                  vineyardsLegend.innerHTML = '<div class="legend-item"><span class="legend-color" style="background-color: #800080;"></span>Vineyards</div>';
                  legend.appendChild(vineyardsLegend);
                  
                  console.log('Vineyards layer added successfully');
                } else {
                  console.log('Vineyards source already exists, updating data');
                  map.value.getSource('vineyards').setData(data);
                }
              })
              .catch(error => {
                console.error('Error loading vineyards GeoJSON file:', error);
                statusMessage.value = `Error loading vineyards: ${error.message}`;
                document.getElementById('status').textContent = statusMessage.value;
              });
            
            // Count high and low risk points
            const highRiskCount = data.features.filter(f => f.properties.risk === 1.0).length;
            const lowRiskCount = data.features.filter(f => f.properties.risk === 0.0).length;
            
            // Update status
            statusMessage.value = `Loaded ${data.features.length} grid points (${highRiskCount} high risk, ${lowRiskCount} low risk).`;
            document.getElementById('status').textContent = statusMessage.value;
            
            // Hide loading indicator
            loading.value = false;
            document.getElementById('loading').style.display = 'none';
          })
          .catch(error => {
            console.error('Error loading GeoJSON file:', error);
            statusMessage.value = 'Error loading data file.';
            document.getElementById('status').textContent = statusMessage.value;
            loading.value = false;
            document.getElementById('loading').style.display = 'none';
          });
      });
    });

    return {
      loading,
      downloadGeoJSON,
      startSimulation,
      stopSimulation,
      resetSimulation,
      simulationRunning,
      simulationStep
    }
  }
}).mount('#app') 