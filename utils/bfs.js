class BFSTraversal {
  constructor(queryEngine) {
    this.qe = queryEngine;
  }

  findShortestPath(person1Name, person2Name, maxDepth = 5) {
    this.qe.loadData();
    
    const person1 = this.qe.persons.find(p => 
      p.name.toLowerCase().includes(person1Name.toLowerCase())
    );
    const person2 = this.qe.persons.find(p => 
      p.name.toLowerCase().includes(person2Name.toLowerCase())
    );
    
    if (!person1 || !person2) return { path: [], error: 'One or both persons not found' };
    if (person1.id === person2.id) return { path: [person1], distance: 0 };
    
    // Build adjacency list
    const graph = new Map();
    this.qe.firs.forEach(fir => {
      const allInvolved = [...fir.accused, ...fir.victims];
      allInvolved.forEach(p1 => {
        allInvolved.forEach(p2 => {
          if (p1.id !== p2.id) {
            if (!graph.has(p1.id)) graph.set(p1.id, new Set());
            graph.get(p1.id).add(p2.id);
          }
        });
      });
    });
    
    // BFS with path tracking
    const queue = [[person1.id, [person1]]];
    const visited = new Set([person1.id]);
    
    while (queue.length > 0) {
      const [currentId, path] = queue.shift();
      
      if (path.length > maxDepth) continue;
      
      const neighbors = graph.get(currentId) || new Set();
      
      for (const neighborId of neighbors) {
        if (neighborId === person2.id) {
          const targetPerson = this.qe.persons.find(p => p.id === neighborId);
          return { path: [...path, targetPerson], distance: path.length };
        }
        
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          const neighbor = this.qe.persons.find(p => p.id === neighborId);
          if (neighbor) {
            queue.push([neighborId, [...path, neighbor]]);
          }
        }
      }
    }
    
    return { path: [], error: 'No connection found within search depth' };
  }

  getNetworkGraph(personName, depth = 2) {
    this.qe.loadData();
    
    const person = this.qe.persons.find(p => 
      p.name.toLowerCase().includes(personName.toLowerCase())
    );
    if (!person) return { nodes: [], edges: [] };
    
    const nodes = new Map();
    const edges = new Set();
    const visited = new Set();
    
    const explore = (currentPerson, currentDepth) => {
      if (currentDepth > depth || visited.has(currentPerson.id)) return;
      visited.add(currentPerson.id);
      
      if (!nodes.has(currentPerson.id)) {
        nodes.set(currentPerson.id, {
          id: currentPerson.id,
          name: currentPerson.name,
          label: currentPerson.name,
          group: currentPerson.gangAffiliation || 'Unknown'
        });
      }
      
      if (currentDepth < depth) {
        const connections = this.qe.queryConnections(currentPerson.id);
        connections.forEach(conn => {
          const neighbor = this.qe.persons.find(p => p.id === conn.id);
          if (neighbor) {
            if (!nodes.has(neighbor.id)) {
              nodes.set(neighbor.id, {
                id: neighbor.id,
                name: neighbor.name,
                label: neighbor.name,
                group: neighbor.gangAffiliation || 'Unknown'
              });
            }
            
            const edgeKey = [currentPerson.id, neighbor.id].sort().join('-');
            if (!edges.has(edgeKey)) {
              edges.add(edgeKey);
              edges.add(JSON.stringify({
                from: currentPerson.id,
                to: neighbor.id,
                label: conn.firId,
                title: `Shared FIR: ${conn.firId}`
              }));
            }
            
            explore(neighbor, currentDepth + 1);
          }
        });
      }
    };
    
    explore(person, 0);
    
    return {
      nodes: Array.from(nodes.values()),
      edges: Array.from(edges).map(e => {
        try { return JSON.parse(e); } catch { return null; }
      }).filter(e => e !== null)
    };
  }
}

module.exports = BFSTraversal;