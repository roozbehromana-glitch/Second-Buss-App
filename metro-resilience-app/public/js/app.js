function showSection(id) {
  document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.section === id));
}

document.querySelectorAll('.sidebar .nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => showSection(btn.dataset.section));
});

function buildScenarioForm() {
  const fields = [
    ['disruptedStations', 'text'], ['disruptedLinks', 'text'], ['disruptionStartTime', 'time'],
    ['disruptionDuration', 'number'], ['recoveryDuration', 'number'], ['failureType', 'select', ['partial', 'total']],
    ['affectedLine', 'text'], ['demandLevel', 'select', ['low', 'medium', 'high']], ['customDemand', 'number'],
    ['scheduledHeadway', 'number'], ['disruptedHeadway', 'number'], ['availableBusFleet', 'number'],
    ['busCapacity', 'number'], ['busRoundTripTime', 'number'], ['busDeploymentDelay', 'number'],
    ['walkingDistanceThreshold', 'number'], ['nominalStations', 'number'], ['unavailableStations', 'number'],
    ['altPathFactor', 'number'], ['affectedStationsCount', 'number'], ['timeSteps', 'number']
  ];
  const wrapper = document.getElementById('scenarioForm');
  wrapper.innerHTML = fields.map(([key, type, options]) => {
    if (type === 'select') {
      return `<label>${key}<select data-scenario="${key}">${options.map((o) => `<option>${o}</option>`).join('')}</select></label>`;
    }
    return `<label>${key}<input type="${type}" data-scenario="${key}" /></label>`;
  }).join('');

  Object.entries(window.defaultScenarioValues).forEach(([k, v]) => {
    const input = wrapper.querySelector(`[data-scenario="${k}"]`);
    if (input) input.value = v;
  });
}

function readScenario() {
  const data = {};
  document.querySelectorAll('[data-scenario]').forEach((input) => {
    data[input.dataset.scenario] = input.type === 'number' ? Number(input.value) : input.value;
  });
  data.transferAffected = String(data.disruptedStations || '').split(',').length > 1;
  return data;
}

function downloadFile(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

async function runEndToEnd() {
  try {
    window.metroState.scenario = readScenario();
    await window.runNetworkAnalysis();
    await window.runRobustness();
    await window.runResilience();
    await window.runBridgingRecommendation();
    alert('Analysis complete. Review Robustness, Resilience, and Bridging sections.');
  } catch (error) {
    alert(error.message);
  }
}

async function generateVisual() {
  const msg = document.getElementById('aiMessage');
  msg.textContent = 'Loading visual...';
  try {
    const res = await fetch('/api/gemini/generate-visual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: window.metroState.scenario, recommendation: window.metroState.recommendation })
    });
    const data = await res.json();
    msg.textContent = data.message;
    const img = document.getElementById('aiImage');
    if (data.imageBase64) {
      img.src = `data:${data.mimeType};base64,${data.imageBase64}`;
      img.style.display = 'block';
    } else {
      img.style.display = 'none';
    }
  } catch (error) {
    msg.textContent = error.message;
  }
}

document.getElementById('btnLoadDemo').addEventListener('click', window.loadDemoNetwork);
document.getElementById('btnCreateNetwork').addEventListener('click', () => showSection('network'));
document.getElementById('btnDefineDisruption').addEventListener('click', () => showSection('disruption'));
document.getElementById('btnRunAnalysis').addEventListener('click', runEndToEnd);
document.getElementById('btnViewRecommendation').addEventListener('click', () => showSection('bridging'));

document.getElementById('addNodeBtn').addEventListener('click', () => {
  window.addNode({
    id: document.getElementById('nodeId').value,
    name: document.getElementById('nodeName').value,
    type: document.getElementById('nodeType').value,
    line: document.getElementById('nodeLine').value,
    critical: document.getElementById('nodeType').value === 'critical'
  });
});

document.getElementById('addEdgeBtn').addEventListener('click', () => {
  window.addEdge({
    source: document.getElementById('edgeSource').value,
    target: document.getElementById('edgeTarget').value,
    line: document.getElementById('edgeLine').value
  });
});

document.getElementById('networkFile').addEventListener('change', (e) => {
  const [file] = e.target.files;
  if (file) window.loadNetworkFile(file);
});

document.getElementById('generateVisualBtn').addEventListener('click', generateVisual);

document.getElementById('exportRobustnessCsv').addEventListener('click', () => {
  const rows = [['method', 'f90', 'fc'], ...(window.metroState.robustness?.summary || [])];
  downloadFile('robustness_metrics.csv', rows.map((r) => r.join(',')).join('\n'), 'text/csv');
});

document.getElementById('exportResilienceCsv').addEventListener('click', () => {
  const inds = window.metroState.resilience?.indicators || {};
  const rows = [['indicator', 'value'], ...Object.entries(inds)];
  downloadFile('resilience_metrics.csv', rows.map((r) => r.join(',')).join('\n'), 'text/csv');
});

document.getElementById('exportScenarioJson').addEventListener('click', () => {
  downloadFile('scenario_comparison.json', JSON.stringify({ scenario: window.metroState.scenario, recommendation: window.metroState.recommendation }, null, 2), 'application/json');
});

document.getElementById('exportChartsPng').addEventListener('click', () => {
  const r = window.charts.robustness?.toBase64Image();
  const q = window.charts.resilience?.toBase64Image();
  if (r) downloadFile('robustness_chart.png', atob(r.split(',')[1]), 'image/png');
  if (q) downloadFile('resilience_chart.png', atob(q.split(',')[1]), 'image/png');
});

document.getElementById('exportReportHtml').addEventListener('click', () => {
  const html = `
    <h1>Metro Robustness and Resilience Report</h1>
    <h2>Scenario</h2><pre>${JSON.stringify(window.metroState.scenario, null, 2)}</pre>
    <h2>Robustness Summary</h2><pre>${JSON.stringify(window.metroState.robustness?.summary || [], null, 2)}</pre>
    <h2>Resilience Indicators</h2><pre>${JSON.stringify(window.metroState.resilience?.indicators || {}, null, 2)}</pre>
    <h2>Recommendation</h2><pre>${JSON.stringify(window.metroState.recommendation || {}, null, 2)}</pre>
  `;
  downloadFile('summary_report.html', html, 'text/html');
});

buildScenarioForm();
window.loadDemoNetwork();
