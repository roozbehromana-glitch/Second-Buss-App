window.defaultScenarioValues = {
  disruptedStations: 'N5,N6',
  disruptedLinks: 'N5-N6',
  disruptionStartTime: '08:00',
  disruptionDuration: 60,
  recoveryDuration: 90,
  failureType: 'total',
  affectedLine: 'M1',
  demandLevel: 'high',
  customDemand: 8000,
  scheduledHeadway: 4,
  disruptedHeadway: 10,
  availableBusFleet: 40,
  busCapacity: 90,
  busRoundTripTime: 42,
  busDeploymentDelay: 12,
  walkingDistanceThreshold: 500,
  nominalStations: 13,
  unavailableStations: 2,
  altPathFactor: 0.45,
  transferAffected: true,
  affectedStationsCount: 4,
  timeSteps: 40
};

window.runResilience = async function runResilience() {
  const scenario = window.metroState.scenario;
  const res = await fetch('/api/resilience/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenario,
      weights: { w1: 0.35, w2: 0.35, w3: 0.3 }
    })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Resilience run failed');
  window.metroState.resilience = await res.json();

  renderResilienceTable(window.metroState.resilience.indicators);
  window.renderResilienceChart(window.metroState.resilience);
  return window.metroState.resilience;
};

window.renderResilienceTable = function renderResilienceTable(indicators) {
  const table = document.getElementById('resilienceTable');
  table.innerHTML = `
    <tr><th>Indicator</th><th>Value</th></tr>
    ${Object.entries(indicators).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
  `;
};
