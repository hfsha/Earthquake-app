let rawData = [];
let filteredData = [];
let currentPage = 1;
let entriesPerPage = 10;
let earthquakeData = [];

// Helper function to get color based on magnitude
function magnitudeColor(magnitude, fill = false) {
  // Handle potential NaN or null magnitude
  const mag = magnitude || 0;
  if (mag >= 7.0) return fill ? 'rgba(255, 61, 0, 0.7)' : '#FF3D00'; // Critical (Red)
  else if (mag >= 6.0) return fill ? 'rgba(233, 30, 99, 0.7)' : '#E91E63'; // High (Pink/Red)
  else if (mag >= 4.5) return fill ? 'rgba(255, 193, 7, 0.7)' : '#FFC107'; // Medium (Orange)
  else return fill ? 'rgba(0, 188, 212, 0.7)' : '#00BCD4'; // Low (Cyan)
}

// Dark Mode Toggle
document.addEventListener('DOMContentLoaded', function() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    // Check for saved dark mode preference
    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'enabled') {
        document.body.classList.add('dark-mode');
    }
    
    // Toggle dark mode
    darkModeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        
        // Save preference
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('darkMode', 'enabled');
        } else {
            localStorage.setItem('darkMode', 'disabled');
        }
    });
});

// Fetch data from backend API
async function fetchData() {
  try {
    console.log("Attempting to fetch data...");
    const res = await fetch('/api/data');

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    console.log("Raw data received:", data.slice(0, 2)); // Log first two records

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No data received or invalid data format');
    }

    // Ensure date_time is parsed as Date objects and numeric values are numbers
    rawData = data.map(d => {
      try {
        return {
          ...d,
          date_time: d.date_time ? new Date(d.date_time) : null, // Handle potential null date_time
          magnitude: parseFloat(d.magnitude) || 0, // Default to 0 if parsing fails
          depth: parseFloat(d.depth) || 0, // Default to 0 if parsing fails
          tsunami: d.tsunami != null ? parseInt(d.tsunami) : null, // Keep tsunami as 0, 1, or null
          significance: parseFloat(d.sig) || 0, // Use the correct 'sig' property from backend, default to 0 if parsing fails
          latitude: parseFloat(d.latitude) || null, // Keep latitude as number or null
          longitude: parseFloat(d.longitude) || null // Keep longitude as number or null
        };
      } catch (err) {
        console.error('Error processing record:', d, err);
        return null;
      }
    }).filter(d => d !== null); // Remove any records that failed to process

    if (rawData.length === 0) {
      throw new Error('No valid records after processing');
    }

    filteredData = [...rawData];
    console.log("Successfully processed data. Records:", rawData.length);
    console.log("Sample record:", rawData[0]);
    // Add log to check magnitude_type in processed data
    console.log("Sample magnitude_type values:", rawData.slice(0, 10).map(d => d.magnitude_type));

    // Initialize visualizations with the fetched data
    updateSummaryCards(filteredData);
    violinPlot(filteredData);
    timeSeriesPlot(filteredData);
    typePieChart(filteredData);
    regionsBarChart(filteredData);
    initHeatmap(filteredData); // Initialize enhanced heatmap
    correlationHeatmap(filteredData); // Initialize correlation heatmap
    depthDistributionPlots(filteredData);
    sigDistributionPlots(filteredData);
    magDepthScatterPlot(filteredData); // The preferred Magnitude vs Depth plot
    magSigScatterPlot(filteredData); // Magnitude vs Significance
    magTypeDistributionPlots(filteredData); // Magnitude Measurement Type
    tsunamiDistributionPlots(filteredData); // Tsunami Analysis
    detailedCountryAnalysis(filteredData); // Detailed Country Analysis

  } catch (error) {
    console.error('Error fetching or processing data:', error);
    // Show error message to user
    document.getElementById('totalEarthquakes').textContent = 'Error';
    document.getElementById('avgMagnitude').textContent = 'Error';
    document.getElementById('avgDepth').textContent = 'Error';
    // Optionally display error on charts
     document.querySelectorAll('[id^="chart-"]').forEach(chartDiv => {
         Plotly.purge(chartDiv.id); // Attempt to clear the chart
         chartDiv.innerHTML = '<div class="no-data-message">Error loading data: ' + error.message + '</div>';
     });
  }
}

// Update labels for filter inputs
function updateFilterLabels() {
  // Add logic here if you have any slider labels or similar to update
}

// Filter data based on UI selections
function filterData() {
  const minMagnitude = parseFloat(document.getElementById('minMagnitude').value) || 0;
  const maxMagnitude = parseFloat(document.getElementById('maxMagnitude').value) || 10;
  const minDepth = parseFloat(document.getElementById('minDepth').value) || 0;
  const maxDepth = parseFloat(document.getElementById('maxDepth').value) || Infinity;
  const startDate = document.getElementById('startDate').value ? new Date(document.getElementById('startDate').value) : null;
  const endDate = document.getElementById('endDate').value ? new Date(document.getElementById('endDate').value) : null;
  const categoryFilter = document.getElementById('typeFilter').value;

  filteredData = rawData.filter(d => {
    // Ensure magnitude, depth, and date_time are valid for filtering
    const magnitude = parseFloat(d.magnitude);
    const depth = parseFloat(d.depth);
    const dateTime = d.date_time instanceof Date && !isNaN(d.date_time) ? d.date_time : null;

    const magnitudeMatch = !isNaN(magnitude) && magnitude >= minMagnitude && magnitude <= maxMagnitude;
    const depthMatch = !isNaN(depth) && depth >= minDepth && depth <= maxDepth;

    let dateMatch = true;
    if (startDate && endDate) {
        // Adjust endDate to include the entire day
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
        dateMatch = dateTime && dateTime >= startDate && dateTime < adjustedEndDate; // Use dateTime for comparison
    } else if (startDate) {
        dateMatch = dateTime && dateTime >= startDate; // Use dateTime for comparison
    } else if (endDate) {
         // Adjust endDate to include the entire day
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
        dateMatch = dateTime && dateTime < adjustedEndDate; // Use dateTime for comparison
    } else if (!startDate && !endDate) {
         dateMatch = true; // If no dates are selected, all dates match
    } else {
        dateMatch = false; // If date_time is invalid and dates are selected
    }

    const categoryMatch = (categoryFilter === 'All') || (d.magnitude_category === categoryFilter);

    return magnitudeMatch && depthMatch && dateMatch && categoryMatch;
  });
  console.log("Filtered data:", filteredData.length, filteredData); // Log filtered data
}

// Animate numeric count-up for summary cards
function animateCount(id, endValue, decimals = 0) {
  const el = document.getElementById(id);
  if (!el) return;
  let start = 0;
  const duration = 800;
  const stepTime = 15;
  const increment = endValue / (duration / stepTime);

  function step() {
    start += increment;
    if (start >= endValue) {
      el.textContent = endValue.toFixed(decimals);
    } else {
      el.textContent = start.toFixed(decimals);
      requestAnimationFrame(step);
    }
  }
  // Handle non-numeric or zero values
  if (isNaN(endValue) || endValue === 0) {
    el.textContent = endValue.toFixed(decimals);
    return;
  }
  step();
}

// Update summary cards with filtered data
function updateSummaryCards(data) {
  if (data.length === 0) {
    document.getElementById('totalEarthquakes').textContent = '-';
    document.getElementById('avgMagnitude').textContent = '-';
    document.getElementById('avgDepth').textContent = '-';
    return;
  }

  // Filter out non-numeric values before calculating averages
  const validMagnitudeData = data.map(d => d.magnitude).filter(m => typeof m === 'number' && !isNaN(m));
  const validDepthData = data.map(d => d.depth).filter(d => typeof d === 'number' && !isNaN(d));

  const totalEarthquakes = data.length;
  const avgMagnitude = validMagnitudeData.length > 0 ? validMagnitudeData.reduce((sum, m) => sum + m, 0) / validMagnitudeData.length : 0;
  const avgDepth = validDepthData.length > 0 ? validDepthData.reduce((sum, d) => sum + d, 0) / validDepthData.length : 0;

  animateCount('totalEarthquakes', totalEarthquakes);
  animateCount('avgMagnitude', avgMagnitude, 2);
  animateCount('avgDepth', avgDepth, 2);
}

// Violin plot: Magnitude Distribution
function violinPlot(data) {
  console.log("violinPlot called with data:", data.length);
  // Filter out invalid data for violin plot
  const validData = data.filter(d => d.magnitude != null && !isNaN(d.magnitude));
   console.log("violinPlot - valid data points:", validData.length);

  const magnitudeCategories = {
      'Low': [0, 4.5],
      'Medium': [4.5, 6.0],
      'High': [6.0, 7.0],
      'Critical': [7.0, Infinity]
  };

  const traces = Object.keys(magnitudeCategories).map(category => {
      const [min, max] = magnitudeCategories[category];
      const categoryData = validData.filter(d => d.magnitude >= min && d.magnitude < max); // Use validData
      return {
          type: 'violin',
          y: categoryData.map(d => d.magnitude), // Use categoryData
          name: `${category} (${min}-${max}${category === 'Critical' ? '>' : ''})`,
          box: { visible: true },
          meanline: { visible: true },
          points: 'none', // Hide individual points for clarity
          jitter: 0.05,
          scalemode: 'count',
          fillcolor: magnitudeColor(min + (max-min)/2, true), // Use fill color based on magnitude
          line: { color: magnitudeColor(min + (max-min)/2, false) }
      };
  }).filter(trace => trace.y.length > 0); // Only include traces with data

  const layout = {
    title: 'Magnitude Distribution by Category',
    yaxis: { title: 'Magnitude', zeroline: false },
    height: 360,
    margin: { t: 40, r: 20, b: 60, l: 60 },
    showlegend: true,
    legend: { orientation: 'h', y: 1.1 }
  };

   const chartDiv = document.getElementById('chart-violin');

  if (!traces || traces.length === 0) {
      console.warn("No valid traces to plot for violin plot.");
      if(chartDiv) Plotly.purge(chartDiv);
      if(chartDiv) chartDiv.innerHTML = '<div class="no-data-message">No data available for Magnitude Distribution</div>';
      return;
  }

  console.log("Plotting Violin Plot with", traces.length, "traces.");
  if(chartDiv) Plotly.newPlot(chartDiv, traces, layout, { responsive: true });
}

