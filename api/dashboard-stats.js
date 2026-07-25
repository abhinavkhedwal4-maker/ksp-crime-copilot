const QueryEngine = require('../utils/queryEngine');
const AnomalyScorer = require('../utils/anomalyScorer');

module.exports = async function handler(req, res) {
  const qe = new QueryEngine();
  const scorer = new AnomalyScorer(qe);
  
  qe.loadData();
  
  const totalFirs = qe.firs.length;
  const totalPersons = qe.persons.length;
  const districts = [...new Set(qe.firs.map(f => f.district))];
  
  const anomalies = scorer.detectAnomalies();
  
  // Crime type distribution
  const crimeDistribution = {};
  qe.firs.forEach(fir => {
    crimeDistribution[fir.crimeType] = (crimeDistribution[fir.crimeType] || 0) + 1;
  });
  
  // Monthly trend (last 6 months)
  const monthlyTrend = qe.getMonthlyStats(null, null, 6);
  
  // District-wise stats
  const districtStats = districts.map(dist => {
    const districtFirs = qe.firs.filter(f => f.district === dist);
    return {
      district: dist,
      totalCases: districtFirs.length,
      solvedCases: districtFirs.filter(f => 
        ['Chargesheet Filed', 'Arrest Made', 'Convicted'].includes(f.caseStatus)
      ).length,
      pendingCases: districtFirs.filter(f => 
        ['Under Investigation', 'Pending'].includes(f.caseStatus)
      ).length
    };
  });
  
  return res.json({
    summary: {
      totalFirs,
      totalPersons,
      districtsCovered: districts.length,
      activeAlerts: anomalies.length,
      highSeverityAlerts: anomalies.filter(a => a.severity === 'High').length
    },
    crimeDistribution,
    monthlyTrend,
    districtStats,
    recentAnomalies: anomalies.slice(0, 5)
  });
};