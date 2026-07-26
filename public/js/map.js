class CrimeMap {
  constructor() {
    this.map = null;
    this.markers = [];
    this.clusterLayer = null;
    this.currentDistrict = 'all';
    this.currentCrimeType = 'all';
    
    this.init();
  }

  async init() {
    // Initialize map centered on Karnataka
    this.map = L.map('map').setView([14.5, 75.5], 7);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors, © CARTO',
      maxZoom: 19
    }).addTo(this.map);

    await this.loadData();
    this.setupControls();
  }

  async loadData() {
    try {
      const response = await fetch(`/api/map-data?district=${this.currentDistrict}&crimeType=${this.currentCrimeType}&cluster=true`);
      const data = await response.json();
      
      this.plotPoints(data.firs);
      this.plotClusters(data.clusters);
      this.updateLegend(data.crimeTypes);
    } catch (error) {
      console.error('Map data loading error:', error);
    }
  }

  plotPoints(firs) {
    // Clear existing markers
    this.markers.forEach(marker => this.map.removeLayer(marker));
    this.markers = [];

    // Color mapping for crime types
    const colorMap = {
      'Murder': '#ff1744',
      'Robbery': '#ff6b35',
      'Burglary': '#ffab00',
      'Theft': '#00ff41',
      'Chain Snatching': '#8c6fff',
      'Vehicle Theft': '#00d4ff',
      'Cybercrime': '#36a2eb',
      'Drug Trafficking': '#ff6384',
      'Sexual Assault': '#f778ba',
      'Kidnapping': '#ffa657',
      'Riots/Unlawful Assembly': '#e0e6ff'
    };

    firs.forEach(fir => {
      const col = colorMap[fir.crimeType] || '#8892b0';
      const marker = L.circleMarker([fir.lat, fir.lng], {
        radius: 6,
        fillColor: col,
        color: col,
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.75
      }).addTo(this.map);

      marker.bindPopup(`
        <div style="font-family:'JetBrains Mono',monospace;font-size:0.8rem;line-height:1.7;min-width:180px;">
          <strong style="color:#00d4ff;">${fir.firId}</strong><br>
          <span style="color:#e0e6ff;">${fir.crimeType}</span><br>
          <span style="color:#8892b0;">📍 ${fir.district}</span><br>
          <span style="color:#8892b0;">📅 ${fir.date}</span><br>
          <span style="color:#ffab00;">Status: ${fir.status}</span>
        </div>
      `);

      this.markers.push(marker);
    });

    // Update visible count
    const countEl = document.getElementById('visibleCount');
    if (countEl) countEl.textContent = firs.length;
  }

  plotClusters(clusters) {
    clusters.forEach(cluster => {
      if (cluster.points.length >= 3) {
        const intensity = Math.min(cluster.points.length / 20, 1);
        const clusterColor = intensity > 0.6 ? '#ff1744' : intensity > 0.3 ? '#ffab00' : '#00d4ff';
        const circle = L.circle([cluster.center.lat, cluster.center.lng], {
          radius: 1500,
          color: clusterColor,
          fillColor: clusterColor,
          fillOpacity: 0.12,
          weight: 2
        }).addTo(this.map);

        circle.bindPopup(`
          <div style="font-family:'JetBrains Mono',monospace;font-size:0.8rem;line-height:1.7;min-width:200px;">
            <strong style="color:#ff1744;">⚠ HOTSPOT CLUSTER</strong><br>
            <span style="color:#e0e6ff;">${cluster.points.length} incidents</span><br>
            <span style="color:#8892b0;">📅 ${cluster.dateRange.start} to ${cluster.dateRange.end}</span><br>
            <span style="color:#ffab00;">Top crime: ${Object.entries(cluster.crimeTypes).sort((a,b) => b[1]-a[1])[0][0]}</span>
          </div>
        `);

        this.markers.push(circle);
      }
    });
  }

  setupControls() {
    const districtSelect = document.getElementById('districtFilter');
    const crimeTypeSelect = document.getElementById('crimeTypeFilter');

    districtSelect.addEventListener('change', async (e) => {
      this.currentDistrict = e.target.value;
      await this.loadData();
    });

    crimeTypeSelect.addEventListener('change', async (e) => {
      this.currentCrimeType = e.target.value;
      await this.loadData();
    });
  }

  updateLegend(crimeTypes) {
    const legendContainer = document.getElementById('legend');
    const colorMap = {
      'Murder': '#ff1744',
      'Robbery': '#ff6b35',
      'Burglary': '#ffab00',
      'Theft': '#00ff41',
      'Chain Snatching': '#8c6fff',
      'Vehicle Theft': '#00d4ff',
      'Cybercrime': '#36a2eb',
      'Drug Trafficking': '#ff6384',
      'Sexual Assault': '#f778ba',
      'Kidnapping': '#ffa657',
      'Riots/Unlawful Assembly': '#e0e6ff'
    };

    legendContainer.innerHTML = crimeTypes.map(type => `
      <div class="legend-item">
        <div class="legend-color" style="background:${colorMap[type]||'#8892b0'};box-shadow:0 0 5px ${colorMap[type]||'#8892b0'};"></div>
        <span>${type}</span>
      </div>
    `).join('');
  }
}

// Initialize map
if (window.location.pathname.includes('map.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    new CrimeMap();
  });
}