// Time series plot: Earthquake Frequency Over Time
function timeSeriesPlot(data, period = 'day') {
  console.log("timeSeriesPlot called with data:", data.length, "period:", period);
  // Aggregate data by selected period
  const counts = {};
  // Filter out records with invalid date_time before aggregation
  const validData = data.filter(d => d.date_time instanceof Date && !isNaN(d.date_time));
  console.log("timeSeriesPlot - valid data points after date check:", validData.length);

  validData.forEach(d => {
      let key;
      if (period === 'day') key = d.date_time.toDateString();
      else if (period === 'week') { 
        const date = new Date(d.date_time.getFullYear(), d.date_time.getMonth(), d.date_time.getDate());
        const dayOfWeek = date.getDay();
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - dayOfWeek);
        key = startOfWeek.toDateString();
      } else if (period === 'month') key = `${d.date_time.getFullYear()}-${d.date_time.getMonth() + 1}`;
      else if (period === 'year') key = `${d.date_time.getFullYear()}`;
      
      // Ensure key is a string or a consistent type for grouping
      if (key) {
        counts[key] = (counts[key] || 0) + 1;
      }
  });
  
  console.log("timeSeriesPlot - generated counts:", counts);

  // Sort dates/keys correctly
  const sortedKeys = Object.keys(counts).sort((a, b) => {
      if (period === 'month' || period === 'year') return a.localeCompare(b); // String comparison for year/month strings
      return new Date(a) - new Date(b); // Date object comparison for day/week strings
  });
  
   const chartDiv = document.getElementById('chart-time-series');

  if (!sortedKeys || sortedKeys.length === 0) {
      console.warn("No data to plot for time series");
      if(chartDiv) Plotly.purge(chartDiv);
      if(chartDiv) chartDiv.innerHTML = '<div class="no-data-message">No data available for Time Series</div>';
      return;
  }

  const x = sortedKeys.map(key => period === 'month' || period === 'year' ? key : new Date(key));
  const y = sortedKeys.map(key => counts[key]);

  const trace = {
    x: x,
    y: y,
    mode: 'lines+markers',
    type: 'scatter',
    marker: { size: 5 },
    line: { color: 'var(--primary)' }
  };

  const layout = {
    title: `Earthquake Frequency Over Time (${period.charAt(0).toUpperCase() + period.slice(1)}ly)`,
    xaxis: { title: 'Time', type: (period === 'day' || period === 'week' ? 'date' : 'category') }, // Use date type for daily/weekly
    yaxis: { title: 'Number of Earthquakes' },
    height: 360,
    margin: { t: 40, r: 20, b: 60, l: 60 },
    hovermode: 'x unified'
  };

   if (!trace.x || trace.x.length === 0 || !trace.y || trace.y.length === 0) {
       console.warn("Time series trace has no data after mapping.");
       if(chartDiv) Plotly.purge(chartDiv);
       if(chartDiv) chartDiv.innerHTML = '<div class="no-data-message">No data available for Time Series</div>';
       return;
   }

  console.log("Plotting Time Series Plot with data:", trace.x.length);
  if(chartDiv) Plotly.newPlot(chartDiv, [trace], layout, { responsive: true });
}

// Pie chart: Magnitude Category Distribution
function typePieChart(data) {
  console.log("typePieChart called with data:", data.length);
  
  // Filter out invalid data points and count types
  const typeCounts = {};
  const validData = data.filter(d => d.magnitude_category != null && d.magnitude_category !== '' && d.magnitude_category !== 'Unknown'); // Also exclude 'Unknown'
  console.log("typePieChart - valid data points:", validData.length);

   const chartDiv = document.getElementById('chart-type-pie');

  if (!validData || validData.length === 0) {
      console.warn("No valid data points for magnitude category distribution pie chart");
      if(chartDiv) Plotly.purge(chartDiv);
      if(chartDiv) chartDiv.innerHTML = '<div class="no-data-message">No data available for Magnitude Category Distribution</div>';
      return;
  }

  validData.forEach(d => {
    // Ensure category is a string before using as a key
    const category = String(d.magnitude_category);
    typeCounts[category] = (typeCounts[category] || 0) + 1;
  });

  console.log("Type counts:", typeCounts);

  // Sort types by count in descending order
  const sortedTypes = Object.entries(typeCounts)
     .map(([label, value]) => [label, typeof value === 'number' ? value : parseFloat(value)]) // Ensure values are numbers
     .filter(([label, value]) => Number.isFinite(value) && label !== null && label !== '') // Filter out non-finite values and invalid labels
     .sort(([, a], [, b]) => b - a);

  const labels = sortedTypes.map(([label]) => label);
  const values = sortedTypes.map(([, value]) => value);

  // Using colors that roughly correspond to magnitude danger levels or a diverse palette
  const colors = labels.map(label => {
      // Assign colors based on the magnitude categories generated in the backend
      if (label === 'Mega') return '#d62728'; // Red (for highest magnitude)
      if (label === 'Catastrophic') return '#FF5733'; // A shade of red/orange
      if (label === 'Great') return '#ff7f0e'; // Orange
      if (label === 'Severe') return '#FFC300'; // Gold/Yellow-Orange
      if (label === 'Major') return '#2ca02c'; // Green
      if (label === 'Medium') return '#1f77b4'; // Blue
      if (label === 'Low') return '#9467bd'; // Purple
      return '#7f7f7f'; // Grey for any truly unexpected categories (should be rare now)
  });
  console.log("Using colors:", colors);

  const trace = {
    type: 'pie',
    labels: labels,
    values: values,
    textinfo: 'percent+label',
    hoverinfo: 'label+value+percent',
    hole: 0.4,
    insidetextorientation: 'radial',
    marker: { colors: colors }
  };

  const layout = {
    title: 'Magnitude Category Distribution',
    height: 360,
    margin: { t: 40, r: 20, b: 20, l: 20 },
    showlegend: true,
    legend: { orientation: 'h', y: -0.2 }
  };

   if (!trace.labels || trace.labels.length === 0 || !trace.values || trace.values.length === 0 || trace.values.every(v => v === 0)) {
      console.warn("Magnitude Category pie trace has no data or all values are zero after mapping.");
      if(chartDiv) Plotly.purge(chartDiv);
      if(chartDiv) chartDiv.innerHTML = '<div class="no-data-message">No data available for Magnitude Category Distribution</div>';
      return;
  }

  console.log("Plotting Magnitude Category Pie Chart with data:", trace.labels.length);
  if(chartDiv) Plotly.newPlot(chartDiv, [trace], layout, { responsive: true });
}

// Bar chart: Top Affected Regions (Countries)
function regionsBarChart(data) {
  console.log("regionsBarChart called with data:", data.length);
  const regionCounts = {};
   const validData = data.filter(d => d.country != null && d.country !== '' && d.country !== 'Unknown'); // Exclude Unknown
   console.log("regionsBarChart - valid data points:", validData.length);

    const chartDiv = document.getElementById('chart-regions-bar');

    if (!validData || validData.length === 0) {
      console.warn("No valid data points for regions bar chart");
      if(chartDiv) Plotly.purge(chartDiv);
      if(chartDiv) chartDiv.innerHTML = '<div class="no-data-message">No data available for Top Affected Regions</div>';
      return;
  }

  validData.forEach(d => {
    // Ensure country is a string before using as a key
    const country = String(d.country);
    regionCounts[country] = (regionCounts[country] || 0) + 1;
  });

  console.log("Region counts:", regionCounts);

  const sortedRegions = Object.entries(regionCounts).sort(([, a], [, b]) => b - a);
  const topN = 10; // Display top 10 regions
  const topRegions = sortedRegions.slice(0, topN);

  console.log("Top regions:", topRegions);

  if (!topRegions || topRegions.length === 0) {
      console.warn("No top regions found after counting");
      if(chartDiv) Plotly.purge(chartDiv);
      if(chartDiv) chartDiv.innerHTML = '<div class="no-data-message">No data available for Top Affected Regions</div>';
      return;
  }

  const x = topRegions.map(([country, count]) => country);
  const y = topRegions.map(([country, count]) => count);

  const trace = {
    x: x,
    y: y,
    type: 'bar',
    // Use a color palette - example using a few colors, you can expand this
    // Using CSS variables might not work directly in Plotly trace colors, use hex or rgba
    marker: { color: topRegions.map((_, i) => `hsl(145, 50%, ${70 - i * 3}%)`) } // Simple HSL gradient example based on rank
  };

  const layout = {
    title: 'Top Affected Regions (Countries)',
    xaxis: { title: 'Country', tickangle: -45, automargin: true },
    yaxis: { title: 'Number of Earthquakes' },
    height: 360,
    margin: { t: 40, r: 20, b: 100, l: 60 },
  };

  if (!trace.x || trace.x.length === 0 || !trace.y || trace.y.length === 0) {
      console.warn("Regions bar trace has no data after mapping.");
      if(chartDiv) Plotly.purge(chartDiv);
      if(chartDiv) chartDiv.innerHTML = '<div class="no-data-message">No data available for Top Affected Regions</div>';
      return;
  }

  console.log("Plotting Regions Bar Chart with data:", trace.x.length);
  if(chartDiv) Plotly.newPlot(chartDiv, [trace], layout, { responsive: true });
}

