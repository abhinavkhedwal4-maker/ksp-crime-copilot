const Groq = require('groq-sdk');
const QueryEngine = require('../utils/queryEngine');
const BFSTraversal = require('../utils/bfs');
const AnomalyScorer = require('../utils/anomalyScorer');

const queryEngine = new QueryEngine();
const bfs = new BFSTraversal(queryEngine);
const anomalyScorer = new AnomalyScorer(queryEngine);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Conversation history (in-memory store - use Redis/DB in production)
const conversationHistory = new Map();

const FUNCTION_DEFINITIONS = [
  {
    name: 'query_by_district',
    description: 'Query FIR records by district name',
    parameters: {
      type: 'object',
      properties: {
        district: { type: 'string', description: 'District name (e.g., Bengaluru Urban, Mysuru)' }
      },
      required: ['district']
    }
  },
  {
    name: 'query_by_crime_type',
    description: 'Query FIR records by crime type',
    parameters: {
      type: 'object',
      properties: {
        crime_type: { type: 'string', description: 'Type of crime' }
      },
      required: ['crime_type']
    }
  },
  {
    name: 'query_by_date_range',
    description: 'Query FIR records within a date range',
    parameters: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        end_date: { type: 'string', description: 'End date (YYYY-MM-DD)' }
      },
      required: ['start_date', 'end_date']
    }
  },
  {
    name: 'query_by_person',
    description: 'Query FIR records involving a specific person',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Person name to search' }
      },
      required: ['name']
    }
  },
  {
    name: 'query_connections',
    description: 'Find connections between two people',
    parameters: {
      type: 'object',
      properties: {
        person1: { type: 'string', description: 'First person name' },
        person2: { type: 'string', description: 'Second person name' }
      },
      required: ['person1', 'person2']
    }
  },
  {
    name: 'query_district_crime_summary',
    description: 'Get summary of crimes in a district with optional filters',
    parameters: {
      type: 'object',
      properties: {
        district: { type: 'string' },
        crime_type: { type: 'string' },
        start_date: { type: 'string' },
        end_date: { type: 'string' }
      },
      required: []
    }
  },
  {
    name: 'detect_anomalies',
    description: 'Detect anomaly trends in crime data',
    parameters: {
      type: 'object',
      properties: {
        district: { type: 'string', description: 'Optional district filter' }
      },
      required: []
    }
  }
];

async function executeFunction(functionName, args) {
  switch(functionName) {
    case 'query_by_district':
      return queryEngine.queryByDistrict(args.district);
    case 'query_by_crime_type':
      return queryEngine.queryByCrimeType(args.crime_type);
    case 'query_by_date_range':
      return queryEngine.queryByDateRange(args.start_date, args.end_date);
    case 'query_by_person':
      return queryEngine.queryByPerson(args.name);
    case 'query_connections':
      return bfs.findShortestPath(args.person1, args.person2);
    case 'query_district_crime_summary':
      return queryEngine.queryDistrictCrimeSummary(
        args.district, args.crime_type, args.start_date, args.end_date
      );
    case 'detect_anomalies':
      return anomalyScorer.detectAnomalies(args.district);
    default:
      return { error: 'Unknown function' };
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, userId, district } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Get or create conversation history
    if (!conversationHistory.has(userId)) {
      conversationHistory.set(userId, []);
    }
    const history = conversationHistory.get(userId);

    // System prompt with instructions
    const systemPrompt = `You are KSP Crime Copilot, an AI assistant for Karnataka State Police.
You help investigators query crime records and analyze patterns.
IMPORTANT RULES:
1. ALWAYS use the available functions to query real data - NEVER make up answers
2. If a user asks about crimes, people, or patterns, you MUST call the appropriate function
3. Base your entire response on the actual data returned by the function
4. If the function returns no results, say so honestly
5. Cite specific FIR IDs and record counts in your response
6. Be concise but thorough - this is a professional tool
7. User's assigned district: ${district || 'All Districts'}
8. Only show data for their authorized district if restricted`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-4), // Last 4 messages (2 turns) — keeps first call small
      { role: 'user', content: message }
    ];

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      functions: FUNCTION_DEFINITIONS,
      function_call: 'auto',
      temperature: 0.3,
      max_tokens: 1000
    });

    const responseMessage = completion.choices[0].message;

    // Execute function if called
    let evidence = null;
    let finalResponse = responseMessage.content;

    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;
      const args = JSON.parse(responseMessage.function_call.arguments);
      
      console.log(`Executing function: ${functionName}`, args);
      const functionResult = await executeFunction(functionName, args);

      // Filter by district if user is restricted
      let filteredResult = functionResult;
      if (district && district !== 'All Districts' && Array.isArray(functionResult)) {
        filteredResult = functionResult.filter(fir => fir.district === district);
      }

      const resultCount = Array.isArray(filteredResult) ? filteredResult.length
                        : filteredResult.person ? 1 : 0;

      evidence = {
        functionCalled: functionName,
        arguments: args,
        resultCount,
        recordIds: Array.isArray(filteredResult)
          ? filteredResult.slice(0, 20).map(r => r.firId || r.id)
          : [],
        data: Array.isArray(filteredResult) ? filteredResult.slice(0, 20) : filteredResult
      };

      // ── Token-safe summary sent to the LLM ─────────────────
      // The raw array can be thousands of records; we send only a
      // compact summary so the second call stays well under 12k TPM.
      let llmPayload;
      if (Array.isArray(filteredResult)) {
        const sample = filteredResult.slice(0, 15).map(r => ({
          id:        r.firId || r.id,
          crime:     r.crimeType,
          district:  r.district,
          date:      r.date,
          status:    r.status,
          accused:   Array.isArray(r.accused)   ? r.accused.map(a => a.name).join(', ')   : undefined,
          victim:    Array.isArray(r.victims)    ? r.victims.map(v => v.name).join(', ')   : undefined,
        }));
        llmPayload = {
          total_records: filteredResult.length,
          shown: sample.length,
          records: sample
        };
      } else {
        // Non-array (path-finding, anomaly, summary objects) — safe to send as-is
        // but still cap at ~3000 chars to be safe
        const raw = JSON.stringify(filteredResult);
        llmPayload = raw.length > 3000
          ? JSON.parse(raw.slice(0, 3000) + '"…truncated"}')
          : filteredResult;
      }

      // Get final response with function result
      const secondCompletion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          ...messages,
          responseMessage,
          {
            role: 'function',
            name: functionName,
            content: JSON.stringify(llmPayload)
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      finalResponse = secondCompletion.choices[0].message.content;
    }

    // Update conversation history
    history.push(
      { role: 'user', content: message },
      { role: 'assistant', content: finalResponse }
    );
    
    // Keep only last 10 messages (5 turns)
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }

    conversationHistory.set(userId, history);

    return res.json({
      response: finalResponse,
      evidence,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message 
    });
  }
};