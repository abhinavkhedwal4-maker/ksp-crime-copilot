const fs = require('fs');
const path = require('path');

// Configuration
const DISTRICTS = [
  { name: 'Bengaluru Urban', lat: 12.9716, lng: 77.5946, stations: 25 },
  { name: 'Mysuru', lat: 12.2958, lng: 76.6394, stations: 12 },
  { name: 'Mangaluru', lat: 12.9141, lng: 74.8560, stations: 10 },
  { name: 'Hubballi-Dharwad', lat: 15.3647, lng: 75.1240, stations: 8 },
  { name: 'Belagavi', lat: 15.8497, lng: 74.4977, stations: 9 },
  { name: 'Kalaburagi', lat: 17.3297, lng: 76.8343, stations: 7 },
  { name: 'Tumakuru', lat: 13.3379, lng: 77.1173, stations: 8 },
  { name: 'Shivamogga', lat: 13.9299, lng: 75.5681, stations: 7 }
];

const CRIME_CATEGORIES = [
  'Murder', 'Attempt to Murder', 'Robbery', 'Burglary', 'Theft',
  'Chain Snatching', 'Vehicle Theft', 'Cybercrime', 'Drug Trafficking',
  'Sexual Assault', 'Kidnapping', 'Riots/Unlawful Assembly'
];

const WEAPONS = ['Knife', 'Pistol', 'Iron Rod', 'Machete', 'None', 'Blunt Object', 'Acid'];
const VEHICLES = ['Two-wheeler', 'Auto-rickshaw', 'Car', 'Truck', 'None', 'Bus'];
const OUTCOMES = ['Under Investigation', 'Chargesheet Filed', 'Arrest Made', 'Convicted', 'Acquitted', 'Pending'];

// Name pools for realistic Karnataka demographics
const FIRST_NAMES_MALE = ['Rajesh', 'Suresh', 'Venkatesh', 'Manjunath', 'Ravi', 'Prakash', 'Ganesh', 'Ramesh', 'Anand', 'Kiran', 'Dinesh', 'Nagesh', 'Shankar', 'Mohan', 'Vijay', 'Umesh', 'Harish', 'Sridhar', 'Naveen', 'Prashanth'];
const FIRST_NAMES_FEMALE = ['Lakshmi', 'Saraswati', 'Gowri', 'Radha', 'Parvati', 'Meena', 'Geetha', 'Sunita', 'Rekha', 'Anita', 'Sujatha', 'Kavitha', 'Deepa', 'Asha', 'Renuka'];
const LAST_NAMES = ['Patil', 'Shetty', 'Hegde', 'Rao', 'Naik', 'Gowda', 'Kumar', 'Reddy', 'Poojary', 'Hegde', 'Sharma', 'Joshi', 'Kulkarni', 'Desai', 'Hiremath'];

// Criminal gang/crime rings for realistic pattern generation
const CRIME_RINGS = [
  { name: 'Reddy Gang', members: [], baseDistrict: 'Bengaluru Urban', specializations: ['Robbery', 'Burglary'] },
  { name: 'Coastal Cartel', members: [], baseDistrict: 'Mangaluru', specializations: ['Drug Trafficking', 'Murder'] },
  { name: 'Tech Fraudsters', members: [], baseDistrict: 'Bengaluru Urban', specializations: ['Cybercrime'] },
  { name: 'Hubballi Highway Robbers', members: [], baseDistrict: 'Hubballi-Dharwad', specializations: ['Vehicle Theft', 'Robbery'] },
  { name: 'Border Smugglers', members: [], baseDistrict: 'Belagavi', specializations: ['Drug Trafficking'] }
];

class DataGenerator {
  constructor() {
    this.persons = [];
    this.firs = [];
    this.personIdCounter = 1;
    this.firIdCounter = 1;
  }

  generatePhone() {
    return `9${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`;
  }