let map;
function initMap(data) {
  console.log("initMap called with data:", data.length);

  const mapDiv = document.getElementById('map');
  if (!mapDiv) {
      console.warn("Map div not found.");
      return;
  }

  if (map) {
    map.remove();
    map = null;
  }

  map = L.map('map', { fullscreenControl: true }).setView([20, 0], 2); // Add fullscreen control

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Filter out records with missing or invalid lat/lon
  const validData = data.filter(d => d.latitude != null && d.longitude != null && !isNaN(d.latitude) && !isNaN(d.longitude));
  console.log("Map data after filtering invalid lat/lon:", validData.length);
  
  if (!validData || validData.length === 0) {
      console.warn("No valid data points for map");
      // Map already initialized, no need to purge Plotly, just no markers added.
      // Optionally add a text overlay on the map div, but complex with Leaflet.
      // For now, just return.
      return;
  }

  // Create and add Heatmap layer
  const heatData = validData.map(d => [d.latitude, d.longitude, d.magnitude / 5]); // Use magnitude as intensity, scaled down
  const heat = L.heatLayer(heatData, {
    radius: 15,
    blur: 10,
    maxZoom: 15,
    // gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'} // Example gradient
  }).addTo(map);

  // Remove existing markers before adding new ones
  if (map) {
      map.eachLayer(layer => {
          if (layer instanceof L.CircleMarker) {
              map.removeLayer(layer);
          }
      });
  }

  validData.forEach(d => {
    const color = magnitudeColor(d.magnitude);
    const radius = Math.max(3, (d.magnitude || 0) * 1.5); // Adjust radius and handle potential NaN magnitude

    L.circleMarker([d.latitude, d.longitude], {
      color: color,
      fillColor: color,
      fillOpacity: 0.7,
      radius: radius,
      weight: 1.5
    })
    .addTo(map)
    .bindPopup(
      `<b>Magnitude: ${typeof d.magnitude === 'number' ? d.magnitude.toFixed(2) : 'N/A'}</b><br>Depth: ${typeof d.depth === 'number' ? d.depth.toFixed(2) : 'N/A'} km<br>Location: ${d.location || 'N/A'}<br>Time: ${d.date_time instanceof Date && !isNaN(d.date_time) ? d.date_time.toLocaleString() : 'N/A'}<br>Tsunami: ${d.tsunami === 1 ? 'Yes' : (d.tsunami === 0 ? 'No' : 'N/A')}`
    );
  });
   console.log("Map markers added:", validData.length);
}

// Enhanced Heatmap functionality
let heatmapMap;
let heatmapLayer;
let markerLayer;
let currentHeatmapData = [];

function initHeatmap(data) {
  console.log("initHeatmap called with data:", data.length);

  const heatmapDiv = document.getElementById('heatmap');
  if (!heatmapDiv) {
      console.warn("Heatmap div not found.");
      return;
  }

  if (heatmapMap) {
    heatmapMap.remove();
    heatmapMap = null;
  }

  heatmapMap = L.map('heatmap', { fullscreenControl: true }).setView([20, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(heatmapMap);

  // Filter out records with missing or invalid lat/lon
  const validData = data.filter(d => d.latitude != null && d.longitude != null && !isNaN(d.latitude) && !isNaN(d.longitude));
  console.log("Heatmap data after filtering invalid lat/lon:", validData.length);
  
  if (!validData || validData.length === 0) {
      console.warn("No valid data points for heatmap");
      return;
  }

  currentHeatmapData = validData;
  
  // Initialize layers
  heatmapLayer = L.heatLayer([], { radius: 15, blur: 10, maxZoom: 15 });
  markerLayer = L.layerGroup();
  
  // Add layers to map
  heatmapLayer.addTo(heatmapMap);
  markerLayer.addTo(heatmapMap);
  
  // Update heatmap with default settings
  updateHeatmap();
  
  // Add event listeners for controls
  addHeatmapEventListeners();
}

function updateHeatmap() {
  if (!currentHeatmapData || currentHeatmapData.length === 0) return;

  const metric = document.getElementById('heatmapMetric').value;
  const radius = parseInt(document.getElementById('heatmapRadius').value);
  const blur = parseInt(document.getElementById('heatmapBlur').value);
  const maxZoom = parseInt(document.getElementById('heatmapMaxZoom').value);
  const showHeatmap = document.getElementById('showHeatmap').checked;
  const showMarkers = document.getElementById('showMarkers').checked;

  // Clear existing layers
  if (heatmapLayer) {
    heatmapMap.removeLayer(heatmapLayer);
  }
  if (markerLayer) {
    heatmapMap.removeLayer(markerLayer);
  }

  // Create new layers
  heatmapLayer = L.heatLayer([], { 
    radius: radius, 
    blur: blur, 
    maxZoom: maxZoom,
    gradient: {
      0.2: '#0000ff',   // Blue for low intensity
      0.4: '#00ffff',   // Cyan
      0.6: '#00ff00',   // Green
      0.8: '#ffff00',   // Yellow
      1.0: '#ff0000'    // Red for high intensity
    }
  });

  markerLayer = L.layerGroup();

  // Prepare heatmap data based on selected metric
  let heatmapData = [];
  let maxValue = 0;

  if (metric === 'count') {
    // Count earthquakes in each location (group by lat/lon)
    const locationCounts = {};
    currentHeatmapData.forEach(d => {
      const key = `${d.latitude.toFixed(3)},${d.longitude.toFixed(3)}`;
      locationCounts[key] = (locationCounts[key] || 0) + 1;
    });
    
    Object.entries(locationCounts).forEach(([key, count]) => {
      const [lat, lon] = key.split(',').map(Number);
      heatmapData.push([lat, lon, count]);
      maxValue = Math.max(maxValue, count);
    });
  } else {
    // Use the selected metric value
    currentHeatmapData.forEach(d => {
      let value = 0;
      switch (metric) {
        case 'magnitude':
          value = d.magnitude || 0;
          break;
        case 'depth':
          value = d.depth || 0;
          break;
        case 'significance':
          value = d.significance || 0;
          break;
      }
      heatmapData.push([d.latitude, d.longitude, value]);
      maxValue = Math.max(maxValue, value);
    });
  }

  // Normalize values to 0-1 range for better visualization
  if (maxValue > 0) {
    heatmapData = heatmapData.map(([lat, lon, value]) => [lat, lon, value / maxValue]);
  }

  // Add heatmap layer if enabled
  if (showHeatmap) {
    heatmapLayer.setLatLngs(heatmapData);
    heatmapLayer.addTo(heatmapMap);
  }

  // Add individual markers if enabled
  if (showMarkers) {
    currentHeatmapData.forEach(d => {
      const color = magnitudeColor(d.magnitude);
      const radius = Math.max(3, (d.magnitude || 0) * 1.5);

      const marker = L.circleMarker([d.latitude, d.longitude], {
        color: color,
        fillColor: color,
        fillOpacity: 0.7,
        radius: radius,
        weight: 1.5
      })
      .bindPopup(
        `<b>Magnitude: ${typeof d.magnitude === 'number' ? d.magnitude.toFixed(2) : 'N/A'}</b><br>
         Depth: ${typeof d.depth === 'number' ? d.depth.toFixed(2) : 'N/A'} km<br>
         Significance: ${typeof d.significance === 'number' ? d.significance.toFixed(2) : 'N/A'}<br>
         Location: ${d.location || 'N/A'}<br>
         Time: ${d.date_time instanceof Date && !isNaN(d.date_time) ? d.date_time.toLocaleString() : 'N/A'}<br>
         Tsunami: ${d.tsunami === 1 ? 'Yes' : (d.tsunami === 0 ? 'No' : 'N/A')}`
      );
      
      markerLayer.addLayer(marker);
    });
    markerLayer.addTo(heatmapMap);
  }

  // Update legend based on metric
  updateHeatmapLegend(metric, maxValue);
}

function updateHeatmapLegend(metric, maxValue) {
  const legendText = document.querySelector('.legend-text');
  if (legendText) {
    let metricName = '';
    let unit = '';
    
    switch (metric) {
      case 'magnitude':
        metricName = 'Magnitude';
        unit = '';
        break;
      case 'depth':
        metricName = 'Depth';
        unit = ' km';
        break;
      case 'significance':
        metricName = 'Significance';
        unit = '';
        break;
      case 'count':
        metricName = 'Event Count';
        unit = ' events';
        break;
    }
    
    legendText.textContent = `${metricName}: 0${unit} → ${maxValue.toFixed(2)}${unit}`;
  }
}

function addHeatmapEventListeners() {
  // Metric selector
  document.getElementById('heatmapMetric').addEventListener('change', updateHeatmap);
  
  // Range sliders
  document.getElementById('heatmapRadius').addEventListener('input', function() {
    document.getElementById('radiusValue').textContent = this.value;
    updateHeatmap();
  });
  
  document.getElementById('heatmapBlur').addEventListener('input', function() {
    document.getElementById('blurValue').textContent = this.value;
    updateHeatmap();
  });
  
  document.getElementById('heatmapMaxZoom').addEventListener('input', function() {
    document.getElementById('maxZoomValue').textContent = this.value;
    updateHeatmap();
  });
  
  // Checkboxes
  document.getElementById('showHeatmap').addEventListener('change', updateHeatmap);
  document.getElementById('showMarkers').addEventListener('change', updateHeatmap);
}

function updateHeatmapData(data) {
  console.log("updateHeatmapData called with data:", data.length);
  
  // Filter out records with missing or invalid lat/lon
  const validData = data.filter(d => d.latitude != null && d.longitude != null && !isNaN(d.latitude) && !isNaN(d.longitude));
  console.log("updateHeatmapData - valid data points:", validData.length);
  
  if (!validData || validData.length === 0) {
    console.warn("No valid data points for heatmap update");
    return;
  }

  currentHeatmapData = validData;
  updateHeatmap();
}

// Correlation Heatmap functionality
function correlationHeatmap(data) {
  console.log("correlationHeatmap called with data:", data.length);
  
  const chartDiv = document.getElementById('correlation-heatmap');
  if (!chartDiv) {
    console.warn("Correlation heatmap div not found.");
    return;
  }

  // Filter out invalid data points
  const validData = data.filter(d => 
    d.magnitude != null && !isNaN(d.magnitude) &&
    d.depth != null && !isNaN(d.depth) &&
    d.significance != null && !isNaN(d.significance) &&
    d.latitude != null && !isNaN(d.latitude) &&
    d.longitude != null && !isNaN(d.longitude)
  );
  
  console.log("correlationHeatmap - valid data points:", validData.length);
  
  if (validData.length === 0) {
    console.warn("No valid data points for correlation heatmap");
    if(chartDiv) Plotly.purge(chartDiv);
    if(chartDiv) chartDiv.innerHTML = '<div class="no-data-message">No data available for Correlation Matrix</div>';
    return;
  }

  // Prepare data for correlation analysis
  const correlationData = {
    magnitude: validData.map(d => d.magnitude),
    depth: validData.map(d => d.depth),
    significance: validData.map(d => d.significance),
    latitude: validData.map(d => Math.abs(d.latitude)), // Use absolute latitude
    longitude: validData.map(d => Math.abs(d.longitude)) // Use absolute longitude
  };

  const parameters = ['magnitude', 'depth', 'significance', 'latitude', 'longitude'];
  const parameterLabels = ['Magnitude', 'Depth', 'Significance', 'Latitude', 'Longitude'];
  
  // Calculate correlation matrix
  const correlationMatrix = [];
  const method = document.getElementById('correlationMethod').value;
  const showValues = document.getElementById('showCorrelationValues').checked;

  for (let i = 0; i < parameters.length; i++) {
    correlationMatrix[i] = [];
    for (let j = 0; j < parameters.length; j++) {
      if (i === j) {
        correlationMatrix[i][j] = 1.0; // Perfect correlation with itself
      } else {
        correlationMatrix[i][j] = calculateCorrelation(
          correlationData[parameters[i]], 
          correlationData[parameters[j]], 
          method
        );
      }
    }
  }

  // Create heatmap trace
  const trace = {
    z: correlationMatrix,
    x: parameterLabels,
    y: parameterLabels,
    type: 'heatmap',
    colorscale: [
      [0, '#0000ff'],    // Blue for negative correlations
      [0.5, '#ffffff'],  // White for zero correlation
      [1, '#ff0000']     // Red for positive correlations
    ],
    zmid: 0, // Center the colorscale at 0
    showscale: true,
    colorbar: {
      title: 'Correlation Coefficient',
      titleside: 'right',
      thickness: 15,
      len: 0.5
    }
  };

  // Add text annotations if enabled
  if (showValues) {
    trace.text = correlationMatrix.map(row => 
      row.map(val => val.toFixed(3))
    );
    trace.texttemplate = '%{text}';
    trace.textfont = {
      size: 12,
      color: 'black'
    };
  }

  const layout = {
    height: 450,
    margin: { t: 20, r: 20, b: 100, l: 100 },
    xaxis: {
      tickangle: -45,
      automargin: true
    },
    yaxis: {
      automargin: true
    }
  };

  console.log("Plotting Correlation Heatmap with data:", correlationMatrix.length, "parameters");
  if(chartDiv) Plotly.newPlot(chartDiv, [trace], layout, { responsive: true });
}

function calculateCorrelation(x, y, method) {
  const n = x.length;
  if (n !== y.length || n === 0) return 0;

  if (method === 'pearson') {
    // Calculate Pearson correlation coefficient
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  } else if (method === 'spearman') {
    // Calculate Spearman rank correlation coefficient
    const rankX = getRanks(x);
    const rankY = getRanks(y);
    
    const sumD2 = rankX.reduce((sum, rx, i) => sum + Math.pow(rx - rankY[i], 2), 0);
    const rs = 1 - (6 * sumD2) / (n * (n * n - 1));
    
    return rs;
  }
  
  return 0;
}

function getRanks(arr) {
  // Create array of indices sorted by values
  const indices = arr.map((val, index) => ({ val, index }))
    .sort((a, b) => a.val - b.val)
    .map((item, rank) => ({ ...item, rank: rank + 1 }));
  
  // Handle ties by averaging ranks
  const ranks = new Array(arr.length);
  for (let i = 0; i < indices.length; i++) {
    const current = indices[i];
    let sumRank = current.rank;
    let count = 1;
    
    // Check for ties
    for (let j = i + 1; j < indices.length && indices[j].val === current.val; j++) {
      sumRank += indices[j].rank;
      count++;
    }
    
    const avgRank = sumRank / count;
    for (let j = 0; j < count; j++) {
      ranks[indices[i + j].index] = avgRank;
    }
    i += count - 1;
  }
  
  return ranks;
}

async function initDashboard() {
  console.log("Initializing dashboard..."); // Log start of init
  await fetchData();
  console.log("fetchData completed in initDashboard."); // Log after fetch
  // Remove populateSourceFilter as it's for plastic waste
  // Remove updateRecyclingRateLabel and updateTotalWasteLabel

  // Initial render of charts with all data
  applyFilters(); // This will call all plotting functions
  console.log("applyFilters called in initDashboard for initial render."); // Log after initial applyFilters

  addChartTransitions();

  // Add event listeners for earthquake filters
  document.getElementById('minMagnitude').addEventListener('input', applyFilters);
  document.getElementById('maxMagnitude').addEventListener('input', applyFilters);
  document.getElementById('minDepth').addEventListener('input', applyFilters);
  document.getElementById('maxDepth').addEventListener('input', applyFilters);
  document.getElementById('startDate').addEventListener('change', applyFilters);
  document.getElementById('endDate').addEventListener('change', applyFilters);
  document.getElementById('typeFilter').addEventListener('change', applyFilters);

  // Add event listeners for time series period buttons
  document.querySelectorAll('.time-series-btn').forEach(button => {
    console.log("Adding event listener to time series button:", button.dataset.period);
    button.addEventListener('click', function() {
      console.log("Time series button clicked:", this.dataset.period);
      document.querySelectorAll('.time-series-btn').forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      const selectedPeriod = this.dataset.period; // Correctly get the period
      console.log("Calling timeSeriesPlot with period:", selectedPeriod);
      timeSeriesPlot(filteredData, selectedPeriod); // Pass filteredData and the period
    });
  });

  // Clear Filters button functionality
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    console.log("Clear Filters button clicked.");
    // Reset filter inputs
    document.getElementById('minMagnitude').value = '';
    document.getElementById('maxMagnitude').value = '';
    document.getElementById('minDepth').value = '';
    document.getElementById('maxDepth').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('typeFilter').value = 'All';

    // Apply filters to update visualizations (resets to all data)
    applyFilters();
  });

  // Anomaly detection event listeners
  document.getElementById('anomalyMetric').addEventListener('change', applyFilters);

  document.getElementById('anomalyThreshold').addEventListener('input', (e) => {
    document.getElementById('thresholdValue').textContent = e.target.value;
    applyFilters(); // Re-apply filters to update anomaly chart
  });

  // Add event listeners for heatmap controls
  addHeatmapEventListeners();
  addCorrelationHeatmapEventListeners();
  console.log("Dashboard initialization complete. Event listeners added."); // Log end of init
}

