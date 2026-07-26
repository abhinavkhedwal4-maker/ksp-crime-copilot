// Block the inline dashboard.html script from running a second initialisation
window.dashboardPageLoaded = true;

class Dashboard {
  constructor() {
    this.statsContainer = document.getElementById('statsGrid');
    this.chartsContainer = document.getElementById('chartsGrid');
    this.alertsContainer = document.getElementById('alertsList');
    
    this.init();
  }

  async init() {
    await this.loadDashboardData();
    this.startAutoRefresh();
  }

  async loadDashboardData() {
    try {
      const response = await fetch('/api/dashboard-stats', {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Dashboard API returned ${response.status}`);
      }

      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Invalid dashboard payload: ${text.slice(0, 200)}`);
      }

      this.renderStats(data.summary);
      this.renderAlerts(data.recentAnomalies);
      this.renderCharts(data.crimeDistribution, data.monthlyTrend);
      this.renderDistrictTable(data.districtStats);
    } catch (error) {
      console.error('Dashboard loading error:', error);
      this.statsContainer.innerHTML = '<div class="stat-card"><div class="stat-label">Dashboard unavailable</div><div class="stat-value">--</div></div>';
      this.alertsContainer.innerHTML = '<p style="color: var(--text-secondary);">Unable to load dashboard data right now.</p>';
    }
  }

  renderStats(summary) {
    this.statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Total FIRs</div>
        <div class="stat-value">${summary.totalFirs.toLocaleString()}</div>
        <div class="stat-change">📋 All Records</div>
      </div>
      <div class="stat-card alert">
        <div class="stat-label">Active Alerts</div>
        <div class="stat-value">${summary.activeAlerts}</div>
        <div class="stat-change">${summary.highSeverityAlerts} High Severity</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Districts Covered</div>
        <div class="stat-value">${summary.districtsCovered}</div>
        <div class="stat-change">Karnataka State</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Persons in Database</div>
        <div class="stat-value">${summary.totalPersons.toLocaleString()}</div>
        <div class="stat-change">👥 Accused & Victims</div>
      </div>
    `;
  }

  renderAlerts(anomalies) {
    this.alertsContainer.innerHTML = anomalies.map(alert => `
      <div class="alert-item ${alert.severity.toLowerCase()}">
        <div class="alert-info">
          <div class="alert-title">${alert.crimeType} - ${alert.district}</div>
          <div class="alert-detail">
            Z-Score: ${alert.zScore} | Recent: ${alert.recentValue} | Avg: ${alert.historicalMean}
          </div>
        </div>
        <span class="alert-severity ${alert.severity.toLowerCase()}">${alert.severity}</span>
      </div>
    `).join('');
    
    if (anomalies.length === 0) {
      this.alertsContainer.innerHTML = '<p style="color: var(--text-secondary);">No anomalies detected currently.</p>';
    }
  }

  renderCharts(crimeDistribution, monthlyTrend) {
    // Destroy any existing chart on the canvas before re-creating
    const existingCrime = Chart.getChart('crimeChart');
    if (existingCrime) existingCrime.destroy();

    // Crime Distribution Chart
    const crimeCtx = document.getElementById('crimeChart').getContext('2d');
    new Chart(crimeCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(crimeDistribution),
        datasets: [{
          data: Object.values(crimeDistribution),
          backgroundColor: [
            '#f85149', '#f0883e', '#d2991d', '#7ee787', '#a371f7',
            '#79c0ff', '#56d364', '#ff7b72', '#f778ba', '#ffa657',
            '#e6edf3', '#8b949e'
          ],
          borderColor: '#161b22',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#e6edf3',
              padding: 10
            }
          }
        }
      }
    });

    const existingTrend = Chart.getChart('trendChart');
    if (existingTrend) existingTrend.destroy();

    // Monthly Trend Chart
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: Object.keys(monthlyTrend).reverse(),
        datasets: [{
          label: 'Total FIRs',
          data: Object.values(monthlyTrend).reverse(),
          borderColor: '#58a6ff',
          backgroundColor: 'rgba(88, 166, 255, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#e6edf3'
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#8b949e' },
            grid: { color: '#21262d' }
          },
          y: {
            ticks: { color: '#8b949e' },
            grid: { color: '#21262d' }
          }
        }
      }
    });
  }

  renderDistrictTable(districtStats) {
    const tableContainer = document.getElementById('districtTable');
    tableContainer.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; color: var(--text-primary);">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <th style="text-align: left; padding: 0.75rem;">District</th>
            <th style="text-align: right; padding: 0.75rem;">Total Cases</th>
            <th style="text-align: right; padding: 0.75rem;">Solved</th>
            <th style="text-align: right; padding: 0.75rem;">Pending</th>
            <th style="text-align: right; padding: 0.75rem;">Rate</th>
          </tr>
        </thead>
        <tbody>
          ${districtStats.map(dist => `
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 0.75rem;">${dist.district}</td>
              <td style="text-align: right; padding: 0.75rem;">${dist.totalCases}</td>
              <td style="text-align: right; padding: 0.75rem; color: #56d364;">${dist.solvedCases}</td>
              <td style="text-align: right; padding: 0.75rem; color: #f85149;">${dist.pendingCases}</td>
              <td style="text-align: right; padding: 0.75rem;">${((dist.solvedCases / dist.totalCases) * 100).toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  startAutoRefresh() {
    // Refresh dashboard every 5 minutes
    setInterval(() => this.loadDashboardData(), 300000);
  }
}

// Initialize dashboard
if (window.location.pathname.includes('dashboard.html') || window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
  });
}