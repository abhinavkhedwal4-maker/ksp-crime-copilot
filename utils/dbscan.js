class DBSCAN {
  constructor(eps = 0.05, minPts = 3) {
    this.eps = eps; // Spatial proximity threshold (in degrees lat/lng)
    this.minPts = minPts;
    this.temporalEps = 30; // Days
  }

  euclideanDistance(point1, point2) {
    const latDiff = point1.lat - point2.lat;
    const lngDiff = point1.lng - point2.lng;
    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  }

  temporalDistance(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
  }

  spatialTemporalDistance(point1, point2) {
    const spatialDist = this.euclideanDistance(point1, point2);
    const temporalDist = this.temporalDistance(point1.date, point2.date);
    
    // Normalize and combine
    return (spatialDist / this.eps) * 0.5 + (temporalDist / this.temporalEps) * 0.5;
  }

  getNeighbors(points, pointIndex) {
    const neighbors = [];
    const point = points[pointIndex];
    
    points.forEach((otherPoint, idx) => {
      if (idx !== pointIndex) {
        const distance = this.spatialTemporalDistance(point, otherPoint);
        if (distance <= 1) {
          neighbors.push(idx);
        }
      }
    });
    
    return neighbors;
  }

  cluster(points) {
    const labels = new Array(points.length).fill(-1);
    let clusterId = 0;
    
    for (let i = 0; i < points.length; i++) {
      if (labels[i] !== -1) continue;
      
      const neighbors = this.getNeighbors(points, i);
      
      if (neighbors.length < this.minPts) {
        labels[i] = 0; // Noise
        continue;
      }
      
      clusterId++;
      labels[i] = clusterId;
      
      const seeds = [...neighbors];
      let seedIndex = 0;
      
      while (seedIndex < seeds.length) {
        const currentPoint = seeds[seedIndex];
        
        if (labels[currentPoint] === 0) {
          labels[currentPoint] = clusterId;
        }
        if (labels[currentPoint] !== -1) {
          seedIndex++;
          continue;
        }
        
        labels[currentPoint] = clusterId;
        const currentNeighbors = this.getNeighbors(points, currentPoint);
        
        if (currentNeighbors.length >= this.minPts) {
          currentNeighbors.forEach(neighbor => {
            if (!seeds.includes(neighbor)) {
              seeds.push(neighbor);
            }
          });
        }
        
        seedIndex++;
      }
    }
    
    return labels;
  }

  findClusters(points) {
    const labels = this.cluster(points);
    const clusters = {};
    
    labels.forEach((label, idx) => {
      if (label > 0) {
        if (!clusters[label]) {
          clusters[label] = {
            id: label,
            points: [],
            center: { lat: 0, lng: 0 },
            crimeTypes: {},
            dateRange: { start: null, end: null }
          };
        }
        
        const point = points[idx];
        clusters[label].points.push(point);
        
        // Track crime types
        if (!clusters[label].crimeTypes[point.crimeType]) {
          clusters[label].crimeTypes[point.crimeType] = 0;
        }
        clusters[label].crimeTypes[point.crimeType]++;
        
        // Track date range
        if (!clusters[label].dateRange.start || new Date(point.date) < new Date(clusters[label].dateRange.start)) {
          clusters[label].dateRange.start = point.date;
        }
        if (!clusters[label].dateRange.end || new Date(point.date) > new Date(clusters[label].dateRange.end)) {
          clusters[label].dateRange.end = point.date;
        }
      }
    });
    
    // Calculate cluster centers
    Object.values(clusters).forEach(cluster => {
      cluster.center.lat = cluster.points.reduce((sum, p) => sum + p.lat, 0) / cluster.points.length;
      cluster.center.lng = cluster.points.reduce((sum, p) => sum + p.lng, 0) / cluster.points.length;
    });
    
    return clusters;
  }
}

module.exports = DBSCAN;