// Anomaly Detection Functions
function calculateMean(arr) {
  console.log("calculateMean called");
   if (!arr || arr.length === 0) return 0; // Handle empty array
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calculateStdDev(arr, mean) {
  console.log("calculateStdDev called");
  if (!arr || arr.length === 0) return 0; // Handle empty array
  const squareDiffs = arr.map(value => {
    const diff = value - mean;
    return diff * diff;
  });
  return Math.sqrt(calculateMean(squareDiffs));
}

function detectAnomalies(data, metric, threshold) {
  console.log("detectAnomalies called with data:", data.length, "metric:", metric, "threshold:", threshold);
  // Ensure the metric exists in the data and filter out non-numeric values
  const values = data.map(d => d[metric]).filter(v => typeof v === 'number' && !isNaN(v));
  console.log(`Anomaly detection for ${metric}: found ${values.length} valid numeric values.`);

  const anomalyChartDiv = document.getElementById('chart-anomaly');
  const anomalyListDiv = document.getElementById('anomalyItems');

  if (!values || values.length === 0) {
    console.warn("No valid numeric values for anomaly detection.");
     if(anomalyChartDiv) Plotly.purge(anomalyChartDiv);
     if(anomalyChartDiv) anomalyChartDiv.innerHTML = '<div class="no-data-message">No data available for Anomaly Detection</div>';
     if(anomalyListDiv) anomalyListDiv.innerHTML = '<div class="list-group-item">No data available for anomaly detection</div>';
    return data.map(d => ({ ...d, isAnomaly: false, zScore: 0, deviation: 0 }));
  }

  const mean = calculateMean(values);
  const stdDev = calculateStdDev(values, mean);
  console.log(`${metric} - Mean: ${mean}, StdDev: ${stdDev}`);

  // Handle cases where stdDev is zero to avoid division by zero
  if (stdDev === 0) {
    console.log("StdDev is zero, no anomalies detected by Z-score.");
     if(anomalyChartDiv) Plotly.purge(anomalyChartDiv);
     if(anomalyChartDiv) anomalyChartDiv.innerHTML = '<div class="no-data-message">No anomalies detected (Std Dev is Zero)</div>';
     if(anomalyListDiv) anomalyListDiv.innerHTML = '<div class="list-group-item">No anomalies detected</div>';
    return data.map(d => ({ ...d, isAnomaly: false, zScore: 0, deviation: (typeof d[metric] === 'number' && !isNaN(d[metric]) ? d[metric] - mean : 0) }));
  }

  return data.map((d) => {
    const value = d[metric];
    let zScore = 0;
    let deviation = 0;
    if (typeof value === 'number' && !isNaN(value)) {
        deviation = value - mean;
        zScore = Math.abs(deviation / stdDev);
    }

    return {
      ...d,
      isAnomaly: zScore > threshold,
      zScore: zScore,
      deviation: deviation
    };
  });
}

function updateAnomalyChart(data, metric, threshold) {
  console.log("updateAnomalyChart called with data:", data.length, "metric:", metric, "threshold:", threshold);
  const anomaliesData = detectAnomalies(data, metric, threshold);
   // Ensure anomaliesData is valid before filtering values
  const values = anomaliesData.map(d => d[metric]).filter(v => typeof v === 'number' && !isNaN(v)); // Use anomaliesData here

  const anomalyChartDiv = document.getElementById('chart-anomaly');
  const anomalyListDiv = document.getElementById('anomalyItems');

   if (!anomaliesData || anomaliesData.length === 0 || !values || values.length === 0) {
       console.log("updateAnomalyChart: No valid data or anomaliesData is empty.");
       if(anomalyChartDiv) Plotly.purge(anomalyChartDiv);
       if(anomalyChartDiv) anomalyChartDiv.innerHTML = '<div class="no-data-message">No data available for Anomaly Detection</div>';
       if(anomalyListDiv) anomalyListDiv.innerHTML = '<div class="list-group-item">No anomalies detected</div>';
       return;
    }

  const mean = calculateMean(values);
  const stdDev = calculateStdDev(values, mean);

  const upperBound = mean + (threshold * stdDev);
  const lowerBound = mean - (threshold * stdDev);

  console.log(`Anomaly Chart Bounds for ${metric}: Upper=${upperBound}, Lower=${lowerBound}, Mean=${mean}`);

  const trace = {
    x: anomaliesData.map(d => d.location || d.country || (d.date_time instanceof Date && !isNaN(d.date_time) ? d.date_time.toLocaleString() : 'N/A')), // Use location or country or time as x-axis
    y: anomaliesData.map(d => d[metric]),
    type: 'scatter',
    mode: 'markers',
    name: 'Values',
    marker: {
      size: 8,
      opacity: 0.7,
      color: anomaliesData.map(a => a.isAnomaly ? '#d62728' : '#2196F3'), // Red for anomaly, Blue for non-anomaly
      line: {
        width: 1,
        color: 'var(--surface)'
      }
    },
    text: anomaliesData.map(a => `Location: ${a.location || a.country || (a.date_time instanceof Date && !isNaN(a.date_time) ? a.date_time.toLocaleString() : 'N/A')}<br>${metric.replace(/_/g, ' ')}: ${typeof a[metric] === 'number' ? a[metric].toFixed(2) : 'N/A'}<br>Anomaly: ${a.isAnomaly ? 'Yes (' + a.zScore.toFixed(2) + 'σ)' : 'No'}`), // Use 'a' here as it's the anomaly object
    hoverinfo: 'text'
  };

  const upperBoundTrace = {
    x: anomaliesData.map(d => d.location || d.country || (d.date_time instanceof Date && !isNaN(d.date_time) ? d.date_time.toLocaleString() : 'N/A')),
    y: Array(anomaliesData.length).fill(upperBound),
    type: 'scatter',
    mode: 'lines',
    name: `Upper Bound (${threshold}σ)`,
    line: {
      color: '#FF9800', // Orange for warning/bounds
      dash: 'dash',
      width: 1
    }
  };

  const lowerBoundTrace = {
    x: anomaliesData.map(d => d.location || d.country || (d.date_time instanceof Date && !isNaN(d.date_time) ? d.date_time.toLocaleString() : 'N/A')),
    y: Array(anomaliesData.length).fill(lowerBound),
    type: 'scatter',
    mode: 'lines',
    name: `Lower Bound (${threshold}σ)`,
    line: {
      color: '#FF9800', // Orange for warning/bounds
      dash: 'dash',
      width: 1
    }
  };
  
  const meanTrace = {
    x: anomaliesData.map(d => d.location || d.country || (d.date_time instanceof Date && !isNaN(d.date_time) ? d.date_time.toLocaleString() : 'N/A')),
    y: Array(anomaliesData.length).fill(mean),
    type: 'scatter',
    mode: 'lines',
    name: 'Mean',
    line: {
        color: '#757575', // Medium grey for text-secondary
        dash: 'dot',
        width: 1
    }
  };

  const layout = {
    title: `${metric.replace(/_/g, ' ')} Anomaly Detection`,
    xaxis: {
      title: 'Location / Time',
      tickangle: -45,
      automargin: true
    },
    yaxis: {
      title: metric.replace(/_/g, ' '),
      automargin: true
    },
    margin: { t: 50, r: 30, b: 200, l: 70 },
    height: 550,
    showlegend: true,
    legend: {
      x: 0,
      y: 1.1,
      orientation: 'h'
    },
    shapes: [
        { // Shading for the normal range
            type: 'rect',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: lowerBound,
            x1: 1,
            y1: upperBound,
            fillcolor: 'rgba(255, 255, 0, 0.1)', // Light yellow shading
            line: { width: 0 },
            layer: 'below'
        }
    ]
  };

   // Check if main trace has data before plotting
   if (!trace.x || trace.x.length === 0 || !trace.y || trace.y.length === 0) {
       console.warn("Anomaly chart trace has no data.");
        if(anomalyChartDiv) Plotly.purge(anomalyChartDiv);
        if(anomalyChartDiv) anomalyChartDiv.innerHTML = '<div class="no-data-message">No data available for Anomaly Detection</div>';
   } else {
      console.log("Plotting Anomaly Chart with data:", trace.x.length);
      if(anomalyChartDiv) Plotly.newPlot(anomalyChartDiv, [trace, upperBoundTrace, lowerBoundTrace, meanTrace], layout, { responsive: true });
   }

  updateAnomalyList(anomaliesData.filter(a => a.isAnomaly), metric); // Pass only anomalies to the list
}

function updateAnomalyList(anomalies, metric) {
  console.log("updateAnomalyList called with anomalies:", anomalies.length);
  const anomalyItems = document.getElementById('anomalyItems');
  
  if (!anomalyItems) return; // Check if the element exists

  if (!anomalies || anomalies.length === 0) {
    anomalyItems.innerHTML = '<div class="list-group-item">No anomalies detected</div>';
    console.log("No anomalies to list.");
    return;
  }
  
  console.log("Rendering anomaly list for", anomalies.length, "anomalies.");

  anomalyItems.innerHTML = anomalies
    .sort((a, b) => b.zScore - a.zScore) // Sort by z-score descending
    .map(a => {
        const locationText = a.location || a.country || (a.date_time instanceof Date && !isNaN(a.date_time) ? a.date_time.toLocaleString() : 'N/A');
        const valueText = typeof a[metric] === 'number' ? a[metric].toFixed(2) : 'N/A';
        const deviationText = typeof a.deviation === 'number' ? `${a.deviation > 0 ? '+' : ''}${a.deviation.toFixed(2)} from mean` : '';
        const zScoreText = typeof a.zScore === 'number' ? `${a.zScore.toFixed(2)}σ` : '';

        return `
          <div class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <strong>${locationText}</strong>
              <br>
              <small class="text-muted">
                ${metric.replace(/_/g, ' ')}: ${valueText}
                ${deviationText ? ' (' + deviationText + ')' : ''}
              </small>
            </div>
            ${zScoreText ? '<span class="badge bg-danger rounded-pill">' + zScoreText + '</span>' : ''}
          </div>
        `;
    }).join('');
    console.log("Anomaly list rendered.");
}


// Update applyFilters function to include anomaly detection and pass current period
function applyFilters() {
  console.log("Applying filters and updating visualizations..."); // Log filter application
  filterData();
  updateSummaryCards(filteredData);
  // Call all chart plotting functions with filtered data
  magDepthScatterPlot(filteredData);
  violinPlot(filteredData);

  const selectedPeriodButton = document.querySelector('.time-series-btn.active');
  // Ensure a default period if no button is active (shouldn't happen with initial 'day' active)
  const period = selectedPeriodButton ? selectedPeriodButton.dataset.period : 'day';
  console.log("applyFilters: Selected time series period:", period);
  timeSeriesPlot(filteredData, period);

  typePieChart(filteredData); // Magnitude Category Distribution
  regionsBarChart(filteredData);
  updateHeatmapData(filteredData); // Update heatmap with filtered data
  correlationHeatmap(filteredData); // Update correlation heatmap with filtered data

  // Distribution and Categorical charts
  depthDistributionPlots(filteredData);
  sigDistributionPlots(filteredData);
  magTypeDistributionPlots(filteredData);
  tsunamiDistributionPlots(filteredData);

  // Relationship plots
  magSigScatterPlot(filteredData);

  // Detailed Country Analysis
  detailedCountryAnalysis(filteredData);

  // Anomaly detection
  const metric = document.getElementById('anomalyMetric').value;
  const threshold = parseFloat(document.getElementById('anomalyThreshold').value);
  console.log("applyFilters: Anomaly detection metric:", metric, "threshold:", threshold);
  updateAnomalyChart(filteredData, metric, threshold);
}

// Prediction page logic with loading spinner & colored badges
function initPrediction() {
  console.log("Initializing prediction form...");
  const form = document.getElementById('predict-form');
  const resultDiv = document.getElementById('result');
  const clearBtn = document.getElementById('clearBtn');
  const predictBtn = document.getElementById('predictBtn');
  
  // Check if prediction elements exist before adding listeners
  if (!form || !resultDiv || !clearBtn || !predictBtn) {
      console.log("Prediction form elements not found, skipping prediction initialization.");
      return; 
  }

  const spinner = predictBtn.querySelector('.spinner-border');
  const btnText = predictBtn.querySelector('.btn-text');
  
  form.addEventListener('submit', async e => {
    console.log("Prediction form submitted.");
    e.preventDefault();

    if (!form.checkValidity()) {
        console.log("Form validation failed.");
        e.stopPropagation();
        form.classList.add('was-validated');
        return;
    }
    form.classList.remove('was-validated');

    predictBtn.disabled = true;
    spinner.classList.remove('d-none');
    btnText.textContent = 'Predicting...';
    resultDiv.classList.remove('visible');
    resultDiv.innerHTML = '';
    console.log("Prediction button disabled, spinner shown.");

    // Ensure these IDs match the input fields in index.html for earthquake prediction
    const inputData = {
      magnitude: parseFloat(document.getElementById('magnitude').value),
      depth: parseFloat(document.getElementById('depth').value),
      latitude: parseFloat(document.getElementById('latitude').value),
      longitude: parseFloat(document.getElementById('longitude').value),
      sig: parseFloat(document.getElementById('sig').value),
      magType: document.getElementById('magType').value
    };
    
    console.log("Sending prediction data:", inputData);

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
      });
      
      console.log("Prediction API response status:", response.status);

      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const result = await response.json();
      console.log("Prediction API response received:", result);

      if (result.success) {
        let riskClass = '';
        let cardBg = '';
        let borderColor = '';
        let iconColor = '';
        let iconHtml = '';
        let riskMsg = '';

        if (result.prediction === 'High Risk') {
          riskClass = 'result-high-risk';
          cardBg = 'linear-gradient(135deg, #fff0f1 0%, #ffe1e3 100%)';
          borderColor = 'rgba(220, 53, 69, 0.3)';
          iconColor = '#dc3545';
          iconHtml = '<i class="bi bi-exclamation-triangle-fill"></i>';
          riskMsg = 'Warning: This event has a high risk of causing a tsunami! Take precautions.';
        } else if (result.prediction === 'Medium Risk') {
          riskClass = 'result-medium-risk';
          cardBg = 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)';
          borderColor = 'rgba(255, 193, 7, 0.4)';
          iconColor = '#ffc107';
          iconHtml = '<i class="bi bi-exclamation-circle-fill"></i>';
          riskMsg = 'There is a moderate risk. Stay alert and monitor updates.';
        } else { // Low Risk
          riskClass = 'result-low-risk';
          cardBg = 'linear-gradient(135deg, #e8f5e9 0%, #dcf0e1 100%)';
          borderColor = 'rgba(40, 167, 69, 0.3)';
          iconColor = '#28a745';
          iconHtml = '<i class="bi bi-shield-check"></i>';
          riskMsg = 'This event is unlikely to cause a tsunami.';
        }

        resultDiv.innerHTML = `
          <div class="prediction-result-card ${riskClass}" style="background:${cardBg}; border-color:${borderColor};">
            <div class="result-icon" style="color:${iconColor};">${iconHtml}</div>
            <div class="result-title">${result.prediction}</div>
            <div class="result-message">${riskMsg}</div>
          </div>
        `;
        resultDiv.style.display = 'block';
      } else {
        throw new Error(result.error || 'Prediction failed');
      }
    } catch (error) {
      console.error('Prediction error:', error);
      resultDiv.innerHTML = `
        <div class="alert alert-danger mt-3">
          <h4 class="alert-heading">Error</h4>
          <p>${error.message || 'An unknown error occurred during prediction.'}</p>
        </div>
      `;
      resultDiv.style.display = 'block';
    } finally {
      predictBtn.disabled = false;
      spinner.classList.add('d-none');
      btnText.textContent = 'Predict Impact';
      resultDiv.classList.add('visible');
    }
  });

  clearBtn.addEventListener('click', () => {
    form.reset();
    resultDiv.innerHTML = '';
    resultDiv.classList.remove('visible');
    form.classList.remove('was-validated');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded.");
  initDashboard();
  initPrediction();

  // Initialize tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
  console.log("Tooltips initialized.");

});

