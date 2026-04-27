window.metroState = {
  network: { nodes: [], edges: [] },
  analysis: {},
  robustness: null,
  resilience: null,
  recommendation: null,
  scenario: null
};

window.loadDemoNetwork = async function loadDemoNetwork() {
  const res = await fetch('/api/demo-network');
  const demo = await res.json();
  window.metroState.network = { nodes: demo.nodes || [], edges: demo.edges || [] };
  renderNetworkSummary();
};

window.addNode = function addNode(node) {
  const exists = window.metroState.network.nodes.some((n) => n.id === node.id);
  if (exists) return alert('Node id already exists.');
  window.metroState.network.nodes.push(node);
  renderNetworkSummary();
};

window.addEdge = function addEdge(edge) {
  window.metroState.network.edges.push(edge);
  renderNetworkSummary();
};

window.renderNetworkSummary = function renderNetworkSummary() {
  const { nodes, edges } = window.metroState.network;
  const transferCount = nodes.filter((n) => n.type === 'transfer').length;
  document.getElementById('networkSummary').textContent = JSON.stringify({
    nodes: nodes.length,
    edges: edges.length,
    transferStations: transferCount,
    previewNodes: nodes.slice(0, 5)
  }, null, 2);
};

window.loadNetworkFile = function loadNetworkFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    if (file.name.endsWith('.json')) {
      const parsed = JSON.parse(reader.result);
      window.metroState.network = {
        nodes: parsed.nodes || [],
        edges: parsed.edges || []
      };
      renderNetworkSummary();
      return;
    }

    const lines = reader.result.split(/\r?\n/).filter(Boolean);
    const [header, ...rows] = lines;
    const cols = header.split(',').map((c) => c.trim());
    if (cols.includes('source') && cols.includes('target')) {
      window.metroState.network.edges = rows.map((line) => {
        const values = line.split(',');
        const row = {};
        cols.forEach((c, i) => { row[c] = values[i]; });
        return { source: row.source, target: row.target, line: row.line || 'Unknown' };
      });
    } else if (cols.includes('id')) {
      window.metroState.network.nodes = rows.map((line) => {
        const values = line.split(',');
        const row = {};
        cols.forEach((c, i) => { row[c] = values[i]; });
        return { id: row.id, name: row.name || row.id, type: row.type || 'normal', line: row.line || 'Unknown' };
      });
    }
    renderNetworkSummary();
  };
  reader.readAsText(file);
};
