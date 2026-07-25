# KSP Crime Copilot 🚔

AI-powered crime intelligence platform for Karnataka State Police. Built for hackathon submission.

## Features

- 🔐 **Role-based Authentication** (Investigator/Analyst/Supervisor)
- 💬 **Conversational AI** with Groq Llama 3.3 70B + Function Calling
- 🗺️ **Geospatial Hotspot Map** with DBSCAN clustering
- 🕸️ **Criminal Network Graph** with BFS traversal
- 🚨 **Anomaly Detection** with Z-score analysis
- 📊 **Analytics Dashboard** with real-time stats

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (No frameworks)
- **Backend:** Vercel Serverless Functions (Node.js)
- **Auth:** Firebase Authentication
- **AI:** Groq API (Llama 3.3 70B)
- **Data:** Synthetic dataset (1500+ FIRs, 2500+ persons)

## Setup

### Prerequisites
- Node.js 18+
- Vercel CLI (`npm i -g vercel`)
- Firebase project with Email/Password auth enabled
- Groq API key

### Environment Variables
Create `.env` file from `.env.example` and fill in your keys.

### Local Development

```bash
# Install dependencies
npm install

# Generate synthetic data
npm run generate-data

# Run locally
npm run dev