// Add smooth transitions for all charts
function addChartTransitions() {
  console.log("Adding chart transitions.");
  const chartElements = document.querySelectorAll('[id^="chart-"]');
  chartElements.forEach(chart => {
    chart.style.transition = 'all 0.5s ease-in-out';
  });
}

// Initial calls should be inside DOMContentLoaded or initDashboard
// The event listeners will call applyFilters after that.

// Depth Distribution Plots
function depthDistributionPlots(data) {
  console.log("depthDistributionPlots called with data:", data.length);
  
  // Filter out invalid data points
  const validData = data.filter(d => d.depth != null && !isNaN(d.depth));
  console.log("depthDistributionPlots - valid data points:", validData.length);
  
  const histogramDiv = document.getElementById('chart-depth-histogram');
  const boxDiv = document.getElementById('chart-depth-box');

  if (validData.length === 0) {
    console.warn("No valid data points for depth distribution plots");
    // Clear existing plots if no data
    if(histogramDiv) Plotly.purge(histogramDiv);
    if(boxDiv) Plotly.purge(boxDiv);
    // Optionally display a message
    if (histogramDiv) histogramDiv.innerHTML = '<div class="no-data-message">No data available for Depth Histogram</div>';
    if (boxDiv) boxDiv.innerHTML = '<div class="no-data-message">No data available for Depth Box Plot</div>';
    return;
  }

  // Create histogram trace
  const histogramTrace = {
    x: validData.map(d => d.depth),
    type: 'histogram',
    name: 'Depth Distribution',
    marker: {
      color: '#00BCD4',
      line: {
        color: 'white',
        width: 1
      }
    },
    opacity: 0.7
  };

  // Create box plot trace
  const boxTrace = {
    y: validData.map(d => d.depth),
    type: 'box',
    name: 'Depth Box Plot',
    boxpoints: 'outliers',
    marker: {
      color: '#FFC107'
    },
    line: {
      color: '#FFC107'
    }
  };

  const histogramLayout = {
    title: 'Earthquake Depth: Histogram',
    xaxis: { title: 'Depth (km)' },
    yaxis: { title: 'Count' },
    height: 300,
    margin: { t: 40, r: 20, b: 60, l: 60 },
    showlegend: false
  };

   const boxLayout = {
    title: 'Earthquake Depth: Box & Whisker Plot',
    xaxis: { title: '' }, // No x-axis title for box plot
    yaxis: { title: 'Depth (km)' },
    height: 300,
    margin: { t: 40, r: 20, b: 60, l: 60 },
    showlegend: false
  };

  console.log("Plotting Depth Histogram with data:", histogramTrace.x.length);
  if(histogramDiv) Plotly.newPlot(histogramDiv, [histogramTrace], histogramLayout, { responsive: true });
  
  console.log("Plotting Depth Box Plot with data:", boxTrace.y.length);
  if(boxDiv) Plotly.newPlot(boxDiv, [boxTrace], boxLayout, { responsive: true });
}

