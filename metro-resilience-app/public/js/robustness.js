window.runNetworkAnalysis = async function runNetworkAnalysis() {
  const res = await fetch('/api/network/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ network: window.metroState.network })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Network analysis failed');
  window.metroState.analysis = await res.json();
  return window.metroState.analysis;
};

window.runRobustness = async function runRobustness() {
  const critical = window.metroState.network.nodes.filter((n) => n.critical || n.type === 'critical').map((n) => n.id);
  const res = await fetch('/api/robustness/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      network: window.metroState.network,
      monteCarloRuns: 150,
      userCritical: critical
    })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Robustness failed');
  window.metroState.robustness = await res.json();
  renderRobustnessTable(window.metroState.robustness.summary);
  window.renderRobustnessChart(window.metroState.robustness.curves);
  return window.metroState.robustness;
};

window.renderRobustnessTable = function renderRobustnessTable(summary) {
  const table = document.getElementById('robustnessTable');
  table.innerHTML = '<tr><th>Method</th><th>f90%</th><th>fc</th></tr>' + summary
    .map((row) => `<tr><td>${row[0]}</td><td>${row[1].toFixed(2)}</td><td>${row[2].toFixed(2)}</td></tr>`)
    .join('');
};
