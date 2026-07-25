const QueryEngine = require('../utils/queryEngine');
const BFSTraversal = require('../utils/bfs');

module.exports = async function handler(req, res) {
  const { person, person2, depth = 2, mode = 'graph' } = req.query;
  
  const qe = new QueryEngine();
  const bfs = new BFSTraversal(qe);
  
  if (!person) {
    return res.status(400).json({ error: 'Person name required' });
  }
  
  if (mode === 'path' && person2) {
    const pathResult = bfs.findShortestPath(person, person2, 5);
    return res.json(pathResult);
  }
  
  const networkGraph = bfs.getNetworkGraph(person, parseInt(depth));
  return res.json(networkGraph);
};