// Significance Distribution Plots
function sigDistributionPlots(data) {
  console.log("sigDistributionPlots called with data:", data.length);
  
  // Filter out invalid data points
  const validData = data.filter(d => d.significance != null && !isNaN(d.significance));
  console.log("sigDistributionPlots - valid data points:", validData.length);
  
  const histogramDiv = document.getElementById('chart-sig-histogram');
  const boxDiv = document.getElementById('chart-sig-box');

  if (validData.length === 0) {
    console.warn("No valid data points for significance distribution plots");
    // Clear existing plots if no data
    if(histogramDiv) Plotly.purge(histogramDiv);
    if(boxDiv) Plotly.purge(boxDiv);
     // Optionally display a message
    if(histogramDiv) histogramDiv.innerHTML = '<div class="no-data-message">No data available for Significance Histogram</div>';
    if(boxDiv) boxDiv.innerHTML = '<div class="no-data-message">No data available for Significance Box Plot</div>';
    return;
  }

  // Create histogram trace
  const histogramTrace = {
    x: validData.map(d => d.significance),
    type: 'histogram',
    name: 'Significance Distribution',
    marker: {
      color: '#E91E63',
      line: {
        color: 'white',
        width: 1
      }
    },
    opacity: 0.7
  };

  // Create box plot trace
  const boxTrace = {
    y: validData.map(d => d.significance),
    type: 'box',
    name: 'Significance Box Plot',
    boxpoints: 'outliers',
    marker: {
      color: '#FFC107'
    },
    line: {
      color: '#FFC107'
    }
  };

   const histogramLayout = {
    title: 'Earthquake Significance: Histogram',
    xaxis: { title: 'Significance' },
    yaxis: { title: 'Count' },
    height: 300,
    margin: { t: 40, r: 20, b: 60, l: 60 },
    showlegend: false
  };

   const boxLayout = {
    title: 'Earthquake Significance: Box & Whisker Plot',
    xaxis: { title: '' }, // No x-axis title for box plot
    yaxis: { title: 'Significance' },
    height: 300,
    margin: { t: 40, r: 20, b: 60, l: 60 },
    showlegend: false
  };

  console.log("Plotting Significance Histogram with data:", histogramTrace.x.length);
  if(histogramDiv) Plotly.newPlot(histogramDiv, [histogramTrace], histogramLayout, { responsive: true });

  console.log("Plotting Significance Box Plot with data:", boxTrace.y.length);
  if(boxDiv) Plotly.newPlot(boxDiv, [boxTrace], boxLayout, { responsive: true });
}

