const fs = require('fs');
const path = require('path');

class QueryEngine {
  constructor() {
    this.firs = [];
    this.persons = [];
    this.loaded = false;
  }

  loadData() {
    if (this.loaded) return;
    
    const firPath = path.join(process.cwd(), 'data', 'fir_records.json');
    const personPath = path.join(process.cwd(), 'data', 'person_records.json');
    
    this.firs = JSON.parse(fs.readFileSync(firPath, 'utf8'));
    this.persons = JSON.parse(fs.readFileSync(personPath, 'utf8'));
    this.loaded = true;
  }

  queryByDistrict(district) {
    this.loadData();
    return this.firs.filter(fir => 
      fir.district.toLowerCase().includes(district.toLowerCase())
    );
  }

  queryByCrimeType(crimeType) {
    this.loadData();
    return this.firs.filter(fir => 
      fir.crimeType.toLowerCase().includes(crimeType.toLowerCase())
    );
  }

  queryByDateRange(startDate, endDate) {
    this.loadData();
    return this.firs.filter(fir => {
      const firDate = new Date(fir.dateOfIncident);
      return firDate >= new Date(startDate) && firDate <= new Date(endDate);
    });
  }

  queryByPerson(name) {
    this.loadData();
    const person = this.persons.find(p => 
      p.name.toLowerCase().includes(name.toLowerCase())
    );
    
    if (!person) return { person: null, firs: [] };
    
    const relatedFirs = this.firs.filter(fir => 
      fir.accused.some(a => a.id === person.id) ||
      fir.victims.some(v => v.id === person.id)
    );
    
    return { person, firs: relatedFirs };
  }

  queryConnections(personId) {
    this.loadData();
    const connections = new Set();
    
    this.firs.forEach(fir => {
      const allInvolved = [...fir.accused, ...fir.victims];
      const personInvolved = allInvolved.find(p => p.id === personId);
      
      if (personInvolved) {
        allInvolved.forEach(p => {
          if (p.id !== personId) {
            connections.add(JSON.stringify({ id: p.id, name: p.name, firId: fir.firId }));
          }
        });
      }
    });
    
    return Array.from(connections).map(c => JSON.parse(c));
  }

  queryDistrictCrimeSummary(district, crimeType, startDate, endDate) {
    let results = this.firs;
    
    if (district) results = results.filter(f => f.district.toLowerCase().includes(district.toLowerCase()));
    if (crimeType) results = results.filter(f => f.crimeType.toLowerCase().includes(crimeType.toLowerCase()));
    if (startDate && endDate) {
      results = results.filter(f => {
        const d = new Date(f.dateOfIncident);
        return d >= new Date(startDate) && d <= new Date(endDate);
      });
    }
    
    return results;
  }

  getMonthlyStats(district, crimeType, months = 12) {
    this.loadData();
    const now = new Date();
    const stats = {};
    
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      stats[key] = 0;
    }
    
    let results = this.firs;
    if (district) results = results.filter(f => f.district.toLowerCase().includes(district.toLowerCase()));
    if (crimeType) results = results.filter(f => f.crimeType.toLowerCase().includes(crimeType.toLowerCase()));
    
    results.forEach(fir => {
      const d = new Date(fir.dateOfIncident);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (stats[key] !== undefined) stats[key]++;
    });
    
    return stats;
  }
}

module.exports = QueryEngine;