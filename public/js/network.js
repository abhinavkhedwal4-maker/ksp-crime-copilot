class NetworkGraph {
  constructor() {
    this.network = null;
    this.nodes = null;
    this.edges = null;
    this.container = document.getElementById('network');
    
    this.init();
  }

  showLoader(msg = 'LOADING NETWORK...') {
    const el = document.getElementById('graphLoader');
    const txt = document.getElementById('loaderText');
    if (el)  el.classList.remove('hidden');
    if (txt) txt.textContent = msg;
  }

  hideLoader() {
    const el = document.getElementById('graphLoader');
    if (el) {
      setTimeout(() => el.classList.add('hidden'), 400);
    }
  }

  init() {
    this.setupSearch();
    // Show initial empty state message in loader
    const txt = document.getElementById('loaderText');
    if (txt) txt.textContent = 'ENTER A NAME TO SEARCH THE NETWORK';
    // Hide loader after brief pause — network is ready for input
    setTimeout(() => this.hideLoader(), 1200);
  }

  drawNetwork(nodes, edges) {
    this.showLoader('RENDERING GRAPH...');

    const options = {
      nodes: {
        shape: 'dot',
        size: 22,
        font: { color: '#e0e6ff', size: 13, face: 'JetBrains Mono, monospace' },
        borderWidth: 2,
        shadow: { enabled: true, color: 'rgba(0,212,255,0.4)', size: 10, x: 0, y: 0 }
      },
      edges: {
        width: 1.5,
        color: { color: 'rgba(0,212,255,0.25)', highlight: '#00d4ff', hover: 'rgba(0,212,255,0.6)' },
        smooth: { type: 'continuous' },
        shadow: false
      },
      physics: {
        stabilization: { iterations: 120 },
        barnesHut: {
          gravitationalConstant: -8000,
          springConstant: 0.04,
          springLength: 200
        }
      },
      interaction: {
        navigationButtons: false,
        keyboard: true,
        hover: true,
        tooltipDelay: 200
      },
      background: { color: 'transparent' }
    };

    this.nodes = new vis.DataSet(nodes);
    this.edges = new vis.DataSet(edges);
    const data = { nodes: this.nodes, edges: this.edges };

    if (this.network) {
      this.network.setData(data);
      this.network.setOptions(options);
    } else {
      this.network = new vis.Network(this.container, data, options);
    }

    // Update sidebar stats
    if (window.updateNetworkStats) {
      window.updateNetworkStats(nodes.length, edges.length);
    }

    // Hide loader once physics stabilises
    this.network.once('stabilized', () => this.hideLoader());

    // Click event for node details
    this.network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = this.nodes.get(nodeId);
        this.showNodeInfo(node);
        // Pulse the selected node
        this.nodes.update({ id: nodeId, borderWidth: 4, borderWidthSelected: 4 });
        setTimeout(() => this.nodes.update({ id: nodeId, borderWidth: 2 }), 600);
      }
    });
  }

  showStatus(msg, isError = false) {
    document.getElementById('nodeInfo').innerHTML = `
      <div class="node-info-card" style="border-color:${isError?'rgba(255,23,68,0.3)':'rgba(0,212,255,0.2)'};">
        <p style="color:${isError?'var(--accent-red)':'var(--accent-ai)'};font-family:'JetBrains Mono',monospace;font-size:0.75rem;">${msg}</p>
      </div>`;
  }

  async searchPerson(name) {
    this.showLoader('SEARCHING RECORDS...');
    try {
      const response = await fetch(`/api/network-traversal?person=${encodeURIComponent(name)}&depth=2&mode=graph`);
      const data = await response.json();
      if (data.nodes && data.nodes.length > 0) {
        this.drawNetwork(data.nodes, data.edges);
        this.showNodeInfo(data.nodes[0]);
      } else {
        this.hideLoader();
        this.showStatus('⚠ Person not found in records', true);
      }
    } catch (error) {
      console.error('Network search error:', error);
      this.hideLoader();
      this.showStatus('⚠ Error loading network data', true);
    }
  }

  async findPath(person1, person2) {
    this.showLoader('COMPUTING SHORTEST PATH...');
    try {
      const response = await fetch(`/api/network-traversal?person=${encodeURIComponent(person1)}&person2=${encodeURIComponent(person2)}&mode=path`);
      const data = await response.json();
      if (data.path && data.path.length > 0) {
        const pathNodes = data.path.map(p => p.id);
        const pathEdges = [];
        for (let i = 0; i < pathNodes.length - 1; i++) {
          pathEdges.push({ from: pathNodes[i], to: pathNodes[i + 1] });
        }
        this.drawNetwork(data.path, pathEdges);
        document.getElementById('nodeInfo').innerHTML = `
          <div class="node-info-card">
            <p style="color:var(--accent-ai);font-family:'JetBrains Mono',monospace;font-size:0.72rem;margin-bottom:0.4rem;">🔗 CONNECTION PATH FOUND</p>
            <p>Degrees of separation: <strong style="color:var(--accent-ai);">${data.distance}</strong></p>
            <p style="margin-top:0.35rem;line-height:1.6;">${data.path.map(p => p.name).join(' → ')}</p>
          </div>`;
      } else {
        this.hideLoader();
        this.showStatus(data.error || '⚠ No connection found between these persons', true);
      }
    } catch (error) {
      console.error('Path finding error:', error);
      this.hideLoader();
      this.showStatus('⚠ Error finding path', true);
    }
  }

  showNodeInfo(node) {
    document.getElementById('nodeInfo').innerHTML = `
      <div class="node-info-card">
        <h4>👤 ${node.name || node.label}</h4>
        <p><strong>ID:</strong> ${node.id}</p>
        <p><strong>Group:</strong> ${node.group || 'Unknown'}</p>
        ${node.firCount ? `<p><strong>FIRs:</strong> <span style="color:var(--accent-ai);">${node.firCount}</span></p>` : ''}
      </div>`;
  }

  setupSearch() {
    const searchBox = document.getElementById('personSearch');
    const searchBtn = document.getElementById('searchBtn');
    const pathSearch1 = document.getElementById('pathPerson1');
    const pathSearch2 = document.getElementById('pathPerson2');
    const pathBtn = document.getElementById('findPathBtn');

    searchBtn.addEventListener('click', () => {
      const name = searchBox.value.trim();
      if (name) this.searchPerson(name);
    });

    searchBox.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const name = searchBox.value.trim();
        if (name) this.searchPerson(name);
      }
    });

    pathBtn.addEventListener('click', () => {
      const person1 = pathSearch1.value.trim();
      const person2 = pathSearch2.value.trim();
      if (person1 && person2) this.findPath(person1, person2);
    });
  }
}

// Initialize network graph
if (window.location.pathname.includes('network.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    new NetworkGraph();
  });
}