// Relationship Plots (Magnitude vs Depth - updated, Magnitude vs Significance)
// Updating existing scatterPlot to include tsunami coloring
function magDepthScatterPlot(data) {
  console.log("magDepthScatterPlot (Mag vs Depth) called with data:", data.length);
  
  // Filter out invalid data points
  const validData = data.filter(d => 
    d.depth != null && !isNaN(d.depth) && 
    d.magnitude != null && !isNaN(d.magnitude)
  );
  
  console.log("magDepthScatterPlot - valid data points:", validData.length);
  
  const chartDiv = document.getElementById('chart-mag-depth');

  if (validData.length === 0) {
    console.warn("No valid data points for magnitude vs depth scatter plot");
     if(chartDiv) Plotly.purge(chartDiv);
     if(chartDiv) chartDiv.innerHTML = '<div class="no-data-message">No data available for Magnitude vs Depth</div>';
    return;
  }

  const trace = {
    x: validData.map(d => d.depth),
    y: validData.map(d => d.magnitude),
    mode: 'markers',
    type: 'scatter',
    marker: {
      size: 8,
      opacity: 0.7,
      color: validData.map(d => d.tsunami === 1 ? '#00BCD4' : '#FFC107'),
      colorscale: [['0', '#FFC107'], ['1', '#00BCD4']],
      colorbar: { title: 'Tsunami (0=No, 1=Yes)' }
    },
    text: validData.map(d => `Magnitude: ${d.magnitude}<br>Depth: ${d.depth} km<br>Location: ${d.location}<br>Time: ${d.date_time.toLocaleString()}<br>Tsunami: ${d.tsunami === 1 ? 'Yes' : 'No'}`),
    hoverinfo: 'text'
  };

  const layout = {
    title: 'Earthquakes by Magnitude vs Depth',
    xaxis: { title: 'Depth (km)', type: 'log' },
    yaxis: { title: 'Magnitude' },
    height: 360,
    margin: { t: 40, r: 20, b: 60, l: 60 },
    hovermode: 'closest'
  };

   if (trace.x.length === 0 || trace.y.length === 0) {
      console.warn("Mag vs Depth trace has no data after mapping.");
      if(chartDiv) Plotly.purge(chartDiv);
      if(chartDiv) chartDiv.innerHTML = '<div class="no-data-message">No data available for Magnitude vs Depth</div>';
      return;
  }

  console.log("Plotting Mag vs Depth Scatter Plot with data:", trace.x.length);
  if(chartDiv) Plotly.newPlot(chartDiv, [trace], layout, { responsive: true });
}

// Magnitude vs Significance Scatter Plot
function magSigScatterPlot(data) {
  console.log("magSigScatterPlot called with data:", data.length);
  
  // Filter out invalid data points
  const validData = data.filter(d => 
    d.magnitude != null && !isNaN(d.magnitude) && 
    d.significance != null && !isNaN(d.significance)
  );
  
  console.log("magSigScatterPlot - valid data points:", validData.length);

  const chartDiv = document.getElementById('chart-mag-sig');
  
  if (validData.length === 0) {
    console.warn("No valid data points for magnitude vs significance scatter plot");
     if(chartDiv) Plotly.purge(chartDiv);
     if(chartDiv) chartDiv.innerHTML = '<div class="no-data-message">No data available for Magnitude vs Significance</div>';
    return;
  }

  const trace = {
    x: validData.map(d => d.magnitude),
    y: validData.map(d => d.significance),
    mode: 'markers',
    type: 'scatter',
    marker: {
      size: 8,
      opacity: 0.7,
      color: validData.map(d => d.tsunami === 1 ? '#00BCD4' : '#FFC107'),
      colorscale: [['0', '#FFC107'], ['1', '#00BCD4']],
      colorbar: { title: 'Tsunami (0=No, 1=Yes)' }
    },
    text: validData.map(d => `Magnitude: ${d.magnitude}<br>Significance: ${d.significance}<br>Location: ${d.location}<br>Time: ${d.date_time.toLocaleString()}<br>Tsunami: ${d.tsunami === 1 ? 'Yes' : 'No'}`),
    hoverinfo: 'text'
  };

  const layout = {
    title: 'Magnitude vs Significance',
    xaxis: { title: 'Magnitude' },
    yaxis: { title: 'Significance' },
    height: 360,
    margin: { t: 40, r: 20, b: 60, l: 60 },
    hovermode: 'closest'
  };

   if (trace.x.length === 0 || trace.y.length === 0) {
      console.warn("Mag vs Sig trace has no data after mapping.");
      if(chartDiv) Plotly.purge(chartDiv);
      if(chartDiv) chartDiv.innerHTML = '<div class="no-data-message">No data available for Magnitude vs Significance</div>';
      return;
  }

  console.log("Plotting Mag vs Sig Scatter Plot with data:", trace.x.length);
  if(chartDiv) Plotly.newPlot(chartDiv, [trace], layout, { responsive: true });
}

// Magnitude Measurement Type Distribution
function magTypeDistributionPlots(data) {
  console.log("magTypeDistributionPlots called with data:", data.length);
  
  // Filter out invalid data points and count types
  const typeCounts = {};
  const validData = data.filter(d => d.magType != null && d.magType !== '');
  console.log("magTypeDistributionPlots - valid data points BEFORE counting:", validData.length, validData);
  
  const barDiv = document.getElementById('chart-mag-type-bar');
  const pieDiv = document.getElementById('chart-mag-type-pie');

  if (validData.length === 0) {
      console.warn("No valid data points for magnitude type distribution plots");
      if(barDiv) Plotly.purge(barDiv);
      if(pieDiv) Plotly.purge(pieDiv);
      if(barDiv) barDiv.innerHTML = '<div class="no-data-message">No data available for Magnitude Type Bar Chart</div>';
      if(pieDiv) pieDiv.innerHTML = '<div class="no-data-message">No data available for Magnitude Type Pie Chart</div>';
      return;
  }

  validData.forEach(d => {
      typeCounts[d.magType] = (typeCounts[d.magType] || 0) + 1;
  });
  
  console.log("magTypeDistributionPlots - type counts AFTER counting:", typeCounts);
  
  // Sort types by count in descending order
  const sortedTypes = Object.entries(typeCounts)
     .map(([label, value]) => [label, typeof value === 'number' ? value : parseFloat(value)]) // Ensure values are numbers
     .filter(([label, value]) => Number.isFinite(value) && label !== null && label !== '') // Filter out non-finite values and invalid labels
     .sort(([, a], [, b]) => b - a);

  const labels = sortedTypes.map(([label]) => label);
  const values = sortedTypes.map(([, value]) => value);

  // Add logs to check labels and values before plotting
  console.log("magTypeDistributionPlots - labels before plotting:", labels);
  console.log("magTypeDistributionPlots - values before plotting:", values);

  if (labels.length === 0 || values.length === 0 || values.every(v => v === 0)) {
    console.warn("No valid magnitude types found after counting or all counts are zero");
      if(barDiv) Plotly.purge(barDiv);
      if(pieDiv) Plotly.purge(pieDiv);
      if(barDiv) barDiv.innerHTML = '<div class="no-data-message">No data available for Magnitude Type Bar Chart</div>';
      if(pieDiv) pieDiv.innerHTML = '<div class="no-data-message">No data available for Magnitude Type Pie Chart</div>';
    return;
  }

  // Create bar chart trace
  const barTrace = {
    x: labels,
    y: values,
    type: 'bar',
    name: 'Magnitude Types',
    marker: {
      // Assign individual colors matching the pie chart
      color: labels.map(label => {
          if (label === 'mww') return '#673AB7'; // Deep Purple for mww
          const palette = ['#00BCD4', '#FFC107', '#E91E63', '#4CAF50', '#9C27B0', '#FF9800', '#FF5733', '#795548', '#2196F3'];
          const index = labels.indexOf(label);
          return palette[index % palette.length];
      }),
      line: {
        color: 'white',
        width: 1
      }
    }
  };

  const layout = {
    title: 'Magnitude Measurement Types: Count',
    xaxis: {
      title: 'Type',
      tickangle: -45,
      automargin: true
    },
    yaxis: { title: 'Count' },
    height: 360,
    margin: { t: 40, r: 20, b: 100, l: 60 },
    showlegend: false
  };

  console.log("Plotting Magnitude Type Bar Chart with data:", barTrace.x.length);
  if(barDiv) Plotly.newPlot(barDiv, [barTrace], layout, { responsive: true });

  // Create pie chart trace
  const pieTrace = {
    labels: labels,
    values: values,
    type: 'pie',
    name: 'Magnitude Types',
    marker: {
      // Use the same individual colors as the bar chart
      colors: labels.map(label => {
          if (label === 'mww') return '#673AB7'; // Deep Purple for mww
          const palette = ['#00BCD4', '#FFC107', '#E91E63', '#4CAF50', '#9C27B0', '#FF9800', '#FF5733', '#795548', '#2196F3'];
          const index = labels.indexOf(label);
          return palette[index % palette.length];
      })
    },
    textinfo: 'percent+label',
    hole: 0.4
  };

  const pieLayout = {
    title: 'Magnitude Type Distribution',
    height: 360,
    margin: { t: 40, r: 20, b: 20, l: 20 },
    showlegend: true,
    legend: { orientation: 'h', y: -0.2 }
  };

  console.log("Plotting Magnitude Type Pie Chart with data:", pieTrace.labels.length);
  if(pieDiv) Plotly.newPlot(pieDiv, [pieTrace], pieLayout, { responsive: true });
}

