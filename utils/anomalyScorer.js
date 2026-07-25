class AnomalyScorer {
  constructor(queryEngine) {
    this.qe = queryEngine;
  }

  calculateZScore(recentValue, mean, stdDev) {
    if (stdDev === 0) return recentValue > 0 ? 3 : 0;
    return (recentValue - mean) / stdDev;
  }

  detectAnomalies(district = null) {
    this.qe.loadData();
    
    const districts = district ? [district] : [
      'Bengaluru Urban', 'Mysuru', 'Mangaluru', 'Hubballi-Dharwad',
      'Belagavi', 'Kalaburagi', 'Tumakuru', 'Shivamogga'
    ];
    
    const crimeTypes = [
      'Murder', 'Robbery', 'Burglary', 'Theft', 'Chain Snatching',
      'Vehicle Theft', 'Cybercrime', 'Drug Trafficking', 'Sexual Assault',
      'Kidnapping', 'Riots/Unlawful Assembly'
    ];
    
    const anomalies = [];
    
    districts.forEach(dist => {
      crimeTypes.forEach(crime => {
        // Get monthly stats for the last 12 months
        const monthlyStats = this.qe.getMonthlyStats(dist, crime, 12);
        const months = Object.keys(monthlyStats).sort();
        
        if (months.length < 3) return;
        
        // Recent month (most recent)
        const recentMonth = months[months.length - 1];
        const recentValue = monthlyStats[recentMonth];
        
        // Historical months (excluding the most recent)
        const historicalMonths = months.slice(0, -1);
        const historicalValues = historicalMonths.map(m => monthlyStats[m]);
        
        const mean = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length;
        const variance = historicalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalValues.length;
        const stdDev = Math.sqrt(variance);
        
        const zScore = this.calculateZScore(recentValue, mean, stdDev);
        
        if (zScore > 1.5 && recentValue > 2) {
          anomalies.push({
            district: dist,
            crimeType: crime,
            recentMonth,
            recentValue,
            historicalMean: parseFloat(mean.toFixed(2)),
            zScore: parseFloat(zScore.toFixed(2)),
            severity: zScore > 2.5 ? 'High' : 'Medium',
            trend: 'Increasing',
            evidence: this.qe.queryDistrictCrimeSummary(dist, crime, 
              `${recentMonth}-01`, `${recentMonth}-31`
            ).slice(0, 10)
          });
        }
      });
    });
    
    return anomalies.sort((a, b) => b.zScore - a.zScore);
  }
}

module.exports = AnomalyScorer;