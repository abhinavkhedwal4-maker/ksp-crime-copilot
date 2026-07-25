const QueryEngine = require('../utils/queryEngine');
const AnomalyScorer = require('../utils/anomalyScorer');

module.exports = async function handler(req, res) {
  const { district } = req.query;
  
  const qe = new QueryEngine();
  const scorer = new AnomalyScorer(qe);
  
  const anomalies = scorer.detectAnomalies(district);
  
  return res.json({
    anomalies,
    total: anomalies.length,
    highSeverity: anomalies.filter(a => a.severity === 'High').length,
    timestamp: new Date().toISOString()
  });
};