// Tsunami Distribution Analysis
function tsunamiDistributionPlots(data) {
  console.log("tsunamiDistributionPlots called with data:", data.length);
  
  // Filter out invalid data points and count tsunami occurrences
  const tsunamiCounts = { 'Yes': 0, 'No': 0 };
   const validData = data.filter(d => d.tsunami != null && !isNaN(d.tsunami));
   console.log("tsunamiDistributionPlots - valid data points:", validData.length);

  const barDiv = document.getElementById('chart-tsunami-bar');
  const pieDiv = document.getElementById('chart-tsunami-pie');

    if (validData.length === 0) {
      console.warn("No valid data points for tsunami distribution plots");
      if(barDiv) Plotly.purge(barDiv);
      if(pieDiv) Plotly.purge(pieDiv);
      if(barDiv) barDiv.innerHTML = '<div class="no-data-message">No data available for Tsunami Bar Chart</div>';
      if(pieDiv) pieDiv.innerHTML = '<div class="no-data-message">No data available for Tsunami Pie Chart</div>';
      return;
  }

  validData.forEach(d => {
    tsunamiCounts[d.tsunami === 1 ? 'Yes' : 'No']++;
  });
  
  console.log("tsunamiDistributionPlots - tsunami counts:", tsunamiCounts);
  
  const labels = Object.keys(tsunamiCounts);
  const values = Object.values(tsunamiCounts);

  if (labels.length === 0 || (tsunamiCounts['Yes'] === 0 && tsunamiCounts['No'] === 0)) {
    console.warn("No valid tsunami data found after counting");
    if(barDiv) Plotly.purge(barDiv);
    if(pieDiv) Plotly.purge(pieDiv);
    if(barDiv) barDiv.innerHTML = '<div class="no-data-message">No data available for Tsunami Bar Chart</div>';
    if(pieDiv) pieDiv.innerHTML = '<div class="no-data-message">No data available for Tsunami Pie Chart</div>';
    return;
  }

  // Create bar chart trace
  const barTrace = {
    x: labels,
    y: values,
    type: 'bar',
    name: 'Tsunami Occurrence',
    marker: {
      color: ['#00BCD4', '#FFC107'],
      line: {
        color: 'white',
        width: 1
      }
    }
  };

  const barLayout = {
    title: 'Tsunami Occurrence',
    xaxis: { title: 'Tsunami', automargin: true },
    yaxis: { title: 'Count' },
    height: 300,
    margin: { t: 40, r: 20, b: 60, l: 60 },
    showlegend: false
  };

  const pieLayout = {
    title: 'Tsunami Distribution',
    height: 360,
    margin: { t: 40, r: 20, b: 20, l: 20 },
    showlegend: true,
    legend: { orientation: 'h', y: -0.2 }
  };

  console.log("Plotting Tsunami Bar Chart with data:", barTrace.x.length);
  if(barDiv) Plotly.newPlot(barDiv, [barTrace], barLayout, { responsive: true });

  // Create pie chart trace
  const pieTrace = {
    labels: labels,
    values: values,
    type: 'pie',
    name: 'Tsunami Occurrence',
    marker: {
      colors: ['#00BCD4', '#FFC107']
    },
    textinfo: 'percent+label',
    hole: 0.4
  };

  console.log("Plotting Tsunami Pie Chart with data:", pieTrace.labels.length);
  if(pieDiv) Plotly.newPlot(pieDiv, [pieTrace], pieLayout, { responsive: true });
}

// Detailed Country Analysis
function detailedCountryAnalysis(data) {
  console.log("detailedCountryAnalysis called with data:", data.length);
  
  // Filter out invalid data points and group by country
  const countryData = {};
  const validData = data.filter(d => d.country != null && d.country !== '' && d.country !== 'Unknown'); // Exclude Unknown
  console.log("detailedCountryAnalysis - valid data points:", validData.length);

  const chartDiv = document.getElementById('chart-country-analysis');
  if (!chartDiv) {
      console.warn("Detailed country analysis chart div not found.");
      return;
  }

  // Clear previous content
  chartDiv.innerHTML = '';

  if (validData.length === 0) {
      console.warn("No valid data points for detailed country analysis");
      chartDiv.innerHTML = '<div class="no-data-message col-12">No data available for Detailed Country Analysis</div>';
      return;
  }

  validData.forEach(d => {
    if (!countryData[d.country]) {
      countryData[d.country] = {
        count: 0,
        magnitudes: [],
        depths: [],
        tsunamis: 0
      };
    }
    countryData[d.country].count++;
    if (d.magnitude != null && !isNaN(d.magnitude)) {
      countryData[d.country].magnitudes.push(d.magnitude);
    }
    if (d.depth != null && !isNaN(d.depth)) {
      countryData[d.country].depths.push(d.depth);
    }
    if (d.tsunami === 1) {
      countryData[d.country].tsunamis++;
    }
  });
  
  console.log("detailedCountryAnalysis - country data after grouping:", countryData);
  
  const countryStats = Object.entries(countryData).map(([country, stats]) => ({
    country,
    count: stats.count,
    avgMagnitude: stats.magnitudes.length > 0 ? 
      stats.magnitudes.reduce((a, b) => a + b, 0) / stats.magnitudes.length : 0,
    avgDepth: stats.depths.length > 0 ? 
      stats.depths.reduce((a, b) => a + b, 0) / stats.depths.length : 0,
    tsunamiRate: stats.count > 0 ? (stats.tsunamis / stats.count) * 100 : 0
  }));

  // Sort by count in descending order
  countryStats.sort((a, b) => b.count - a.count);

  console.log("detailedCountryAnalysis - country stats:", countryStats);

  if (countryStats.length === 0) {
      console.warn("No country stats generated.");
      chartDiv.innerHTML = '<div class="no-data-message col-12">No data available for Detailed Country Analysis</div>';
      return;
  }

  // Create bar chart traces
  const countTrace = {
    x: countryStats.map(s => s.country),
    y: countryStats.map(s => s.count),
    type: 'bar',
    name: 'Earthquake Count',
    marker: {
      color: '#00BCD4',
      line: {
        color: 'white',
        width: 1
      }
    }
  };

  const magnitudeTrace = {
    x: countryStats.map(s => s.country),
    y: countryStats.map(s => s.avgMagnitude),
    type: 'bar',
    name: 'Average Magnitude',
    marker: {
      color: '#FFC107',
      line: {
        color: 'white',
        width: 1
      }
    }
  };

  const depthTrace = {
    x: countryStats.map(s => s.country),
    y: countryStats.map(s => s.avgDepth),
    type: 'bar',
    name: 'Average Depth',
    marker: {
      color: '#E91E63',
      line: {
        color: 'white',
        width: 1
      }
    }
  };

  const tsunamiTrace = {
    x: countryStats.map(s => s.country),
    y: countryStats.map(s => s.tsunamiRate),
    type: 'bar',
    name: 'Tsunami Rate (%)',
    marker: {
      color: '#4CAF50',
      line: {
        color: 'white',
        width: 1
      }
    }
  };

  const layout = {
    title: 'Detailed Country Analysis',
    xaxis: { 
      title: 'Country',
      tickangle: -85,
      automargin: true
    },
    yaxis: { title: 'Value' },
    height: 550,
    margin: { t: 40, r: 20, b: 200, l: 60 },
    showlegend: true,
    legend: { orientation: 'h', y: 1.1 },
    barmode: 'group'
  };

   // Check if traces have data before plotting
   if (countryStats.length > 0) {
      console.log("Plotting Detailed Country Analysis with data for", countryStats.length, "countries.");
      Plotly.newPlot(chartDiv, [countTrace, magnitudeTrace, depthTrace, tsunamiTrace], layout, { responsive: true });
   } else {
       console.warn("No country stats to plot.");
       chartDiv.innerHTML = '<div class="no-data-message col-12">No data available for Detailed Country Analysis</div>';
   }
}

// Data Table Functionality
// Load earthquake data
async function loadEarthquakeData() {
  try {
    const response = await fetch('/api/earthquake-data');
    earthquakeData = await response.json();
    filteredData = [...earthquakeData];
    updateTable();
  } catch (error) {
    console.error('Error loading earthquake data:', error);
  }
}

// Update table with current data
function updateTable() {
  const tableBody = document.querySelector('#earthquakeTable tbody');
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const pageData = filteredData.slice(startIndex, endIndex);

  tableBody.innerHTML = '';
  pageData.forEach(quake => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${quake.date_time ? new Date(quake.date_time).toLocaleDateString() : '-'}</td>
      <td>${quake.magnitude != null ? quake.magnitude.toFixed(2) : '-'}</td>
      <td>${quake.depth != null ? quake.depth.toFixed(2) : '-'}</td>
      <td>${quake.latitude != null ? quake.latitude.toFixed(4) : '-'}</td>
      <td>${quake.longitude != null ? quake.longitude.toFixed(4) : '-'}</td>
      <td>${quake.location || '-'}</td>
      <td>${quake.significance != null ? quake.significance : (quake.sig != null ? quake.sig : '-')}</td>
      <td>${quake.magType || '-'}</td>
      <td>${quake.tsunami === 1 ? 'Yes' : (quake.tsunami === 0 ? 'No' : 'N/A')}</td>
    `;
    tableBody.appendChild(row);
  });

  updatePagination();
  updateTableInfo();
}

// Update pagination controls
function updatePagination() {
  const totalPages = Math.ceil(filteredData.length / entriesPerPage);
  const pagination = document.getElementById('tablePagination');
  pagination.innerHTML = '';

  // Previous button
  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
  prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>`;
  pagination.appendChild(prevLi);

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      const li = document.createElement('li');
      li.className = `page-item ${i === currentPage ? 'active' : ''}`;
      li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
      pagination.appendChild(li);
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      const li = document.createElement('li');
      li.className = 'page-item disabled';
      li.innerHTML = '<a class="page-link" href="#">...</a>';
      pagination.appendChild(li);
    }
  }

  // Next button
  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
  nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>`;
  pagination.appendChild(nextLi);
}

// Update table information
function updateTableInfo() {
  const start = (currentPage - 1) * entriesPerPage + 1;
  const end = Math.min(currentPage * entriesPerPage, filteredData.length);
  document.getElementById('tableInfo').textContent = 
    `Showing ${start} to ${end} of ${filteredData.length} entries`;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // ... existing event listeners ...

  // Data table event listeners
  document.getElementById('dataEntries').addEventListener('change', (e) => {
    entriesPerPage = parseInt(e.target.value);
    currentPage = 1;
    updateTable();
  });

  document.getElementById('tablePagination').addEventListener('click', (e) => {
    e.preventDefault();
    if (e.target.classList.contains('page-link')) {
      const page = parseInt(e.target.dataset.page);
      if (!isNaN(page) && page !== currentPage) {
        currentPage = page;
        updateTable();
      }
    }
  });

  // Load data when Data tab is clicked
  document.getElementById('data-tab').addEventListener('click', () => {
    if (earthquakeData.length === 0) {
      loadEarthquakeData();
    }
  });
});

// Add event listeners for correlation heatmap controls
function addCorrelationHeatmapEventListeners() {
  document.getElementById('correlationMethod').addEventListener('change', function() {
    if (currentHeatmapData && currentHeatmapData.length > 0) {
      correlationHeatmap(currentHeatmapData);
    }
  });
  
  document.getElementById('showCorrelationValues').addEventListener('change', function() {
    if (currentHeatmapData && currentHeatmapData.length > 0) {
      correlationHeatmap(currentHeatmapData);
    }
  });
}