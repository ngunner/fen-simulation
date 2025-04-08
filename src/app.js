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

    function downloadGeoJSON() {
      const dataStr = JSON.stringify(landPoints.value);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = 'finger_lakes_grid_points_1km_with_risk.geojson';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
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
                'circle-opacity': 0.8,
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#fff'
              }
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
      downloadGeoJSON
    }
  }
}).mount('#app') 