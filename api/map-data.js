const QueryEngine = require('../utils/queryEngine');
const DBSCAN = require('../utils/dbscan');

module.exports = async function handler(req, res) {
  const { district, crimeType, cluster } = req.query;
  
  const qe = new QueryEngine();
  qe.loadData();
  
  let firs = qe.firs;
  
  if (district && district !== 'all') {
    firs = firs.filter(f => f.district.toLowerCase() === district.toLowerCase());
  }
  
  if (crimeType && crimeType !== 'all') {
    firs = firs.filter(f => f.crimeType === crimeType);
  }
  
  // Cluster analysis
  let clusters = {};
  if (cluster === 'true') {
    const dbscan = new DBSCAN(0.05, 3);
    const points = firs.map(fir => ({
      lat: fir.location.lat,
      lng: fir.location.lng,
      date: fir.dateOfIncident,
      crimeType: fir.crimeType,
      firId: fir.firId
    }));
    
    clusters = dbscan.findClusters(points);
  }
  
  return res.json({
    firs: firs.map(fir => ({
      firId: fir.firId,
      district: fir.district,
      crimeType: fir.crimeType,
      date: fir.dateOfIncident,
      lat: fir.location.lat,
      lng: fir.location.lng,
      status: fir.caseStatus
    })),
    clusters: Object.values(clusters),
    total: firs.length,
    districts: [...new Set(firs.map(f => f.district))],
    crimeTypes: [...new Set(firs.map(f => f.crimeType))]
  });
};