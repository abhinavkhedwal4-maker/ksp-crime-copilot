// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBPcOHy3C65Q7hH7e0ijXsqs47CQpkT9gc",
  authDomain: "ksp-crime-copilot.firebaseapp.com",
  projectId: "ksp-crime-copilot",
  storageBucket: "ksp-crime-copilot.firebasestorage.app",
  messagingSenderId: "173365977274",
  appId: "1:173365977274:web:1a29460f51dc27295a6283",
  measurementId: "G-Y5PT520PHW"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// User roles database (in production, use Firebase custom claims)
const USER_ROLES = {
  'investigator@ksp.gov.in': { role: 'Investigator', district: 'Bengaluru Urban' },
  'analyst@ksp.gov.in': { role: 'Analyst', district: 'All Districts' },
  'supervisor@ksp.gov.in': { role: 'Supervisor', district: 'All Districts' },
  'demo@ksp.gov.in': { role: 'Investigator', district: 'Mysuru' }
};

function getUserRole(email) {
  return USER_ROLES[email] || { role: 'Investigator', district: 'Bengaluru Urban' };
}