  generateDOB(minAge = 18, maxAge = 65) {
    const year = 2026 - Math.floor(Math.random() * (maxAge - minAge + 1)) - minAge;
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  createPerson(isVictim = false, gangMembership = null) {
    const isMale = Math.random() > 0.15;
    const firstName = isMale 
      ? FIRST_NAMES_MALE[Math.floor(Math.random() * FIRST_NAMES_MALE.length)]
      : FIRST_NAMES_FEMALE[Math.floor(Math.random() * FIRST_NAMES_FEMALE.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    
    const person = {
      id: `P${this.personIdCounter.toString().padStart(5, '0')}`,
      name: `${firstName} ${lastName}`,
      age: Math.floor(Math.random() * 47) + 18,
      gender: isMale ? 'Male' : 'Female',
      phone: this.generatePhone(),
      dob: this.generateDOB(),
      district: DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)].name,
      criminalHistory: [],
      gangAffiliation: gangMembership,
      isWanted: !isVictim && Math.random() < 0.15
    };
    
    this.personIdCounter++;
    return person;
  }

  generateFIRDate(month, year) {
    const day = Math.floor(Math.random() * 28) + 1;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  createFIR(district, crimeType, accused, victim, date) {
    const fir = {
      firId: `FIR${this.firIdCounter.toString().padStart(6, '0')}`,
      district: district.name,
      policeStation: `${district.name} PS ${Math.floor(Math.random() * district.stations) + 1}`,
      crimeType: crimeType,
      dateOfIncident: date,
      location: {
        lat: district.lat + (Math.random() - 0.5) * 0.5,
        lng: district.lng + (Math.random() - 0.5) * 0.5,
        address: `${Math.floor(Math.random() * 200) + 1}, ${['Main Road', 'Cross Street', 'Market Area', 'Ring Road', 'Extension Area', 'Industrial Area'][Math.floor(Math.random() * 6)]}, ${district.name}`
      },
      accused: accused.map(p => ({
        id: p.id,
        name: p.name,
        role: 'Primary Accused'
      })),
      victims: victim.map(v => ({
        id: v.id,
        name: v.name,
        injurySeverity: ['Minor', 'Moderate', 'Severe', 'Fatal'][Math.floor(Math.random() * 4)]
      })),
      weaponUsed: WEAPONS[Math.floor(Math.random() * WEAPONS.length)],
      vehicleUsed: VEHICLES[Math.floor(Math.random() * VEHICLES.length)],
      caseStatus: OUTCOMES[Math.floor(Math.random() * OUTCOMES.length)],
      investigationOfficer: `Inspector ${FIRST_NAMES_MALE[Math.floor(Math.random() * FIRST_NAMES_MALE.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`,
      propertyStolen: crimeType === 'Theft' || crimeType === 'Robbery' ? `₹${Math.floor(Math.random() * 500000) + 10000}` : 'N/A',
      description: ''
    };
    
    fir.description = `On ${fir.dateOfIncident}, a case of ${crimeType} was registered at ${fir.policeStation}. ` +
      `Accused: ${accused.map(a => a.name).join(', ')}. Victim: ${victim.map(v => v.name).join(', ')}. ` +
      `Weapon: ${fir.weaponUsed}. Status: ${fir.caseStatus}.`;
    
    this.firIdCounter++;
    return fir;
  }

  generateGangMembers() {
    CRIME_RINGS.forEach(gang => {
      const memberCount = Math.floor(Math.random() * 6) + 4;
      for (let i = 0; i < memberCount; i++) {
        const member = this.createPerson(false, gang.name);
        member.district = gang.baseDistrict;
        gang.members.push(member);
        this.persons.push(member);
      }
    });
  }

  generateBulkData() {
    console.log('Generating synthetic crime data for KSP Crime Copilot...');
    
    // Generate gang members first (ensures network patterns)
    this.generateGangMembers();
    
    // Generate regular persons (accused and victims)
    while (this.persons.length < 2500) {
      const isVictim = Math.random() > 0.6;
      this.persons.push(this.createPerson(isVictim));
    }
    
    // Generate FIRs with temporal and spatial patterns
    const months = Array.from({length: 27}, (_, i) => ({
      month: (i % 12) + 1,
      year: 2024 + Math.floor(i / 12)
    }));
    
    // Crime distribution with realistic patterns
    const crimeDistribution = CRIME_CATEGORIES.reduce((acc, crime) => {
      acc[crime] = { weight: Math.random() * 0.5 + 0.5, surgeMonth: Math.floor(Math.random() * 27) };
      return acc;
    }, {});
    
    // Seasonal patterns: more thefts in winter, more cybercrime in urban areas
    let totalFirs = 0;
    const targetFirs = 1500;
    
    while (totalFirs < targetFirs) {
      const monthData = months[totalFirs % months.length];
      const district = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
      
      // Crime type selection with district bias
      let crimeType;
      if (district.name === 'Bengaluru Urban' && Math.random() > 0.7) {
        crimeType = Math.random() > 0.5 ? 'Cybercrime' : 'Chain Snatching';
      } else if (district.name === 'Mangaluru' && Math.random() > 0.7) {
        crimeType = 'Drug Trafficking';
      } else {
        const weights = CRIME_CATEGORIES.map((c, i) => crimeDistribution[c].weight);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        crimeType = CRIME_CATEGORIES.find((c, i) => (random -= crimeDistribution[c].weight) <= 0);
      }
      
      // Create incident with gang pattern injection
      const gang = CRIME_RINGS.find(g => 
        district.name === g.baseDistrict && 
        g.specializations.includes(crimeType) &&
        Math.random() > 0.6
      );
      
      let accused = [];
      let victim = [];
      
      if (gang && gang.members.length >= 2) {
        // Use gang members as accused
        const gangMembersInvolved = Math.floor(Math.random() * Math.min(gang.members.length, 3)) + 1;
        for (let i = 0; i < gangMembersInvolved; i++) {
          const member = gang.members[Math.floor(Math.random() * gang.members.length)];
          if (!accused.find(a => a.id === member.id)) {
            accused.push(member);
            member.criminalHistory.push({ crimeType, date: this.generateFIRDate(monthData.month, monthData.year) });
          }
        }
      } else {
        // Random accused
        const accusedCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < accusedCount; i++) {
          const person = this.persons[Math.floor(Math.random() * this.persons.length)];
          if (!person.gangAffiliation || Math.random() > 0.5) {
            accused.push(person);
            person.criminalHistory.push({ crimeType, date: this.generateFIRDate(monthData.month, monthData.year) });
          }
        }
      }
      
      // Generate victims
      const victimCount = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < victimCount; i++) {
        const person = this.persons.find(p => !accused.includes(p) && p.gender !== undefined);
        if (person) victim.push(person);
        else victim.push(this.createPerson(true));
        if (victim.length === victimCount) break;
      }
      
      const fir = this.createFIR(
        district,
        crimeType,
        accused.length > 0 ? accused : [this.persons[Math.floor(Math.random() * this.persons.length)]],
        victim.length > 0 ? victim : [this.createPerson(true)],
        this.generateFIRDate(monthData.month, monthData.year)
      );
      
      this.firs.push(fir);
      totalFirs++;
    }
    
    // Inject seasonal surges for anomaly detection
    this.injectAnomalyPatterns();
    
    console.log(`Generated ${this.persons.length} person records`);
    console.log(`Generated ${this.firs.length} FIR records`);
    
    return { persons: this.persons, firs: this.firs };
  }

  injectAnomalyPatterns() {
    // Create a sudden spike in chain snatching in Bengaluru in the last 3 months
    const lastThreeMonths = ['2026-05', '2026-06', '2026-07'];
    const spikeDistrict = DISTRICTS.find(d => d.name === 'Bengaluru Urban');
    
    for (let i = 0; i < 30; i++) {
      const date = lastThreeMonths[i % 3] + '-' + (Math.floor(Math.random() * 28) + 1).toString().padStart(2, '0');
      const acc = this.persons.slice(0, 2);
      const vic = this.persons.slice(10, 11);
      this.firs.push(this.createFIR(spikeDistrict, 'Chain Snatching', acc, vic, date));
    }
    
    // Create a spike in drug trafficking in Mangaluru
    const mangaluruDistrict = DISTRICTS.find(d => d.name === 'Mangaluru');
    for (let i = 0; i < 20; i++) {
      const date = lastThreeMonths[i % 3] + '-' + (Math.floor(Math.random() * 28) + 1).toString().padStart(2, '0');
      const gang = CRIME_RINGS.find(g => g.name === 'Coastal Cartel');
      this.firs.push(this.createFIR(mangaluruDistrict, 'Drug Trafficking', gang.members.slice(0, 2), this.persons.slice(50, 51), date));
    }
  }

  save() {
    const dir = __dirname;
    fs.writeFileSync(path.join(dir, 'person_records.json'), JSON.stringify(this.persons, null, 2));
    fs.writeFileSync(path.join(dir, 'fir_records.json'), JSON.stringify(this.firs, null, 2));
    console.log('Data files saved to /data directory');
  }
}

// Execute generation
const generator = new DataGenerator();
generator.generateBulkData();
generator.save();